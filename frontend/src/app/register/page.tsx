'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Info, Download, Loader2, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { DeviceType, DeviceStatus } from '@/lib/enums';
import { useApp } from '@/context/AppContext';
import { registerDevice, publishGPSData, publishWeatherData, publishAirQualityData } from '@/services/deviceService';
import { registerDeviceOnChain } from '@/services/registryService';
import { parseError, getUserFriendlyMessage } from '@/lib/errors';
import { validateGPSData, validateWeatherData, validateAirQualityData, formatValidationErrors } from '@/lib/validation';
import { type Address, createWalletClient, createPublicClient, http, custom, keccak256, stringToHex } from 'viem';
import { somniaTestnet } from '@/config/wagmi';

function deriveDeviceAddress(serial: string): Address {
  const trimmed = serial.trim();
  if (!trimmed) {
    return '' as Address;
  }
  const hash = keccak256(stringToHex(trimmed));
  return `0x${hash.slice(-40)}` as Address;
}

export default function RegisterPage() {
  const { isConnected, address } = useAccount();
  const { open } = useAppKit();
  const router = useRouter();
  const { addUserDevice } = useApp();
  
  const [serialNumber, setSerialNumber] = useState('');
  const [deviceAddress, setDeviceAddress] = useState<Address | ''>('');
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    location: '',
    price: '',
    subscriptionDurationDays: '30',
  });
  // Sensor data state - conditionally shown based on device type
  const [sensorData, setSensorData] = useState({
    // GPS Tracker
    latitude: '',
    longitude: '',
    altitude: '0',
    accuracy: '10',
    speed: '0',
    heading: '0',
    // Weather Station
    temperature: '',
    humidity: '',
    pressure: '',
    windSpeed: '0',
    windDirection: '0',
    rainfall: '0',
    // Air Quality Monitor
    pm25: '',
    pm10: '',
    co2: '',
    no2: '',
    o3: '',
    aqi: '',
  });
  const [includeSensorData, setIncludeSensorData] = useState(true);
  const [sensorDataError, setSensorDataError] = useState<string | null>(null);
  const [showSensorHelp, setShowSensorHelp] = useState(false);
  const [credentials, setCredentials] = useState({
    deviceId: '',
    apiKey: '',
    apiSecret: '',
    txHash: '',
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  useEffect(() => {
    setDeviceAddress(deriveDeviceAddress(serialNumber));
  }, [serialNumber]);

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

  const handleRegister = async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }
    if (!serialNumber.trim()) {
      setError('Serial number is required');
      return;
    }
    if (!deviceAddress) {
      setError('Unable to derive device address. Check the serial number.');
      return;
    }
    if (!formData.name.trim()) {
      setError('Device name is required');
      return;
    }
    if (!formData.type) {
      setError('Device type is required');
      return;
    }
    if (!formData.location.trim()) {
      setError('Location is required');
      return;
    }
    if (!formData.price.trim()) {
      setError('Price per data point is required. Please enter a value (e.g., 0.00001 STT)');
      return;
    }

    setIsRegistering(true);
    setError(null);
    setSensorDataError(null);

    try {
      const walletClient = await getWalletClient();
      const priceFloat = parseFloat(formData.price);
      if (Number.isNaN(priceFloat) || priceFloat <= 0) {
        throw new Error('Invalid price per data point. Please enter a valid number greater than 0 (e.g., 0.00001)');
      }
      const durationDays = parseInt(formData.subscriptionDurationDays, 10);
      if (Number.isNaN(durationDays) || durationDays <= 0) {
        throw new Error('Invalid subscription duration');
      }
      const priceWei = BigInt(Math.round(priceFloat * 1e18));
      const durationSeconds = BigInt(durationDays * 24 * 60 * 60);

      const metadata = {
        serialNumber,
        name: formData.name,
        type: formData.type,
        location: formData.location,
      };

      // Register on-chain first
      const registryTxHash = await registerDeviceOnChain(walletClient, {
        deviceAddress: deviceAddress as Address,
        name: formData.name,
        deviceType: formData.type,
        location: formData.location,
        pricePerDataPoint: priceWei,
        subscriptionDuration: durationSeconds,
        metadataURI: JSON.stringify(metadata),
      });

      // Wait for transaction confirmation
      const publicClient = createPublicClient({
        chain: somniaTestnet,
        transport: http(somniaTestnet.rpcUrls.default.http[0]),
      });
      
      await publicClient.waitForTransactionReceipt({
        hash: registryTxHash,
      });

      // Also register with Somnia Data Streams
      const result = await registerDevice(
        walletClient,
        formData.name,
        formData.type as DeviceType,
        formData.location,
        priceFloat,
        address,
        deviceAddress as Address,
      );

      // Publish real sensor data if provided (optional but recommended)
      let dataPublished = false;
      if (includeSensorData) {
        try {
          const dataTimestamp = BigInt(Date.now());
          let validation;
          
          switch (formData.type as DeviceType) {
            case DeviceType.GPS_TRACKER:
              validation = validateGPSData({
                latitude: sensorData.latitude,
                longitude: sensorData.longitude,
                altitude: sensorData.altitude || '0',
                accuracy: sensorData.accuracy || '10',
                speed: sensorData.speed || '0',
                heading: sensorData.heading || '0',
              });
              
              if (validation.isValid) {
                await publishGPSData(walletClient, deviceAddress as Address, {
                  timestamp: dataTimestamp,
                  latitude: parseFloat(sensorData.latitude),
                  longitude: parseFloat(sensorData.longitude),
                  altitude: parseFloat(sensorData.altitude || '0'),
                  accuracy: parseFloat(sensorData.accuracy || '10'),
                  speed: parseFloat(sensorData.speed || '0'),
                  heading: parseFloat(sensorData.heading || '0'),
                });
                dataPublished = true;
              } else {
                setSensorDataError(formatValidationErrors(validation.errors));
                throw new Error('Invalid GPS data: ' + formatValidationErrors(validation.errors));
              }
              break;
              
            case DeviceType.WEATHER_STATION:
              validation = validateWeatherData({
                temperature: sensorData.temperature,
                humidity: sensorData.humidity,
                pressure: sensorData.pressure,
                windSpeed: sensorData.windSpeed || '0',
                windDirection: sensorData.windDirection || '0',
                rainfall: sensorData.rainfall || '0',
              });
              
              if (validation.isValid) {
                await publishWeatherData(walletClient, deviceAddress as Address, {
                  timestamp: dataTimestamp,
                  temperature: parseFloat(sensorData.temperature),
                  humidity: parseFloat(sensorData.humidity),
                  pressure: parseFloat(sensorData.pressure),
                  windSpeed: parseFloat(sensorData.windSpeed || '0'),
                  windDirection: parseInt(sensorData.windDirection || '0'),
                  rainfall: parseFloat(sensorData.rainfall || '0'),
                });
                dataPublished = true;
              } else {
                setSensorDataError(formatValidationErrors(validation.errors));
                throw new Error('Invalid weather data: ' + formatValidationErrors(validation.errors));
              }
              break;
              
            case DeviceType.AIR_QUALITY_MONITOR:
              validation = validateAirQualityData({
                pm25: sensorData.pm25,
                pm10: sensorData.pm10,
                co2: sensorData.co2,
                no2: sensorData.no2,
                o3: sensorData.o3,
                aqi: sensorData.aqi,
              });
              
              if (validation.isValid) {
                await publishAirQualityData(walletClient, deviceAddress as Address, {
                  timestamp: dataTimestamp,
                  pm25: parseInt(sensorData.pm25),
                  pm10: parseInt(sensorData.pm10),
                  co2: parseInt(sensorData.co2),
                  no2: parseInt(sensorData.no2),
                  o3: parseInt(sensorData.o3),
                  aqi: parseInt(sensorData.aqi),
                });
                dataPublished = true;
              } else {
                setSensorDataError(formatValidationErrors(validation.errors));
                throw new Error('Invalid air quality data: ' + formatValidationErrors(validation.errors));
              }
              break;
          }
        } catch (sensorError: any) {
          // If sensor data validation fails or publish fails, fail the entire registration
          // User can uncheck "Include sensor data" to skip this
          throw sensorError;
        }
      }

      // Use device address for consistent ID format (matches registry)
      const deviceId = `device-${deviceAddress.slice(2, 10)}`;
      const newDevice = {
        id: deviceId,
        name: formData.name,
        type: formData.type as DeviceType,
        status: DeviceStatus.ONLINE,
        qualityScore: 0,
        location: formData.location,
          totalDataPoints: dataPublished ? 1 : 0,
        totalEarnings: 0,
        totalEarningsUsd: 0,
        activeSubscribers: 0,
        deviceAddress: deviceAddress as Address,
        ownerAddress: address,
        pricePerDataPoint: priceFloat,
        updateFrequency: 'Every 1 minute',
        uptime: 0,
        lastPublished: new Date(),
      };
      
      if (typeof window !== 'undefined') {
        const key = `user_devices_${address.toLowerCase()}`;
        const existing = localStorage.getItem(key);
        const addresses = existing ? JSON.parse(existing) : [];
        if (!addresses.includes(deviceAddress)) {
          addresses.push(deviceAddress);
          localStorage.setItem(key, JSON.stringify(addresses));
        }
      }
      
      addUserDevice(newDevice);
      
      setCredentials({
        deviceId,
        apiKey: `ak_${Math.random().toString(36).substr(2, 32)}`,
        apiSecret: `as_${Math.random().toString(36).substr(2, 48)}`,
        txHash: registryTxHash,
      });
      
      setRegistrationComplete(true);
    } catch (err: any) {
      console.error('Error registering device:', err);
      const appError = parseError(err);
      const errorMessage = appError.details || appError.message || 'Failed to register device on blockchain';
      
      // Check if it's a sensor data error
      if (err.message?.includes('Invalid') || err.message?.includes('sensor')) {
        setSensorDataError(errorMessage);
        setError(null);
      } else {
      setError(`${getUserFriendlyMessage(appError)}: ${errorMessage}`);
        setSensorDataError(null);
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDownloadCredentials = () => {
    const config = {
      deviceId: credentials.deviceId,
      deviceAddress,
      apiKey: credentials.apiKey,
      apiSecret: credentials.apiSecret,
      txHash: credentials.txHash,
      endpoint: 'https://dream-rpc.somnia.network',
      network: 'Somnia Testnet',
      chainId: 50312,
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `device-${credentials.deviceId}-config.json`;
    a.click();
  };

  if (!isConnected) {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-24 pb-12 px-6">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                  <Info className="w-8 h-8 text-primary-blue" />
                </div>
                <h3 className="heading-md mb-2">Connect Wallet First</h3>
                <p className="body-base text-gray-600 mb-6">
                  You need to connect your wallet to register a device
                </p>
                <Button onClick={() => open()} className="gradient-primary">
                  Connect Wallet
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </>
    );
  }

  if (registrationComplete) {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-12 px-6">
        <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="py-12 px-6">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-12 h-12 text-success-green" />
                  </div>
                  <h2 className="heading-lg mb-2">🎉 Registration Complete!</h2>
                  <p className="body-base text-gray-600">
                    Your device has been successfully registered on the blockchain
                  </p>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="body-sm text-gray-600 mb-1">Device ID</p>
                    <p className="body-base font-mono">{credentials.deviceId}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="body-sm text-gray-600 mb-1">Device Address</p>
                    <p className="body-base font-mono">{deviceAddress}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="body-sm text-gray-600 mb-1">Transaction Hash</p>
                    <p className="body-base font-mono text-sm break-all">{credentials.txHash}</p>
                    <a 
                      href={`https://shannon-explorer.somnia.network/tx/${credentials.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="body-sm text-primary-blue hover:underline mt-1 inline-block"
                    >
                      View on Explorer
                    </a>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="body-sm text-gray-600 mb-1">API Key</p>
                    <p className="body-base font-mono text-sm">{credentials.apiKey}</p>
                  </div>
                </div>

                <Alert className="bg-yellow-50 border-warning-yellow mb-6">
                  <Info className="h-4 w-4 text-warning-yellow" />
                  <AlertDescription className="text-gray-700">
                    Save these credentials securely. You'll need them to configure your device.
                  </AlertDescription>
                </Alert>

                <Separator className="my-6" />

                <div className="space-y-4">
                  <h3 className="body-base font-semibold">What's Next?</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">📝</div>
                        <div>
                          <p className="body-base font-semibold mb-1">Continue Manual Publishing</p>
                          <p className="body-sm text-gray-600 mb-3">
                            Keep entering sensor data manually - perfect for beginners!
                          </p>
                          <a
                            href={`/device/${credentials.deviceId}/settings`}
                            className="body-sm text-primary-blue hover:underline font-medium"
                          >
                            Go to Device Settings →
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">⚙️</div>
                        <div>
                          <p className="body-base font-semibold mb-1">Automate Publishing</p>
                          <p className="body-sm text-gray-600 mb-3">
                            For developers: integrate your device to publish automatically
                          </p>
                          <a
                            href="/docs/device-integration"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="body-sm text-primary-blue hover:underline font-medium"
                          >
                            View Integration Guide →
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Alert className="bg-gray-50 border-gray-200">
                    <Info className="h-4 w-4 text-gray-600" />
                    <AlertDescription className="text-gray-700 text-sm">
                      <strong>Tip:</strong> Both manual and automatic publishing work great! Choose what fits your needs. 
                      You can switch anytime in device settings.
                    </AlertDescription>
                  </Alert>
                </div>

                <div className="flex gap-4 mt-6">
                  <Button onClick={handleDownloadCredentials} variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Download Credentials
                  </Button>
                  <Button onClick={() => router.push('/dashboard')} className="flex-1 gradient-primary">
                    Go to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-12 px-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="heading-lg">Register Your IoT Device</CardTitle>
              <CardDescription>
                Provide your device details to publish them on the Somnia Device Registry.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-primary-blue" />
                <AlertDescription className="text-gray-700">
                  Enter your device serial number. We use it to deterministically generate a unique on-chain address.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <label className="body-base font-medium">Device Serial Number</label>
                <Input
                  placeholder="SN-ABC123XYZ"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="text-lg"
                />
                {deviceAddress && (
                  <p className="body-sm text-gray-600">
                    Derived Device Address: <span className="font-mono">{deviceAddress.slice(0, 10)}...{deviceAddress.slice(-8)}</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="body-base font-medium">Device Name</label>
                <Input
                  placeholder="My GPS Tracker"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="body-base font-medium">Device Type</label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select device type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DeviceType.GPS_TRACKER}>GPS Tracker</SelectItem>
                    <SelectItem value={DeviceType.WEATHER_STATION}>Weather Station</SelectItem>
                    <SelectItem value={DeviceType.AIR_QUALITY_MONITOR}>Air Quality Monitor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="body-base font-medium">Location *</label>
                <Input
                  placeholder="San Jose, CA"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="body-base font-medium">Price per Data Point (STT) *</label>
                <Input
                  type="number"
                  step="0.00001"
                  min="0.00001"
                  placeholder="0.00001"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
                <p className="text-xs text-gray-500">Required. Minimum: 0.00001 STT per data point</p>
              </div>

              <div className="space-y-2">
                <label className="body-base font-medium">Subscription Duration (days)</label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="30"
                  value={formData.subscriptionDurationDays}
                  onChange={(e) => setFormData({ ...formData, subscriptionDurationDays: e.target.value })}
                />
                <p className="body-sm text-gray-600">How long purchasers can access data after each payment.</p>
              </div>

              <Separator />

              <div className="space-y-4">
                <Alert className="bg-green-50 border-success-green">
                  <Info className="h-4 w-4 text-success-green" />
                  <AlertDescription className="text-gray-700">
                    <strong>New to IoT-Trade?</strong> Simply enter your sensor readings below to publish data instantly - no coding required! 
                    You can always set up automatic publishing later in device settings.
                  </AlertDescription>
                </Alert>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label htmlFor="include-sensor-data" className="body-base font-medium">
                      Publish Initial Sensor Reading
                    </label>
                    <p className="body-sm text-gray-600">
                      Enter your sensor data to publish your first reading immediately (recommended)
                    </p>
                  </div>
                  <Switch
                    id="include-sensor-data"
                    checked={includeSensorData}
                    onCheckedChange={setIncludeSensorData}
                  />
                </div>

                {includeSensorData && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-primary-blue" />
                    <AlertDescription className="text-gray-700 text-sm">
                      💡 <strong>For Developers:</strong> Want to automate publishing? After registration, go to device settings to integrate your device with our SDK or API. 
                      See <a href="/docs/device-integration" className="text-primary-blue underline font-medium">Device Integration Guide</a> for code examples.
                    </AlertDescription>
                  </Alert>
                )}

                {includeSensorData && formData.type && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    {/* Help Guide */}
                    <div className="border border-blue-200 rounded-lg bg-blue-50 p-4">
                      <button
                        type="button"
                        onClick={() => setShowSensorHelp(!showSensorHelp)}
                        className="flex items-center justify-between w-full text-left"
                      >
                        <div className="flex items-center gap-2">
                          <HelpCircle className="w-5 h-5 text-primary-blue" />
                          <span className="body-base font-semibold text-primary-blue">
                            How do I get sensor data?
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
                          {formData.type === DeviceType.GPS_TRACKER && (
                            <>
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
                            </>
                          )}
                          
                          {formData.type === DeviceType.WEATHER_STATION && (
                            <>
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
                            </>
                          )}
                          
                          {formData.type === DeviceType.AIR_QUALITY_MONITOR && (
                            <>
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
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {formData.type === DeviceType.GPS_TRACKER && (
                      <>
                        <h3 className="body-base font-semibold mb-2">GPS Data</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label htmlFor="latitude" className="body-base font-medium">Latitude *</label>
                            <Input
                              id="latitude"
                              type="number"
                              step="0.000001"
                              placeholder="37.7749"
                              value={sensorData.latitude}
                              onChange={(e) => setSensorData({ ...sensorData, latitude: e.target.value })}
                            />
                            <p className="text-xs text-gray-500">💡 Find on: Google Maps (tap your location), GPS device display. Range: -90 to 90</p>
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="longitude" className="body-base font-medium">Longitude *</label>
                            <Input
                              id="longitude"
                              type="number"
                              step="0.000001"
                              placeholder="-122.4194"
                              value={sensorData.longitude}
                              onChange={(e) => setSensorData({ ...sensorData, longitude: e.target.value })}
                            />
                            <p className="text-xs text-gray-500">💡 Usually shown with latitude on maps/GPS. Range: -180 to 180</p>
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="altitude" className="body-base font-medium">Altitude (m)</label>
                            <Input
                              id="altitude"
                              type="number"
                              placeholder="0"
                              value={sensorData.altitude}
                              onChange={(e) => setSensorData({ ...sensorData, altitude: e.target.value })}
                            />
                            <p className="text-xs text-gray-500">Height above sea level. Optional, default: 0</p>
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="accuracy" className="body-base font-medium">Accuracy (m)</label>
                            <Input
                              id="accuracy"
                              type="number"
                              placeholder="10"
                              value={sensorData.accuracy}
                              onChange={(e) => setSensorData({ ...sensorData, accuracy: e.target.value })}
                            />
                            <p className="text-xs text-gray-500">GPS accuracy in meters. Optional, default: 10</p>
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="speed" className="body-base font-medium">Speed (km/h)</label>
                            <Input
                              id="speed"
                              type="number"
                              placeholder="0"
                              value={sensorData.speed}
                              onChange={(e) => setSensorData({ ...sensorData, speed: e.target.value })}
                            />
                            <p className="text-xs text-gray-500">Current speed. Optional, default: 0</p>
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="heading" className="body-base font-medium">Heading (degrees)</label>
                            <Input
                              id="heading"
                              type="number"
                              placeholder="0"
                              value={sensorData.heading}
                              onChange={(e) => setSensorData({ ...sensorData, heading: e.target.value })}
                            />
                            <p className="text-xs text-gray-500">Direction (0-360°). 0=North, 90=East. Optional</p>
                          </div>
                        </div>
                      </>
                    )}

                    {formData.type === DeviceType.WEATHER_STATION && (
                      <>
                        <h3 className="body-base font-semibold mb-2">Weather Data</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label htmlFor="temperature" className="body-base font-medium">Temperature (°F) *</label>
                            <Input
                              id="temperature"
                              type="number"
                              step="0.1"
                              placeholder="72.5"
                              value={sensorData.temperature}
                              onChange={(e) => setSensorData({ ...sensorData, temperature: e.target.value })}
                            />
                            <p className="text-xs text-gray-500">💡 Check: Phone weather app, weather.com, home thermometer</p>
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="humidity" className="body-base font-medium">Humidity (%) *</label>
                            <Input
                              id="humidity"
                              type="number"
                              step="0.1"
                              placeholder="65.0"
                              value={sensorData.humidity}
                              onChange={(e) => setSensorData({ ...sensorData, humidity: e.target.value })}
                            />
                            <p className="text-xs text-gray-500">💡 Range: 0-100%. Check weather app for current humidity</p>
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="pressure" className="body-base font-medium">Pressure (hPa) *</label>
                            <Input
                              id="pressure"
                              type="number"
                              step="0.01"
                              placeholder="1013.25"
                              value={sensorData.pressure}
                              onChange={(e) => setSensorData({ ...sensorData, pressure: e.target.value })}
                            />
                            <p className="text-xs text-gray-500">💡 Normal: ~1000-1020 hPa. Check weather app details</p>
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="windSpeed" className="body-base font-medium">Wind Speed (mph)</label>
                            <Input
                              id="windSpeed"
                              type="number"
                              step="0.1"
                              placeholder="5.0"
                              value={sensorData.windSpeed}
                              onChange={(e) => setSensorData({ ...sensorData, windSpeed: e.target.value })}
                            />
                            <p className="text-xs text-gray-500">Optional. Check weather app for wind conditions</p>
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="windDirection" className="body-base font-medium">Wind Direction (degrees)</label>
                            <Input
                              id="windDirection"
                              type="number"
                              placeholder="180"
                              value={sensorData.windDirection}
                              onChange={(e) => setSensorData({ ...sensorData, windDirection: e.target.value })}
                            />
                            <p className="text-xs text-gray-500">Optional. 0°=North, 90°=East, 180°=South, 270°=West</p>
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="rainfall" className="body-base font-medium">Rainfall (inches/hour)</label>
                            <Input
                              id="rainfall"
                              type="number"
                              step="0.1"
                              placeholder="0.0"
                              value={sensorData.rainfall}
                              onChange={(e) => setSensorData({ ...sensorData, rainfall: e.target.value })}
                            />
                            <p className="text-xs text-gray-500">Optional. Check weather app for precipitation</p>
                          </div>
                        </div>
                      </>
                    )}

                    {formData.type === DeviceType.AIR_QUALITY_MONITOR && (
                      <>
                        <h3 className="body-base font-semibold mb-2">Air Quality Data</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label htmlFor="pm25" className="body-base font-medium">PM2.5 (μg/m³) *</label>
                            <Input
                              id="pm25"
                              type="number"
                              placeholder="15"
                              value={sensorData.pm25}
                              onChange={(e) => setSensorData({ ...sensorData, pm25: e.target.value })}
                            />
                            <p className="text-xs text-gray-500">💡 Find on: AirVisual, PurpleAir app, or Google search "air quality"</p>
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="pm10" className="body-base font-medium">PM10 (μg/m³) *</label>
                            <Input
                              id="pm10"
                              type="number"
                              placeholder="25"
                              value={sensorData.pm10}
                              onChange={(e) => setSensorData({ ...sensorData, pm10: e.target.value })}
                            />
                            <p className="text-xs text-gray-500">💡 Usually shown with PM2.5 on air quality apps</p>
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="co2" className="body-base font-medium">CO₂ (ppm) *</label>
                            <Input
                              id="co2"
                              type="number"
                              placeholder="400"
                              value={sensorData.co2}
                              onChange={(e) => setSensorData({ ...sensorData, co2: e.target.value })}
                            />
                            <p className="text-xs text-gray-500">💡 Normal: 400-1000 ppm. Check indoor air quality monitors</p>
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="no2" className="body-base font-medium">NO₂ (ppb) *</label>
                            <Input
                              id="no2"
                              type="number"
                              placeholder="20"
                              value={sensorData.no2}
                              onChange={(e) => setSensorData({ ...sensorData, no2: e.target.value })}
                            />
                            <p className="text-xs text-gray-500">💡 Check air quality apps for detailed pollutant data</p>
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="o3" className="body-base font-medium">O₃ (ppb) *</label>
                            <Input
                              id="o3"
                              type="number"
                              placeholder="50"
                              value={sensorData.o3}
                              onChange={(e) => setSensorData({ ...sensorData, o3: e.target.value })}
                            />
                            <p className="text-xs text-gray-500">💡 Ozone level. Check AirNow.gov or air quality apps</p>
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="aqi" className="body-base font-medium">AQI *</label>
                            <Input
                              id="aqi"
                              type="number"
                              placeholder="45"
                              value={sensorData.aqi}
                              onChange={(e) => setSensorData({ ...sensorData, aqi: e.target.value })}
                            />
                            <p className="text-xs text-gray-500">💡 Range: 0-500. Google "air quality" shows your local AQI!</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {sensorDataError && includeSensorData && (
                <Alert className="bg-red-50 border-red-200">
                  <Info className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">
                    {sensorDataError}
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert className="bg-red-50 border-red-200">
                  <Info className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleRegister}
                disabled={
                  !serialNumber ||
                  !deviceAddress ||
                  !formData.name ||
                  !formData.type ||
                  !formData.location ||
                  !formData.price ||
                  isRegistering ||
                  (includeSensorData && formData.type === DeviceType.GPS_TRACKER && (!sensorData.latitude || !sensorData.longitude)) ||
                  (includeSensorData && formData.type === DeviceType.WEATHER_STATION && (!sensorData.temperature || !sensorData.humidity || !sensorData.pressure)) ||
                  (includeSensorData && formData.type === DeviceType.AIR_QUALITY_MONITOR && (!sensorData.pm25 || !sensorData.pm10 || !sensorData.co2 || !sensorData.no2 || !sensorData.o3 || !sensorData.aqi))
                }
                className="w-full gradient-primary"
                size="lg"
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registering & Publishing Data...
                  </>
                ) : (
                  'Complete Registration'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
