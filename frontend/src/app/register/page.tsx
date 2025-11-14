'use client';

import { useState, useEffect, useRef } from 'react';
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
import { RegistrationStep, DeviceType } from '@/lib/enums';
import { useApp } from '@/context/AppContext';
import { registerDevice } from '@/services/deviceService';
import { registerDeviceInRegistry } from '@/services/registryService';
import { 
  generateAndPublishVerificationCode, 
  verifyDeviceChallenge,
  sendVerificationCodeToDevice
} from '@/services/deviceVerification';
import { parseError, getUserFriendlyMessage } from '@/lib/errors';
import { type Address } from 'viem';
import { BrowserProvider } from 'ethers';

export default function RegisterPage() {
  const { isConnected, address } = useAccount();
  const { open } = useAppKit();
  const router = useRouter();
  const { addUserDevice } = useApp();
  
  const [step, setStep] = useState<RegistrationStep>(RegistrationStep.ENTER_SERIAL);
  const [serialNumber, setSerialNumber] = useState('');
  const [deviceAddress, setDeviceAddress] = useState<Address | ''>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationChallenge, setVerificationChallenge] = useState<{ challenge: string; verificationCode: string; expiresIn: number } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationTimer, setVerificationTimer] = useState<number>(0);
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
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const CHAIN_ID_HEX = '0xc488';

  const getEthersSigner = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('Wallet not available');
    }

    const provider = new BrowserProvider((window as any).ethereum);
    try {
      await provider.send('wallet_switchEthereumChain', [{ chainId: CHAIN_ID_HEX }]);
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await provider.send('wallet_addEthereumChain', [{
          chainId: CHAIN_ID_HEX,
          chainName: 'Somnia Testnet',
          rpcUrls: ['https://dream-rpc.somnia.network'],
          nativeCurrency: {
            name: 'Somnia Testnet Token',
            symbol: 'STT',
            decimals: 18,
          },
          blockExplorerUrls: ['https://shannon-explorer.somnia.network'],
        }]);
      } else {
        throw switchError;
      }
    }

    return await provider.getSigner();
  };

  const handleVerifySerial = async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const signer = await getEthersSigner();
      // Generate a deterministic device address from serial number
      const seed = serialNumber || `device-${Date.now()}`;
      const hash = seed.split('').reduce((acc, char) => {
        const h = ((acc << 5) - acc) + char.charCodeAt(0);
        return h & h;
      }, 0);
      const deviceAddr = `0x${Math.abs(hash).toString(16).padStart(40, '0')}` as Address;
      setDeviceAddress(deviceAddr);
      
      // Generate and publish verification code to blockchain
      const result = await generateAndPublishVerificationCode(
        signer,
        serialNumber,
        deviceAddr,
        address
      );
      
      setVerificationChallenge({
        challenge: result.txHash, // Use txHash as challenge identifier
        verificationCode: result.verificationCode,
        expiresIn: result.expiresIn,
      });
      
      // Code is now published to blockchain - device can read it directly!
      await sendVerificationCodeToDevice(serialNumber, result.verificationCode, deviceAddr);
      
      // Start countdown timer
      setVerificationTimer(result.expiresIn);
      
      // Clear any existing timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      
      timerIntervalRef.current = setInterval(() => {
        setVerificationTimer(prev => {
          if (prev <= 1) {
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      setStep(RegistrationStep.VERIFY_DEVICE);
    } catch (err: any) {
      console.error('Error generating verification code:', err);
      setError('Failed to generate verification code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyDevice = async () => {
    if (!address || !verificationCode || verificationCode.length !== 6) {
      if (!verificationCode || verificationCode.length !== 6) {
        setError('Please enter the 6-digit verification code');
      } else {
        setError('Wallet not connected');
      }
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      // Verify code from blockchain
      const result = await verifyDeviceChallenge(serialNumber, verificationCode, address);
      
      if (result.verified) {
        setStep(RegistrationStep.FILL_DETAILS);
        setError(null);
      } else {
        setError(result.error || 'Verification failed. Please try again.');
      }
    } catch (err: any) {
      setError('Verification error: ' + (err.message || 'Unknown error'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!address || !deviceAddress || !serialNumber) {
      setError('Wallet not connected');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const signer = await getEthersSigner();
      // Generate new verification code and publish to blockchain
      const result = await generateAndPublishVerificationCode(
        signer,
        serialNumber,
        deviceAddress as Address,
        address
      );
      
      setVerificationChallenge({
        challenge: result.txHash,
        verificationCode: result.verificationCode,
        expiresIn: result.expiresIn,
      });
      
      setVerificationCode('');
      setError(null);
      
      await sendVerificationCodeToDevice(serialNumber, result.verificationCode, deviceAddress as Address);
      setVerificationTimer(result.expiresIn);
    } catch (err: any) {
      console.error('Error resending verification code:', err);
      setError('Failed to generate new verification code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRegister = async () => {
    if (!address || !deviceAddress) {
      setError('Wallet not connected');
      return;
    }

    setIsRegistering(true);
    setError(null);

    try {
      const signer = await getEthersSigner();
      // Register device on-chain using Somnia Data Streams
      // Use owner's address (connected wallet) as publisher, deviceAddress as identifier
      const result = await registerDevice(
        signer,
        formData.name,
        formData.type as DeviceType,
        formData.location,
        parseFloat(formData.price),
        address, // Owner's wallet address (publisher)
        deviceAddress as Address // Device identifier address
      );

      // Also register device in the registry for marketplace discovery
      try {
        await registerDeviceInRegistry(
          signer,
          deviceAddress as Address,
          address,
          formData.type
        );
      } catch (registryError) {
        console.warn('Failed to register device in registry (device still registered):', registryError);
        // Continue even if registry registration fails
      }

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
      
      // Save device address to localStorage for future loading
      if (typeof window !== 'undefined' && address) {
        const key = `user_devices_${address.toLowerCase()}`;
        const existing = localStorage.getItem(key);
        const addresses = existing ? JSON.parse(existing) : [];
        if (!addresses.includes(deviceAddress)) {
          addresses.push(deviceAddress);
          localStorage.setItem(key, JSON.stringify(addresses));
        }
      }
      
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
                  disabled={!serialNumber || !isConnected || isVerifying}
                  className="w-full gradient-primary"
                  size="lg"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Publishing to Blockchain...
                    </>
                  ) : (
                    'Verify Serial Number'
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Verify Device */}
          {step === RegistrationStep.VERIFY_DEVICE && (
            <Card>
              <CardHeader>
                <CardTitle className="heading-lg">Verify Device Ownership</CardTitle>
                <CardDescription>
                  Enter the verification code displayed on your device
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-primary-blue" />
                  <AlertDescription className="text-gray-700">
                    A verification code has been sent to your device. The code should be displayed 
                    on your device's screen.
                    <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                      <p className="font-semibold mb-2">Device Serial Number:</p>
                      <p className="font-mono text-sm">{serialNumber}</p>
                    </div>
                  </AlertDescription>
                </Alert>

                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-success-green" />
                  <AlertDescription className="text-gray-700">
                    <p className="font-semibold mb-2">How to get the verification code:</p>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li>Your device should read the verification code from Somnia blockchain</li>
                      <li>Check your device's display screen - the code should appear automatically</li>
                      <li>Enter the 6-digit code shown on your device below</li>
                    </ol>
                    <div className="mt-3 p-2 bg-white rounded text-xs">
                      <p className="font-semibold">🔗 Blockchain-based verification:</p>
                      <p className="text-xs mt-1">
                        The verification code has been published to Somnia blockchain. 
                        Your device can read it directly using its serial number - no backend needed!
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>

                {verificationChallenge && (
                  <Alert className="bg-yellow-50 border-warning-yellow">
                    <Info className="h-4 w-4 text-warning-yellow" />
                    <AlertDescription className="text-gray-700">
                      <p className="text-sm font-semibold mb-1">
                        Code expires in: {Math.floor(verificationTimer / 60)}:{(verificationTimer % 60).toString().padStart(2, '0')}
                      </p>
                      <p className="text-xs text-gray-600">
                        Your device should retrieve the code via the API endpoint and display it on its screen.
                      </p>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <label className="body-base font-medium">Verification Code</label>
                  <Input
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setVerificationCode(value);
                      setError(null);
                    }}
                    className="text-lg text-center font-mono tracking-widest"
                    maxLength={6}
                  />
                  <p className="body-sm text-gray-600">
                    Enter the 6-digit code from your device
                  </p>
                </div>

                {error && (
                  <Alert className="bg-red-50 border-red-200">
                    <Info className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-700">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Button
                    onClick={handleVerifyDevice}
                    disabled={!verificationCode || verificationCode.length !== 6 || isVerifying || verificationTimer === 0}
                    className="w-full gradient-primary"
                    size="lg"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify Device'
                    )}
                  </Button>

                  <Button
                    onClick={handleResendCode}
                    variant="outline"
                    className="w-full"
                    disabled={verificationTimer > 300} // Can resend after 5 minutes
                  >
                    Resend Code
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <Button
                    onClick={() => setStep(RegistrationStep.ENTER_SERIAL)}
                    variant="ghost"
                    className="w-full"
                  >
                    ← Back to Serial Number
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Fill Device Details */}
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