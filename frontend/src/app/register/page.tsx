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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Info, Download, Loader2 } from 'lucide-react';
import { DeviceType, DeviceStatus } from '@/lib/enums';
import { useApp } from '@/context/AppContext';
import { registerDevice } from '@/services/deviceService';
import { registerDeviceOnChain } from '@/services/registryService';
import { parseError, getUserFriendlyMessage } from '@/lib/errors';
import { type Address, createWalletClient, custom, keccak256, stringToHex } from 'viem';
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

    setIsRegistering(true);
    setError(null);

    try {
      const walletClient = await getWalletClient();
      const priceFloat = parseFloat(formData.price);
      if (Number.isNaN(priceFloat) || priceFloat <= 0) {
        throw new Error('Invalid price per data point');
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

      await registerDeviceOnChain(walletClient, {
        deviceAddress: deviceAddress as Address,
        name: formData.name,
        deviceType: formData.type,
        location: formData.location,
        pricePerDataPoint: priceWei,
        subscriptionDuration: durationSeconds,
        metadataURI: JSON.stringify(metadata),
      });

      const result = await registerDevice(
        walletClient,
        formData.name,
        formData.type as DeviceType,
        formData.location,
        priceFloat,
        address,
        deviceAddress as Address,
      );

      const deviceId = `device-${result.txHash.slice(2, 10)}`;
      const newDevice = {
        id: deviceId,
        name: formData.name,
        type: formData.type as DeviceType,
        status: DeviceStatus.ONLINE,
        qualityScore: 0,
        location: formData.location,
        totalDataPoints: 0,
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
        txHash: result.txHash,
      });

      setRegistrationComplete(true);
    } catch (err: any) {
      console.error('Error registering device:', err);
      const appError = parseError(err);
      const errorMessage = appError.details || appError.message || 'Failed to register device on blockchain';
      setError(`${getUserFriendlyMessage(appError)}: ${errorMessage}`);
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

                <div className="flex gap-4">
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
                <label className="body-base font-medium">Location</label>
                <Input
                  placeholder="San Jose, CA"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="body-base font-medium">Price per Data Point (STT)</label>
                <Input
                  type="number"
                  step="0.00001"
                  min="0"
                  placeholder="0.00001"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
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
                  isRegistering
                }
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
        </div>
      </main>
    </>
  );
}
