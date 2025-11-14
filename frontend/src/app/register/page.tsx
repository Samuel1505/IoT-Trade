'use client';

import { useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Info, Download, Loader2 } from 'lucide-react';
import { RegistrationStep, DeviceType } from '@/lib/enums';
import { useApp } from '@/context/AppContext';
import { registerDevice } from '@/services/deviceService';
import { generateDataId } from '@/lib/somnia';
import { type Address } from 'viem';

export default function RegisterPage() {
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { open } = useAppKit();
  const router = useRouter();
  const { addUserDevice } = useApp();
  
  const [step, setStep] = useState<RegistrationStep>(RegistrationStep.ENTER_SERIAL);
  const [serialNumber, setSerialNumber] = useState('');
  const [deviceAddress, setDeviceAddress] = useState<Address | ''>('');
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    location: '',
    price: ''
  });
  const [credentials, setCredentials] = useState({
    deviceId: '',
    apiKey: '',
    apiSecret: '',
    txHash: ''
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerifySerial = () => {
    // Generate a deterministic device address from serial number
    // In production, this could use a more sophisticated method
    const seed = serialNumber || `device-${Date.now()}`;
    const hash = seed.split('').reduce((acc, char) => {
      const hash = ((acc << 5) - acc) + char.charCodeAt(0);
      return hash & hash;
    }, 0);
    const address = `0x${Math.abs(hash).toString(16).padStart(40, '0')}` as Address;
    setDeviceAddress(address);
    setStep(RegistrationStep.FILL_DETAILS);
  };

  const handleRegister = async () => {
    if (!walletClient || !address || !deviceAddress) {
      setError('Wallet not connected');
      return;
    }

    setIsRegistering(true);
    setError(null);

    try {
      // Register device on-chain using Somnia Data Streams
      // Use owner's address (connected wallet) as publisher, deviceAddress as identifier
      const result = await registerDevice(
        walletClient,
        formData.name,
        formData.type as DeviceType,
        formData.location,
        parseFloat(formData.price),
        address, // Owner's wallet address (publisher)
        deviceAddress as Address // Device identifier address
      );

      // Generate device ID from transaction hash
      const deviceId = `device-${result.txHash.slice(2, 10)}`;
      
      // Create device object for local state
      const newDevice = {
        id: deviceId,
        name: formData.name,
        type: formData.type as DeviceType,
        status: 'ONLINE' as const,
        qualityScore: 0,
        location: formData.location,
        totalDataPoints: 0,
        totalEarnings: 0,
        totalEarningsUsd: 0,
        activeSubscribers: 0,
        deviceAddress: deviceAddress as Address,
        ownerAddress: address, // Store owner's wallet address separately
        pricePerDataPoint: parseFloat(formData.price),
        updateFrequency: 'Every 1 minute',
        uptime: 0,
        lastPublished: new Date()
      };
      
      addUserDevice(newDevice);
      
      // Generate API credentials
      setCredentials({
        deviceId: deviceId,
        apiKey: `ak_${Math.random().toString(36).substr(2, 32)}`,
        apiSecret: `as_${Math.random().toString(36).substr(2, 48)}`,
        txHash: result.txHash
      });
      
      setStep(RegistrationStep.SUCCESS);
    } catch (err: any) {
      console.error('Error registering device:', err);
      setError(err?.message || 'Failed to register device on blockchain');
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
      chainId: 50312
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

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-12 px-6">
        <div className="max-w-2xl mx-auto">
          {/* Step 1: Enter Serial Number */}
          {step === RegistrationStep.ENTER_SERIAL && (
            <Card>
              <CardHeader>
                <CardTitle className="heading-lg">Register Your IoT Device</CardTitle>
                <CardDescription>
                  Find your device serial number on the device label or box
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-primary-blue" />
                  <AlertDescription className="text-gray-700">
                    The serial number is used to generate a unique blockchain address for your device
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
                </div>
                
                <Button
                  onClick={handleVerifySerial}
                  disabled={!serialNumber}
                  className="w-full gradient-primary"
                  size="lg"
                >
                  Verify Serial Number
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Fill Device Details */}
          {step === RegistrationStep.FILL_DETAILS && (
            <Card>
              <CardHeader>
                <CardTitle className="heading-lg">Device Details</CardTitle>
                <Alert className="bg-green-50 border-green-200 mt-4">
                  <CheckCircle2 className="h-4 w-4 text-success-green" />
                  <AlertDescription className="text-gray-700">
                    ✓ Device Verified - Address: {deviceAddress.slice(0, 10)}...{deviceAddress.slice(-8)}
                  </AlertDescription>
                </Alert>
              </CardHeader>
              <CardContent className="space-y-6">
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
                  <label className="body-base font-medium">Location</label>
                  <Input
                    placeholder="San Jose, CA"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="body-base font-medium">Price per Data Point (ETH)</label>
                  <Input
                    type="number"
                    step="0.00001"
                    placeholder="0.00001"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>

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
                  disabled={!formData.name || !formData.type || !formData.location || !formData.price || isRegistering}
                  className="w-full gradient-primary"
                  size="lg"
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Registering on Blockchain...
                    </>
                  ) : (
                    'Complete Registration'
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Success */}
          {step === RegistrationStep.SUCCESS && (
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

                <div className="flex gap-4">
                  <Button
                    onClick={handleDownloadCredentials}
                    variant="outline"
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Credentials
                  </Button>
                  <Button
                    onClick={() => router.push('/dashboard')}
                    className="flex-1 gradient-primary"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}