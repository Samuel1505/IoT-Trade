'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { createWalletClient, custom, createPublicClient, http } from 'viem';
import { somniaTestnet } from '@/config/wagmi';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { DeviceIcon } from '@/components/shared/DeviceIcon';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useApp } from '@/context/AppContext';
import { formatAddress, formatEthAmount, formatUsdAmount, formatDateTime, formatPercentage } from '@/lib/formatters';
import { mockQuery } from '@/lib/mockData';
import { SubscriptionDuration, DeviceType, DeviceStatus, SubscriptionStatus } from '@/lib/enums';
import type { MarketplaceDevice, UserSubscription } from '@/lib/types';
import type { Address } from 'viem';
import { purchaseDeviceAccess, getAccessExpiry, getDeviceInfo } from '@/services/registryService';

export default function DevicePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  const { marketplaceDevices, addUserSubscription, refreshMarketplaceDevices, refreshUserSubscriptions } = useApp();
  const [selectedDuration, setSelectedDuration] = useState(SubscriptionDuration.SEVEN_DAYS);
  const [device, setDevice] = useState<MarketplaceDevice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<{
    txHash: string;
    deviceId: string;
    deviceName: string;
    daysRemaining: number;
  } | null>(null);
  
  const defaultTab = searchParams.get('tab') || 'preview';
  
  const getWalletClient = async () => {
    if (!address) {
      throw new Error('Wallet not connected');
    }
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('Wallet not available');
    }

    const provider = (window as any).ethereum;
    const CHAIN_ID_HEX = '0xc488';
    
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

  useEffect(() => {
    const loadDevice = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // First try to find in marketplace devices
        let foundDevice = marketplaceDevices.find(d => d.id === id);
        
        // If not found, try to load from registry using device address
        // Device ID format is: device-{address_slice}, so we need to extract the address
        if (!foundDevice) {
          // Try refreshing marketplace first, then search again
          await refreshMarketplaceDevices();
          // After refresh, we need to get updated devices from context
          // But since state update is async, we'll fall through to direct registry lookup
          
          // If still not found, try loading directly from registry
          // We need to find the device address from the ID
          // Since IDs are generated as device-${address.slice(2, 10)}, we need to search all devices
          if (!foundDevice) {
            const { fetchAllRegistryDevices } = await import('@/services/registryService');
            const allDevices = await fetchAllRegistryDevices();
            
            // Find device where the ID matches
            const registryDevice = allDevices.find(d => {
              const deviceId = `device-${d.address.slice(2, 10)}`;
              return deviceId === id;
            });
            
            if (registryDevice && registryDevice.isActive) {
              // Calculate real metrics from Somnia Data Streams
              const { calculateDeviceMetrics } = await import('@/services/deviceService');
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
                pricePerDataPoint: registryDevice.pricePerDataPoint,
                subscriptionDuration: registryDevice.subscriptionDuration,
                subscribers: 0,
                owner: registryDevice.owner,
                deviceAddress: registryDevice.address,
                ownerAddress: registryDevice.owner,
                updateFrequency: metrics.updateFrequency,
                uptime: metrics.uptime,
              };
            }
          }
        } else if (!foundDevice.subscriptionDuration && foundDevice.deviceAddress) {
          // If found in marketplace but missing subscriptionDuration, load it from registry
          const deviceInfo = await getDeviceInfo(foundDevice.deviceAddress as Address);
          if (deviceInfo) {
            foundDevice = {
              ...foundDevice,
              subscriptionDuration: deviceInfo.subscriptionDuration,
            };
          }
        }
        
        if (foundDevice) {
          setDevice(foundDevice);
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
  }, [id]);

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-24 pb-12 px-6">
          <div className="max-w-4xl mx-auto text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-blue" />
            <p className="body-lg text-gray-600">Loading device...</p>
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
            <Button onClick={() => router.push('/marketplace')} variant="outline">
              Back to Marketplace
            </Button>
          </div>
        </main>
      </>
    );
  }

  const handleSubscribe = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet to subscribe');
      return;
    }

    if (!device || !device.deviceAddress) {
      setError('Device information is missing');
      return;
    }

    setIsPurchasing(true);
    setError(null);

    try {
      // Get wallet client
      const walletClient = await getWalletClient();
      const deviceAddress = device.deviceAddress as Address;

      // Get device info from registry to get subscriptionDuration
      const deviceInfo = await getDeviceInfo(deviceAddress);
      if (!deviceInfo) {
        throw new Error('Failed to load device information from blockchain');
      }

      // Calculate payment - use device's pricePerDataPoint
      // For now, one purchase = one subscription period
      // The contract will extend the expiry if user already has an active subscription
      const priceWei = BigInt(Math.round(deviceInfo.pricePerDataPoint * 1e18));

      // Purchase access on-chain
      const txHash = await purchaseDeviceAccess(
        walletClient,
        deviceAddress,
        priceWei
      );

      // Wait for transaction confirmation
      const publicClient = createPublicClient({
        chain: somniaTestnet,
        transport: http(somniaTestnet.rpcUrls.default.http[0]),
      });

      await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      // Get access expiry from blockchain
      const expiryTimestamp = await getAccessExpiry(address, deviceAddress);
      const now = Date.now();
      
      if (expiryTimestamp <= now) {
        throw new Error('Subscription purchase failed - no access granted');
      }

      // Calculate days remaining
      const daysRemaining = Math.ceil((expiryTimestamp - now) / (1000 * 60 * 60 * 24));
      
      // Create subscription from blockchain data
      const newSubscription: UserSubscription = {
        id: `sub-${device.id}-${now}`,
      deviceId: device.id,
      deviceName: device.name,
      deviceType: device.type,
      deviceOwner: device.owner,
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date(now),
        endDate: new Date(expiryTimestamp),
        daysRemaining,
        remainingBalance: deviceInfo.pricePerDataPoint,
      dataPointsConsumed: 0,
      autoRenewal: false
    };

      addUserSubscription(newSubscription);
      
      // Refresh subscriptions in background to ensure UI is up to date
      refreshUserSubscriptions().catch(err => {
        console.error('Error refreshing subscriptions:', err);
      });
      
      // Show success screen instead of immediately redirecting
      setPurchaseSuccess({
        txHash,
        deviceId: device.id,
        deviceName: device.name,
        daysRemaining
      });
      
      setIsPurchasing(false);
    } catch (err: any) {
      console.error('Error purchasing subscription:', err);
      setError(err?.message || 'Failed to purchase subscription. Please try again.');
      setIsPurchasing(false);
    }
  };

  const getPricing = () => {
    return selectedDuration === SubscriptionDuration.ONE_DAY ? mockQuery.subscriptionPricing.oneDay :
           selectedDuration === SubscriptionDuration.SEVEN_DAYS ? mockQuery.subscriptionPricing.sevenDays :
           mockQuery.subscriptionPricing.thirtyDays;
  };

  const pricing = getPricing();

  // Show success screen after purchase
  if (purchaseSuccess) {
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
                  <h2 className="heading-lg mb-2">🎉 Subscription Activated!</h2>
                  <p className="body-base text-gray-600 mb-6">
                    You now have access to <strong>{purchaseSuccess.deviceName}</strong>
                  </p>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="body-sm text-gray-600 mb-1">Subscription Duration</p>
                    <p className="body-base font-semibold">{purchaseSuccess.daysRemaining} days remaining</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="body-sm text-gray-600 mb-1">Transaction Hash</p>
                    <p className="body-base font-mono text-sm break-all">{purchaseSuccess.txHash}</p>
                    <a 
                      href={`https://shannon-explorer.somnia.network/tx/${purchaseSuccess.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="body-sm text-primary-blue hover:underline mt-1 inline-block"
                    >
                      View on Explorer
                    </a>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={() => router.push(`/stream/${purchaseSuccess.deviceId}`)}
                    className="flex-1 gradient-primary"
                    size="lg"
                  >
                    View Data Stream
                  </Button>
                  <Button 
                    onClick={() => router.push('/subscription')}
                    variant="outline"
                    className="flex-1"
                    size="lg"
                  >
                    My Subscriptions
                  </Button>
                </div>

                <Button 
                  onClick={() => {
                    setPurchaseSuccess(null);
                    router.push('/marketplace');
                  }}
                  variant="ghost"
                  className="w-full mt-4"
                >
                  Continue Browsing
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
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => router.push('/marketplace')}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Marketplace
          </Button>

          {/* Device Header */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-blue-50 flex items-center justify-center">
                    <DeviceIcon type={device.type} size={32} className="text-primary-blue" />
                  </div>
                  <div>
                    <CardTitle className="heading-lg mb-2">{device.name}</CardTitle>
                    <p className="body-base text-gray-600 mb-2">{device.location}</p>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={device.status} />
                      <div className="flex items-center gap-1 text-warning-yellow">
                        <span>⭐</span>
                        <span className="body-sm font-medium">{formatPercentage(device.qualityScore)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="body-sm text-gray-600 mb-1">Owner</p>
                  <p className="body-base font-mono">{formatAddress(device.owner)}</p>
                  <p className="body-sm text-gray-600 mt-3">Price per data point</p>
                  <p className="heading-md text-primary-blue">{formatEthAmount(device.pricePerDataPoint)}</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue={defaultTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="preview">Preview Data</TabsTrigger>
              <TabsTrigger value="subscribe">Subscribe</TabsTrigger>
            </TabsList>

            {/* Preview Tab */}
            <TabsContent value="preview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Last 10 Data Points</CardTitle>
                  <p className="body-sm text-gray-600">Free preview - Subscribe to access live stream and full history</p>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockQuery.devicePreviewData.map((point, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">{formatDateTime(point.timestamp)}</TableCell>
                          <TableCell className="font-semibold">{point.value.toFixed(2)}</TableCell>
                          <TableCell>
                            <CheckCircle2 className="w-4 h-4 text-success-green" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Device Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="body-sm text-gray-600 mb-1">Update Frequency</p>
                    <p className="body-base font-semibold">
                      {device.updateFrequency}
                    </p>
                  </div>
                  <div>
                    <p className="body-sm text-gray-600 mb-1">Uptime</p>
                    <p className="body-base font-semibold">
                      {device.uptime > 0 ? formatPercentage(device.uptime) : '0%'}
                    </p>
                  </div>
                  <div>
                    <p className="body-sm text-gray-600 mb-1">Subscribers</p>
                    <p className="body-base font-semibold">{device.subscribers}</p>
                  </div>
                  <div>
                    <p className="body-sm text-gray-600 mb-1">Device Type</p>
                    <p className="body-base font-semibold">{device.type}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Subscribe Tab */}
            <TabsContent value="subscribe" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Subscribe to Device</CardTitle>
                  <p className="body-sm text-gray-600 mt-2">
                    Purchase access to stream live data from this device. 
                    {device.subscriptionDuration && (
                      <> Each purchase grants access for {Math.floor(device.subscriptionDuration / 86400)} day{Math.floor(device.subscriptionDuration / 86400) !== 1 ? 's' : ''}.</>
                    )}
                  </p>
                </CardHeader>
                <CardContent>
                  {/* Subscription Info */}
                  <div className="p-6 bg-blue-50 rounded-lg border-2 border-primary-blue mb-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="body-base text-gray-700">Subscription Duration</p>
                        <p className="body-base font-semibold text-primary-blue">
                          {device.subscriptionDuration 
                            ? `${Math.floor(device.subscriptionDuration / 86400)} day${Math.floor(device.subscriptionDuration / 86400) !== 1 ? 's' : ''}`
                            : 'Loading...'}
                        </p>
                          </div>
                      <div className="flex items-center justify-between">
                        <p className="body-base text-gray-700">Price</p>
                        <div className="text-right">
                          <p className="heading-md text-primary-blue">
                            {formatEthAmount(device.pricePerDataPoint)}
                          </p>
                        </div>
                            </div>
                      {device.subscriptionDuration && (
                        <div className="pt-3 border-t border-blue-200">
                          <p className="text-xs text-gray-600">
                            * Additional purchases will extend your subscription period from the current expiry date.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {error}
                    </div>
                  )}
                  <Button 
                    onClick={handleSubscribe} 
                    className="w-full gradient-primary" 
                    size="lg"
                    disabled={isPurchasing || !isConnected || !device || !device.subscriptionDuration}
                  >
                    {isPurchasing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing Purchase...
                      </>
                    ) : (
                      'Purchase Access'
                    )}
                  </Button>
                  {!isConnected && (
                    <p className="text-sm text-gray-600 text-center mt-2">
                      Please connect your wallet to subscribe
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  );
}