'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { SubscriptionDuration, DeviceType, DeviceStatus } from '@/lib/enums';
import type { MarketplaceDevice } from '@/lib/types';
import type { Address } from 'viem';

export default function DevicePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { marketplaceDevices, addUserSubscription, refreshMarketplaceDevices } = useApp();
  const [selectedDuration, setSelectedDuration] = useState(SubscriptionDuration.SEVEN_DAYS);
  const [device, setDevice] = useState<MarketplaceDevice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const defaultTab = searchParams.get('tab') || 'preview';

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
                subscribers: 0,
                owner: registryDevice.owner,
                deviceAddress: registryDevice.address,
                ownerAddress: registryDevice.owner,
                updateFrequency: metrics.updateFrequency,
                uptime: metrics.uptime,
              };
            }
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

  const handleSubscribe = () => {
    const pricing = selectedDuration === SubscriptionDuration.ONE_DAY ? mockQuery.subscriptionPricing.oneDay :
                    selectedDuration === SubscriptionDuration.SEVEN_DAYS ? mockQuery.subscriptionPricing.sevenDays :
                    mockQuery.subscriptionPricing.thirtyDays;

    const days = selectedDuration === SubscriptionDuration.ONE_DAY ? 1 :
                 selectedDuration === SubscriptionDuration.SEVEN_DAYS ? 7 : 30;

    const newSubscription = {
      id: `sub-${Date.now()}`,
      deviceId: device.id,
      deviceName: device.name,
      deviceType: device.type,
      deviceOwner: device.owner,
      status: 'Active' as const,
      startDate: new Date(),
      endDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      daysRemaining: days,
      remainingBalance: pricing.priceEth,
      dataPointsConsumed: 0,
      autoRenewal: false
    };

    addUserSubscription(newSubscription);
    router.push(`/stream/${device.id}`);
  };

  const getPricing = () => {
    return selectedDuration === SubscriptionDuration.ONE_DAY ? mockQuery.subscriptionPricing.oneDay :
           selectedDuration === SubscriptionDuration.SEVEN_DAYS ? mockQuery.subscriptionPricing.sevenDays :
           mockQuery.subscriptionPricing.thirtyDays;
  };

  const pricing = getPricing();

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
                  <CardTitle>Choose Subscription Duration</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={selectedDuration} onValueChange={(value) => setSelectedDuration(value as SubscriptionDuration)}>
                    <div className="space-y-3">
                      {/* 1 Day */}
                      <label className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedDuration === SubscriptionDuration.ONE_DAY ? 'border-primary-blue bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value={SubscriptionDuration.ONE_DAY} />
                          <div>
                            <p className="body-base font-semibold">1 Day</p>
                            <p className="body-sm text-gray-600">~{mockQuery.subscriptionPricing.oneDay.estimatedDataPoints.toLocaleString()} data points</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="body-base font-semibold">{formatEthAmount(mockQuery.subscriptionPricing.oneDay.priceEth)}</p>
                          <p className="body-sm text-gray-600">{formatUsdAmount(mockQuery.subscriptionPricing.oneDay.priceUsd)}</p>
                        </div>
                      </label>

                      {/* 7 Days */}
                      <label className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedDuration === SubscriptionDuration.SEVEN_DAYS ? 'border-primary-blue bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value={SubscriptionDuration.SEVEN_DAYS} />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="body-base font-semibold">7 Days</p>
                              <Badge className="bg-primary-blue text-white">Most Popular</Badge>
                            </div>
                            <p className="body-sm text-gray-600">~{mockQuery.subscriptionPricing.sevenDays.estimatedDataPoints.toLocaleString()} data points</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="body-base font-semibold">{formatEthAmount(mockQuery.subscriptionPricing.sevenDays.priceEth)}</p>
                          <p className="body-sm text-gray-600">{formatUsdAmount(mockQuery.subscriptionPricing.sevenDays.priceUsd)}</p>
                        </div>
                      </label>

                      {/* 30 Days */}
                      <label className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedDuration === SubscriptionDuration.THIRTY_DAYS ? 'border-primary-blue bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value={SubscriptionDuration.THIRTY_DAYS} />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="body-base font-semibold">30 Days</p>
                              <Badge className="bg-success-green text-white">Best Value</Badge>
                            </div>
                            <p className="body-sm text-gray-600">~{mockQuery.subscriptionPricing.thirtyDays.estimatedDataPoints.toLocaleString()} data points</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="body-base font-semibold">{formatEthAmount(mockQuery.subscriptionPricing.thirtyDays.priceEth)}</p>
                          <p className="body-sm text-gray-600">{formatUsdAmount(mockQuery.subscriptionPricing.thirtyDays.priceUsd)}</p>
                        </div>
                      </label>
                    </div>
                  </RadioGroup>

                  {/* Total Cost */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="body-base text-gray-600">Estimated Data Points</p>
                      <p className="body-base font-semibold">{pricing.estimatedDataPoints.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="body-lg font-semibold">Total Cost</p>
                      <div className="text-right">
                        <p className="heading-md text-primary-blue">{formatEthAmount(pricing.priceEth)}</p>
                        <p className="body-sm text-gray-600">{formatUsdAmount(pricing.priceUsd)}</p>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleSubscribe} className="w-full mt-6 gradient-primary" size="lg">
                    Subscribe Now
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  );
}