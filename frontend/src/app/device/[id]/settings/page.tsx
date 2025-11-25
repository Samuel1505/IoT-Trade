'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Save, Send, Loader2, CheckCircle2, Info, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { DeviceType, DeviceStatus } from '@/lib/enums';
import { formatDateTime } from '@/lib/formatters';
import { publishGPSData, publishWeatherData, publishAirQualityData } from '@/services/deviceService';
import { validateGPSData, validateWeatherData, validateAirQualityData, validateWalletConnection, formatValidationErrors } from '@/lib/validation';
import { parseError, getUserFriendlyMessage, isRecoverableError } from '@/lib/errors';
import type { Address } from 'viem';
import type { UserDevice } from '@/lib/types';
import { createWalletClient, custom } from 'viem';
import { somniaTestnet } from '@/config/wagmi';

export default function DeviceSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { address } = useAccount();
  const { userDevices, updateUserDevice, deleteUserDevice, refreshUserDevices } = useApp();
  const [device, setDevice] = useState<UserDevice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    price: ''
  });
  const [isPublishing, setIsPublishing] = useState(false);

  // Load device on mount
  useEffect(() => {
    const loadDevice = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // First try to find in userDevices from context
        let foundDevice = userDevices.find(d => d.id === id);
        
        // If not found, try loading directly from registry
        if (!foundDevice && address) {
          const { fetchDevicesByOwner } = await import('@/services/registryService');
          const { calculateDeviceMetrics } = await import('@/services/deviceService');
          const registryDevices = await fetchDevicesByOwner(address);
          
          // Find device by matching ID
          const registryDevice = registryDevices.find(d => {
            const deviceId = `device-${d.address.slice(2, 10)}`;
            return deviceId === id;
          });
          
          if (registryDevice) {
            const metrics = await calculateDeviceMetrics(
              registryDevice.owner,
              registryDevice.address as Address,
              registryDevice.deviceType as DeviceType,
              registryDevice.registeredAt
            );
            
            foundDevice = {
              id: `device-${registryDevice.address.slice(2, 10)}`,
              name: registryDevice.name,
              type: registryDevice.deviceType as DeviceType,
              status: metrics.isActive ? DeviceStatus.ONLINE : DeviceStatus.OFFLINE,
              qualityScore: 0,
              location: registryDevice.location,
              totalDataPoints: 0,
              totalEarnings: 0,
              totalEarningsUsd: 0,
              activeSubscribers: 0,
              deviceAddress: registryDevice.address,
              ownerAddress: registryDevice.owner,
              pricePerDataPoint: registryDevice.pricePerDataPoint,
              updateFrequency: metrics.updateFrequency,
              uptime: metrics.uptime,
              lastPublished: metrics.lastPublished || new Date(registryDevice.registeredAt),
            };
          }
        }
        
        if (foundDevice) {
          setDevice(foundDevice);
          setFormData({
            name: foundDevice.name,
            location: foundDevice.location,
            price: foundDevice.pricePerDataPoint.toString()
          });
          setIsPublishing(foundDevice.status === DeviceStatus.ONLINE);
        } else {
          setError('Device not found');
        }
      } catch (err) {
        console.error('Error loading device:', err);
        setError('Failed to load device');
      } finally {
        setIsLoading(false);
      }
    };

    loadDevice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, address]);
  
  // Data publishing state
  const [publishDataTab, setPublishDataTab] = useState<'manual' | 'auto'>('manual');
  const [isPublishingData, setIsPublishingData] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [showSensorHelp, setShowSensorHelp] = useState(false);
  
  // GPS Data form
  const [gpsData, setGpsData] = useState({
    latitude: '37.7749',
    longitude: '-122.4194',
    altitude: '0',
    accuracy: '10',
    speed: '0',
    heading: '0'
  });
  
  // Weather Data form
  const [weatherData, setWeatherData] = useState({
    temperature: '72.5',
    humidity: '65.0',
    pressure: '1013.25',
    windSpeed: '5.0',
    windDirection: '180',
    rainfall: '0.0'
  });
  
  // Air Quality Data form
  const [airQualityData, setAirQualityData] = useState({
    pm25: '15',
    pm10: '25',
    co2: '400',
    no2: '20',
    o3: '50',
    aqi: '45'
  });

  const CHAIN_ID_HEX = '0xc488';

  const getWalletClient = async () => {
    if (!address) {
      throw new Error('Wallet not connected');
    }
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('Wallet not available');
    }
    const provider = (window as any).ethereum;
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CHAIN_ID_HEX }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: CHAIN_ID_HEX,
            chainName: 'Somnia Testnet',
            rpcUrls: ['https://dream-rpc.somnia.network'],
            nativeCurrency: {
              name: 'Somnia Testnet Token',
              symbol: 'STT',
              decimals: 18,
            },
            blockExplorerUrls: ['https://shannon-explorer.somnia.network'],
          }],
        });
      } else {
        throw switchError;
      }
    }

    return createWalletClient({
      account: address as Address,
      chain: somniaTestnet,
      transport: custom(provider),
    });
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-24 pb-12 px-6">
          <div className="max-w-4xl mx-auto text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-blue" />
            <p className="body-lg text-gray-600">Loading device settings...</p>
          </div>
        </main>
      </>
    );
  }

  if (error || !device) {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-24 pb-12 px-6">
          <div className="max-w-4xl mx-auto text-center py-12">
            <p className="body-lg text-gray-600 mb-4">{error || 'Device not found'}</p>
            <Button onClick={() => router.push('/dashboard')} variant="outline">
              Back to Dashboard
            </Button>
          </div>
        </main>
      </>
    );
  }

  const handleSave = () => {
    updateUserDevice(device.id, {
      name: formData.name,
      location: formData.location,
      pricePerDataPoint: parseFloat(formData.price)
    });
    alert('Settings saved successfully!');
  };

  const handleTogglePublishing = (checked: boolean) => {
    setIsPublishing(checked);
    updateUserDevice(device.id, {
      status: checked ? 'ONLINE' : 'OFFLINE'
    });
  };

  const handleDeactivate = () => {
    if (confirm('Are you sure you want to deactivate this device? This will stop all active subscriptions and cannot be undone.')) {
      deleteUserDevice(device.id);
      router.push('/dashboard');
    }
  };

  // Handle data publishing
  const handlePublishGPS = async () => {
    // Validate wallet connection
    const walletValidation = validateWalletConnection(address);
    if (!walletValidation.isValid) {
      setPublishError(formatValidationErrors(walletValidation.errors));
      return;
    }

    if (!device) {
      setPublishError('Device not available');
      return;
    }

    // Validate GPS data
    const validation = validateGPSData(gpsData);
    if (!validation.isValid) {
      setPublishError(formatValidationErrors(validation.errors));
      return;
    }

    setIsPublishingData(true);
    setPublishError(null);
    setPublishSuccess(null);

    try {
      const walletClient = await getWalletClient();
      const txHash = await publishGPSData(
        walletClient,
        device.deviceAddress as Address,
        {
          timestamp: BigInt(Date.now()),
          latitude: parseFloat(gpsData.latitude),
          longitude: parseFloat(gpsData.longitude),
          altitude: parseFloat(gpsData.altitude) || 0,
          accuracy: parseInt(gpsData.accuracy) || 0,
          speed: parseInt(gpsData.speed) || 0,
          heading: parseInt(gpsData.heading) || 0,
        }
      );

      const explorerUrl = `https://shannon-explorer.somnia.network/tx/${txHash}`;
      setPublishSuccess(`Data published successfully! Transaction: ${txHash.slice(0, 10)}...`);
      
      // Update device stats
      updateUserDevice(device.id, {
        totalDataPoints: device.totalDataPoints + 1,
        lastPublished: new Date()
      });

      // Clear form after successful publish
      setTimeout(() => {
        setPublishSuccess(null);
      }, 5000);
    } catch (err: any) {
      console.error('Error publishing GPS data:', err);
      const appError = parseError(err);
      const errorMessage = appError.details || appError.message || 'Failed to publish data';
      setPublishError(`${getUserFriendlyMessage(appError)}: ${errorMessage}`);
    } finally {
      setIsPublishingData(false);
    }
  };

  const handlePublishWeather = async () => {
    // Validate wallet connection
    const walletValidation = validateWalletConnection(address);
    if (!walletValidation.isValid) {
      setPublishError(formatValidationErrors(walletValidation.errors));
      return;
    }

    if (!device) {
      setPublishError('Device not available');
      return;
    }

    // Validate weather data
    const validation = validateWeatherData(weatherData);
    if (!validation.isValid) {
      setPublishError(formatValidationErrors(validation.errors));
      return;
    }

    setIsPublishingData(true);
    setPublishError(null);
    setPublishSuccess(null);

    try {
      const walletClient = await getWalletClient();
      const txHash = await publishWeatherData(
        walletClient,
        device.deviceAddress as Address,
        {
          timestamp: BigInt(Date.now()),
          temperature: parseFloat(weatherData.temperature),
          humidity: parseFloat(weatherData.humidity),
          pressure: parseFloat(weatherData.pressure),
          windSpeed: parseFloat(weatherData.windSpeed),
          windDirection: parseInt(weatherData.windDirection),
          rainfall: parseFloat(weatherData.rainfall),
        }
      );

      setPublishSuccess(`Data published successfully! Transaction: ${txHash.slice(0, 10)}...`);
      
      // Update device stats
      updateUserDevice(device.id, {
        totalDataPoints: device.totalDataPoints + 1,
        lastPublished: new Date()
      });

      // Clear form after successful publish
      setTimeout(() => {
        setPublishSuccess(null);
      }, 5000);
    } catch (err: any) {
      console.error('Error publishing weather data:', err);
      const appError = parseError(err);
      const errorMessage = appError.details || appError.message || 'Failed to publish data';
      setPublishError(`${getUserFriendlyMessage(appError)}: ${errorMessage}`);
    } finally {
      setIsPublishingData(false);
    }
  };

  const handlePublishAirQuality = async () => {
    // Validate wallet connection
    const walletValidation = validateWalletConnection(address);
    if (!walletValidation.isValid) {
      setPublishError(formatValidationErrors(walletValidation.errors));
      return;
    }

    if (!device) {
      setPublishError('Device not available');
      return;
    }

    // Validate air quality data
    const validation = validateAirQualityData(airQualityData);
    if (!validation.isValid) {
      setPublishError(formatValidationErrors(validation.errors));
      return;
    }

    setIsPublishingData(true);
    setPublishError(null);
    setPublishSuccess(null);

    try {
      const walletClient = await getWalletClient();
      const txHash = await publishAirQualityData(
        walletClient,
        device.deviceAddress as Address,
        {
          timestamp: BigInt(Date.now()),
          pm25: parseInt(airQualityData.pm25),
          pm10: parseInt(airQualityData.pm10),
          co2: parseInt(airQualityData.co2),
          no2: parseInt(airQualityData.no2),
          o3: parseInt(airQualityData.o3),
          aqi: parseInt(airQualityData.aqi),
        }
      );

      setPublishSuccess(`Data published successfully! Transaction: ${txHash.slice(0, 10)}...`);
      
      // Update device stats
      updateUserDevice(device.id, {
        totalDataPoints: device.totalDataPoints + 1,
        lastPublished: new Date()
      });

      // Clear form after successful publish
      setTimeout(() => {
        setPublishSuccess(null);
      }, 5000);
    } catch (err: any) {
      console.error('Error publishing air quality data:', err);
      const appError = parseError(err);
      const errorMessage = appError.details || appError.message || 'Failed to publish data';
      setPublishError(`${getUserFriendlyMessage(appError)}: ${errorMessage}`);
    } finally {
      setIsPublishingData(false);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="heading-xl mb-2">Device Settings</h1>
            <p className="body-lg text-gray-600">{device.name}</p>
          </div>

          <div className="space-y-6">
            {/* Device Information */}
            <Card>
              <CardHeader>
                <CardTitle>Device Information</CardTitle>
                <CardDescription>Update your device details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="body-base font-medium">Device Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="My GPS Tracker"
                  />
                </div>

                <div className="space-y-2">
                  <label className="body-base font-medium">Location</label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="San Jose, CA"
                  />
                </div>

                <div className="space-y-2">
                  <label className="body-base font-medium">Device Type</label>
                  <Select value={device.type} disabled>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DeviceType.GPS_TRACKER}>GPS Tracker</SelectItem>
                      <SelectItem value={DeviceType.WEATHER_STATION}>Weather Station</SelectItem>
                      <SelectItem value={DeviceType.AIR_QUALITY_MONITOR}>Air Quality Monitor</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="body-sm text-gray-600">Device type cannot be changed after registration</p>
                </div>

                <Button onClick={handleSave} className="gradient-primary">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
                <CardDescription>Set your data pricing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="body-base font-medium">Price per Data Point (ETH)</label>
                  <Input
                    type="number"
                    step="0.00001"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00001"
                  />
                  <p className="body-sm text-gray-600">
                    Current price: {device.pricePerDataPoint} ETH per data point
                  </p>
                </div>

                <Button onClick={handleSave} className="gradient-primary">
                  <Save className="w-4 h-4 mr-2" />
                  Update Price
                </Button>
              </CardContent>
            </Card>

            {/* Manual Publishing - For Everyone */}
            <Card>
              <CardHeader>
                <CardTitle>Publish Sensor Data</CardTitle>
                <CardDescription>Enter your sensor readings manually - no coding required!</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-green-50 border-success-green">
                  <Info className="h-4 w-4 text-success-green" />
                  <AlertDescription className="text-gray-700">
                    <strong>Perfect for Beginners:</strong> Simply enter your sensor data below and click "Publish" - that's it! 
                    This is a completely valid way to use IoT-Trade. No technical knowledge needed.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="body-sm text-gray-600 mb-1">Publishing Frequency</p>
                    <p className="body-base font-semibold">{device.updateFrequency}</p>
                  </div>
                  <div>
                    <p className="body-sm text-gray-600 mb-1">Last Published</p>
                    <p className="body-base font-semibold">{formatDateTime(device.lastPublished)}</p>
                  </div>
                </div>

                <Separator />

                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-primary-blue" />
                  <AlertDescription className="text-gray-700 text-sm">
                    💡 <strong>Want to automate?</strong> For developers who want automatic publishing from their devices, 
                    check out the <a href="#device-integration" className="text-primary-blue underline font-medium">Device Integration</a> section below.
                  </AlertDescription>
                </Alert>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="body-sm text-gray-600 mb-1">Publishing Frequency</p>
                    <p className="body-base font-semibold">{device.updateFrequency}</p>
                  </div>
                  <div>
                    <p className="body-sm text-gray-600 mb-1">Last Published</p>
                    <p className="body-base font-semibold">{formatDateTime(device.lastPublished)}</p>
                  </div>
                </div>

                {!address && (
                  <Alert className="bg-yellow-50 border-warning-yellow">
                    <Info className="h-4 w-4 text-warning-yellow" />
                    <AlertDescription className="text-gray-700">
                      Connect your wallet to publish data
                    </AlertDescription>
                  </Alert>
                )}

                {publishSuccess && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-success-green" />
                    <AlertDescription className="text-green-700">
                      <div className="space-y-1">
                        <p>{publishSuccess}</p>
                        {publishSuccess.includes('Transaction:') && (
                          <p className="text-xs text-gray-600 mt-1">
                            View on{' '}
                            <a
                              href={`https://shannon-explorer.somnia.network/tx/${publishSuccess.split('Transaction:')[1]?.trim()?.split('...')[0]}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline hover:text-primary-blue"
                            >
                              Somnia Explorer
                            </a>
                          </p>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {publishError && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-700">
                      <div className="space-y-1">
                        <p className="font-medium">{publishError.split(':')[0]}</p>
                        {publishError.includes(':') && (
                          <p className="text-sm mt-1">{publishError.split(':').slice(1).join(':').trim()}</p>
                        )}
                        {isRecoverableError(parseError({ message: publishError })) && (
                          <p className="text-xs text-gray-600 mt-2">
                            You can try again. If the problem persists, check your network connection.
                          </p>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {device.type === DeviceType.GPS_TRACKER && (
                  <div className="space-y-4">
                    {/* Help Guide */}
                    <div className="border border-blue-200 rounded-lg bg-blue-50 p-4">
                      <button
                        type="button"
                        onClick={() => setShowSensorHelp(!showSensorHelp)}
                        className="flex items-center justify-between w-full text-left"
                      >
                        <div className="flex items-center gap-2">
                          <HelpCircle className="w-5 h-5 text-primary-blue" />
                          <span className="body-sm font-semibold text-primary-blue">
                            Where do I get GPS readings?
                          </span>
                        </div>
                        {showSensorHelp ? (
                          <ChevronUp className="w-5 h-5 text-primary-blue" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-primary-blue" />
                        )}
                      </button>
                      
                      {showSensorHelp && (
                        <div className="mt-4 space-y-3 text-sm text-gray-700">
                          <p className="font-semibold">📍 GPS Tracker - Where to find readings:</p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li><strong>Smartphone:</strong> Open Google Maps, tap your location dot, see coordinates at the bottom</li>
                            <li><strong>GPS Device:</strong> Check the device display or companion app</li>
                            <li><strong>Fitness Tracker:</strong> Check workout details in the app (e.g., Garmin, Fitbit)</li>
                            <li><strong>Car GPS:</strong> Look at navigation screen - coordinates usually shown in settings</li>
                          </ul>
                          <p className="text-xs text-gray-600 mt-2">
                            💡 <strong>Quick test:</strong> Use Google Maps on your phone - tap your location to see coordinates!
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="body-sm font-medium">Latitude</label>
                        <Input
                          type="number"
                          step="0.000001"
                          value={gpsData.latitude}
                          onChange={(e) => setGpsData({ ...gpsData, latitude: e.target.value })}
                          placeholder="37.7749"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="body-sm font-medium">Longitude</label>
                        <Input
                          type="number"
                          step="0.000001"
                          value={gpsData.longitude}
                          onChange={(e) => setGpsData({ ...gpsData, longitude: e.target.value })}
                          placeholder="-122.4194"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="body-sm font-medium">Altitude (m)</label>
                        <Input
                          type="number"
                          value={gpsData.altitude}
                          onChange={(e) => setGpsData({ ...gpsData, altitude: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="body-sm font-medium">Accuracy (m)</label>
                        <Input
                          type="number"
                          value={gpsData.accuracy}
                          onChange={(e) => setGpsData({ ...gpsData, accuracy: e.target.value })}
                          placeholder="10"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="body-sm font-medium">Speed (km/h)</label>
                        <Input
                          type="number"
                          value={gpsData.speed}
                          onChange={(e) => setGpsData({ ...gpsData, speed: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="body-sm font-medium">Heading (degrees)</label>
                        <Input
                          type="number"
                          value={gpsData.heading}
                          onChange={(e) => setGpsData({ ...gpsData, heading: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handlePublishGPS}
                      disabled={!address || isPublishingData}
                      className="w-full gradient-primary"
                    >
                      {isPublishingData ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Publish GPS Data
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {device.type === DeviceType.WEATHER_STATION && (
                  <div className="space-y-4">
                    {/* Help Guide */}
                    <div className="border border-blue-200 rounded-lg bg-blue-50 p-4">
                      <button
                        type="button"
                        onClick={() => setShowSensorHelp(!showSensorHelp)}
                        className="flex items-center justify-between w-full text-left"
                      >
                        <div className="flex items-center gap-2">
                          <HelpCircle className="w-5 h-5 text-primary-blue" />
                          <span className="body-sm font-semibold text-primary-blue">
                            Where do I get weather readings?
                          </span>
                        </div>
                        {showSensorHelp ? (
                          <ChevronUp className="w-5 h-5 text-primary-blue" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-primary-blue" />
                        )}
                      </button>
                      
                      {showSensorHelp && (
                        <div className="mt-4 space-y-3 text-sm text-gray-700">
                          <p className="font-semibold">🌤️ Weather Station - Where to find readings:</p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li><strong>Weather App:</strong> Check your phone's weather app (Apple Weather, Weather.com)</li>
                            <li><strong>Home Weather Station:</strong> Check the device display or companion app</li>
                            <li><strong>Smart Home:</strong> Check Alexa/Google Home weather, or smart thermostat</li>
                            <li><strong>Online:</strong> Weather.com or your local weather service</li>
                          </ul>
                          <p className="text-xs text-gray-600 mt-2">
                            💡 <strong>Quick test:</strong> Check your phone's weather app - it shows temperature, humidity, and pressure!
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="body-sm font-medium">Temperature (°F)</label>
                        <Input
                          type="number"
                          step="0.1"
                          value={weatherData.temperature}
                          onChange={(e) => setWeatherData({ ...weatherData, temperature: e.target.value })}
                          placeholder="72.5"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="body-sm font-medium">Humidity (%)</label>
                        <Input
                          type="number"
                          step="0.1"
                          value={weatherData.humidity}
                          onChange={(e) => setWeatherData({ ...weatherData, humidity: e.target.value })}
                          placeholder="65.0"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="body-sm font-medium">Pressure (hPa)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={weatherData.pressure}
                          onChange={(e) => setWeatherData({ ...weatherData, pressure: e.target.value })}
                          placeholder="1013.25"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="body-sm font-medium">Wind Speed (mph)</label>
                        <Input
                          type="number"
                          step="0.1"
                          value={weatherData.windSpeed}
                          onChange={(e) => setWeatherData({ ...weatherData, windSpeed: e.target.value })}
                          placeholder="5.0"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="body-sm font-medium">Wind Direction (degrees)</label>
                        <Input
                          type="number"
                          value={weatherData.windDirection}
                          onChange={(e) => setWeatherData({ ...weatherData, windDirection: e.target.value })}
                          placeholder="180"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="body-sm font-medium">Rainfall (inches)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={weatherData.rainfall}
                          onChange={(e) => setWeatherData({ ...weatherData, rainfall: e.target.value })}
                          placeholder="0.0"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handlePublishWeather}
                      disabled={!address || isPublishingData}
                      className="w-full gradient-primary"
                    >
                      {isPublishingData ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Publish Weather Data
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {device.type === DeviceType.AIR_QUALITY_MONITOR && (
                  <div className="space-y-4">
                    {/* Help Guide */}
                    <div className="border border-blue-200 rounded-lg bg-blue-50 p-4">
                      <button
                        type="button"
                        onClick={() => setShowSensorHelp(!showSensorHelp)}
                        className="flex items-center justify-between w-full text-left"
                      >
                        <div className="flex items-center gap-2">
                          <HelpCircle className="w-5 h-5 text-primary-blue" />
                          <span className="body-sm font-semibold text-primary-blue">
                            Where do I get air quality readings?
                          </span>
                        </div>
                        {showSensorHelp ? (
                          <ChevronUp className="w-5 h-5 text-primary-blue" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-primary-blue" />
                        )}
                      </button>
                      
                      {showSensorHelp && (
                        <div className="mt-4 space-y-3 text-sm text-gray-700">
                          <p className="font-semibold">🌬️ Air Quality Monitor - Where to find readings:</p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li><strong>Air Quality App:</strong> BreezoMeter, AirVisual, or PurpleAir app</li>
                            <li><strong>Smart Air Purifier:</strong> Check device display or companion app (Dyson, Xiaomi)</li>
                            <li><strong>Online:</strong> AirNow.gov, IQAir.com, or PurpleAir.com</li>
                            <li><strong>Weather App:</strong> Many weather apps also show AQI</li>
                          </ul>
                          <p className="text-xs text-gray-600 mt-2">
                            💡 <strong>Quick test:</strong> Search "air quality" on Google - it shows your local AQI!
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="body-sm font-medium">PM2.5 (μg/m³)</label>
                        <Input
                          type="number"
                          value={airQualityData.pm25}
                          onChange={(e) => setAirQualityData({ ...airQualityData, pm25: e.target.value })}
                          placeholder="15"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="body-sm font-medium">PM10 (μg/m³)</label>
                        <Input
                          type="number"
                          value={airQualityData.pm10}
                          onChange={(e) => setAirQualityData({ ...airQualityData, pm10: e.target.value })}
                          placeholder="25"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="body-sm font-medium">CO₂ (ppm)</label>
                        <Input
                          type="number"
                          value={airQualityData.co2}
                          onChange={(e) => setAirQualityData({ ...airQualityData, co2: e.target.value })}
                          placeholder="400"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="body-sm font-medium">NO₂ (ppb)</label>
                        <Input
                          type="number"
                          value={airQualityData.no2}
                          onChange={(e) => setAirQualityData({ ...airQualityData, no2: e.target.value })}
                          placeholder="20"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="body-sm font-medium">O₃ (ppb)</label>
                        <Input
                          type="number"
                          value={airQualityData.o3}
                          onChange={(e) => setAirQualityData({ ...airQualityData, o3: e.target.value })}
                          placeholder="50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="body-sm font-medium">AQI</label>
                        <Input
                          type="number"
                          value={airQualityData.aqi}
                          onChange={(e) => setAirQualityData({ ...airQualityData, aqi: e.target.value })}
                          placeholder="45"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handlePublishAirQuality}
                      disabled={!address || isPublishingData}
                      className="w-full gradient-primary"
                    >
                      {isPublishingData ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Publish Air Quality Data
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Device Integration - For Developers */}
            <Card id="device-integration">
              <CardHeader>
                <CardTitle>Device Integration (For Developers)</CardTitle>
                <CardDescription>Automate publishing with our SDK or API</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-primary-blue" />
                  <AlertDescription className="text-gray-700">
                    This section is for developers who want to integrate their devices to publish data automatically. 
                    If you're happy with manual publishing above, you can skip this section!
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div>
                    <h3 className="body-base font-semibold mb-2">Quick Start</h3>
                    <p className="body-sm text-gray-600 mb-4">
                      Use one of these methods to integrate your device:
                    </p>
                    <div className="grid grid-cols-1 gap-3 mb-4">
                      <a
                        href="/docs/device-integration"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-4 border border-gray-200 rounded-lg hover:border-primary-blue hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="body-base font-medium">📚 Full Integration Guide</p>
                            <p className="body-sm text-gray-600 mt-1">Code examples for Python, Node.js, HTTP API, and more</p>
                          </div>
                          <Info className="w-5 h-5 text-gray-400" />
                        </div>
                      </a>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="body-base font-semibold mb-2">Device Credentials</h3>
                    <div className="space-y-2 p-4 bg-gray-50 rounded-lg font-mono text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Device ID:</span>
                        <span className="font-semibold">{device.id}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Device Address:</span>
                        <span className="font-semibold text-xs break-all">{device.deviceAddress}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Owner Address:</span>
                        <span className="font-semibold text-xs break-all">{device.ownerAddress}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">RPC URL:</span>
                        <span className="font-semibold text-xs">https://dream-rpc.somnia.network</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Chain ID:</span>
                        <span className="font-semibold">50312 (Somnia Testnet)</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="body-base font-semibold mb-2">Python Example</h3>
                    <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                      <pre className="text-green-400 text-xs">
{`from iot_trade_sdk import IoTTradeClient

client = IoTTradeClient(
    device_id="${device.id}",
    api_key="ak_your_api_key",
    rpc_url="https://dream-rpc.somnia.network"
)

# Publish data
client.publish_gps_data(
    latitude=37.7749,
    longitude=-122.4194,
    altitude=10,
    accuracy=5,
    speed=0,
    heading=0
)`}
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h3 className="body-base font-semibold mb-2">Node.js Example</h3>
                    <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                      <pre className="text-green-400 text-xs">
{`const { IoTTradeClient } = require('@iot-trade/sdk');

const client = new IoTTradeClient({
  deviceId: '${device.id}',
  apiKey: 'ak_your_api_key',
  rpcUrl: 'https://dream-rpc.somnia.network'
});

await client.publishGPSData({
  latitude: 37.7749,
  longitude: -122.4194,
  altitude: 10,
  accuracy: 5,
  speed: 0,
  heading: 0
});`}
                      </pre>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-error-red">
              <CardHeader>
                <CardTitle className="text-error-red">Danger Zone</CardTitle>
                <CardDescription>Irreversible actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-red-50 border-error-red">
                  <AlertTriangle className="h-4 w-4 text-error-red" />
                  <AlertDescription className="text-gray-700">
                    Deactivating your device will stop all active subscriptions and remove it from the marketplace. This action cannot be undone.
                  </AlertDescription>
                </Alert>

                <Button
                  variant="destructive"
                  onClick={handleDeactivate}
                  className="w-full"
                >
                  Deactivate Device
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}