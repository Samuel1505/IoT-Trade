'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, MapPin, TrendingUp, Table as TableIcon, AlertCircle, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useApp } from '@/context/AppContext';
import { ViewMode, TimeRange, DeviceType, DeviceStatus } from '@/lib/enums';
import { formatDateTime, formatRelativeTime } from '@/lib/formatters';
import { readDeviceData } from '@/services/deviceService';
import { parseError, getUserFriendlyMessage } from '@/lib/errors';
import type { DataPoint, MarketplaceDevice, UserDevice } from '@/lib/types';
import type { Address } from 'viem';

export default function LiveDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { marketplaceDevices, userDevices, refreshMarketplaceDevices } = useApp();
  const [device, setDevice] = useState<(MarketplaceDevice | UserDevice) | null>(null);
  const [isLoadingDevice, setIsLoadingDevice] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.CHART);
  const [timeRange, setTimeRange] = useState<TimeRange>(TimeRange.ONE_HOUR);
  const [liveData, setLiveData] = useState<DataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const deviceLoadedRef = useRef(false);
  const [chartMounted, setChartMounted] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Load device by ID - only run once per id
  useEffect(() => {
    // Prevent re-loading if device is already loaded for this id
    if (deviceLoadedRef.current && device?.id === id && device?.deviceAddress) {
      return;
    }

    let cancelled = false;
    let loadingStarted = false;

    const loadDevice = async () => {
      // Prevent multiple concurrent loads
      if (loadingStarted) return;
      loadingStarted = true;

      setIsLoadingDevice(true);
      setError(null);
      
      try {
        // First try to find in existing devices
        let foundDevice = [...marketplaceDevices, ...userDevices].find(d => d.id === id && d.deviceAddress);
        
        // If not found, try loading directly from registry (skip refresh to avoid blinking)
        if (!foundDevice) {
          const { fetchAllRegistryDevices } = await import('@/services/registryService');
          const { calculateDeviceMetrics } = await import('@/services/deviceService');
          const allDevices = await fetchAllRegistryDevices();
          
          const registryDevice = allDevices.find(d => {
            const deviceId = `device-${d.address.slice(2, 10)}`;
            return deviceId === id;
          });
          
          if (registryDevice && registryDevice.isActive && registryDevice.address) {
            const metrics = await calculateDeviceMetrics(
              registryDevice.owner,
              registryDevice.address as Address,
              registryDevice.deviceType as DeviceType,
              registryDevice.registeredAt
            );
            
            // Convert to MarketplaceDevice format
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
              updateFrequency: metrics.updateFrequency,
              uptime: metrics.uptime,
              deviceAddress: registryDevice.address,
              ownerAddress: registryDevice.owner,
            } as MarketplaceDevice;
          }
        }
        
        if (cancelled) return;
        
        if (foundDevice && foundDevice.deviceAddress) {
          // Only update if device changed to prevent unnecessary re-renders
          setDevice(prev => {
            if (prev?.id === foundDevice?.id && prev?.deviceAddress === foundDevice?.deviceAddress) {
              return prev;
            }
            return foundDevice;
          });
          deviceLoadedRef.current = true;
        } else {
          setError('Device not found or invalid');
          setIsLoadingDevice(false);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Error loading device:', err);
        setError('Failed to load device');
      } finally {
        if (!cancelled) {
          setIsLoadingDevice(false);
          loadingStarted = false;
        }
      }
    };

    // Reset ref when id changes
    if (device?.id !== id) {
      deviceLoadedRef.current = false;
      loadingStarted = false;
    }

    loadDevice();

    return () => {
      cancelled = true;
      loadingStarted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Read data from Somnia stream
  const fetchDeviceData = async () => {
    if (!device) return;

    // Validate device addresses
    const deviceAddress = device.deviceAddress;
    const ownerAddress = (device.ownerAddress || device.deviceAddress);
    
    if (!deviceAddress || typeof deviceAddress !== 'string' || !deviceAddress.startsWith('0x')) {
      console.error('Invalid device address:', deviceAddress);
      if (liveData.length === 0) {
        setError('Invalid device address. Device may not be properly registered.');
      }
      return;
    }

    if (!ownerAddress || typeof ownerAddress !== 'string' || !ownerAddress.startsWith('0x')) {
      console.error('Invalid owner address:', ownerAddress);
      if (liveData.length === 0) {
        setError('Invalid owner address. Device may not be properly registered.');
      }
      return;
    }

    try {
      // Only set loading on initial fetch, not on subsequent polls
      if (liveData.length === 0) {
        setIsLoading(true);
      }
      
      // Read data from the device owner's stream
      const dataPoint = await readDeviceData(
        ownerAddress as `0x${string}`, 
        deviceAddress as `0x${string}`, 
        device.type
      );
      
      if (dataPoint) {
        // Update live data (keep last 20 points)
        setLiveData(prev => {
          const existing = prev.find(p => 
            p.timestamp.getTime() === dataPoint.timestamp.getTime()
          );
          
          if (existing) {
            return prev; // Don't add duplicate
          }
          
          return [...prev, dataPoint].slice(-20);
        });
        setLastUpdate(new Date());
        setError(null); // Clear error on successful data fetch
      } else if (liveData.length === 0) {
        // Only show error if we have no data at all
        setError('No data available for this device. The device may not have published any data yet.');
      }
    } catch (err: any) {
      console.error('Error fetching device data:', err);
      // Only show error on initial fetch, not on polling errors
      if (liveData.length === 0) {
        const appError = parseError(err);
        const errorMessage = appError.details || appError.message || 'Failed to fetch device data';
        setError(`${getUserFriendlyMessage(appError)}: ${errorMessage}`);
      }
    } finally {
      if (liveData.length === 0) {
        setIsLoading(false);
      }
    }
  };

  // Initial fetch and periodic updates
  useEffect(() => {
    if (!device || !device.deviceAddress) return;

    // Fetch immediately
    fetchDeviceData();

    // Poll for updates every 5 seconds
    const interval = setInterval(() => {
      if (device && device.deviceAddress) {
        fetchDeviceData();
      }
    }, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device?.id]);

  // For devices without data, show mock data fallback
  useEffect(() => {
    if (!device || liveData.length > 0) return;
    
    // Show mock data if no real data is available
    const mockPoint: DataPoint = {
      timestamp: new Date(),
      value: device.type === 'GPS Tracker' ? 37.7749 : device.type === 'Weather Station' ? 72.5 : 45.2,
      status: 'pending',
      latitude: device.type === 'GPS Tracker' ? 37.7749 : undefined,
      longitude: device.type === 'GPS Tracker' ? -122.4194 : undefined,
    };
    
    setLiveData([mockPoint]);
  }, [device, liveData.length]);

  // Mount chart only when chart tab is active and container is ready
  useEffect(() => {
    if (viewMode === ViewMode.CHART && chartContainerRef.current) {
      // Small delay to ensure container has dimensions
      const timer = setTimeout(() => {
        if (chartContainerRef.current) {
          const rect = chartContainerRef.current.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            setChartMounted(true);
          }
        }
      }, 100);
      return () => {
        clearTimeout(timer);
        setChartMounted(false);
      };
    } else {
      setChartMounted(false);
    }
  }, [viewMode, liveData.length]);

  // Show loading state while loading device
  if (isLoadingDevice) {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-24 pb-12 px-6">
          <div className="max-w-7xl mx-auto text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-blue" />
            <p className="body-lg text-gray-600">Loading device...</p>
          </div>
        </main>
      </>
    );
  }

  // Show error if device not found
  if (!device || error) {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-24 pb-12 px-6">
          <div className="max-w-7xl mx-auto text-center py-12">
            <p className="body-lg text-gray-600 mb-4">{error || 'Device not found'}</p>
            <Button onClick={() => router.push('/marketplace')} variant="outline">
              Back to Marketplace
            </Button>
          </div>
        </main>
      </>
    );
  }

  const latestPoint = liveData[liveData.length - 1];
  const chartData = liveData.map(point => ({
    time: point.timestamp.toLocaleTimeString(),
    value: point.value
  }));

  // Show loading state
  if (isLoading && liveData.length === 0) {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-24 pb-12 px-6">
          <div className="max-w-7xl mx-auto">
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-blue mx-auto mb-4" />
                  <p className="body-base text-gray-600">Loading device data from blockchain...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </>
    );
  }

  // Show error state
  if (error && liveData.length === 0) {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-24 pb-12 px-6">
          <div className="max-w-7xl mx-auto">
            <Card>
              <CardContent className="py-16">
                <Alert className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">
                    {error}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </main>
      </>
    );
  }

  const handleExport = (format: 'CSV' | 'JSON') => {
    if (!device) return;
    
    let content: string;
    let filename: string;

    if (format === 'CSV') {
      content = 'Timestamp,Value,Status\n' + 
        liveData.map(p => `${p.timestamp.toISOString()},${p.value},${p.status}`).join('\n');
      filename = `device-${device.id}-data.csv`;
    } else {
      content = JSON.stringify(liveData, null, 2);
      filename = `device-${device.id}-data.json`;
    }

    const blob = new Blob([content], { type: format === 'CSV' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Current Reading Card */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="body-sm text-gray-600 mb-1">Current Reading</p>
                  <p className="heading-xl text-primary-blue">
                    {latestPoint ? latestPoint.value.toFixed(2) : 'N/A'}
                  </p>
                  <p className="body-sm text-gray-600 mt-1">
                    {latestPoint ? (
                      <>Last updated: {formatRelativeTime(latestPoint.timestamp)}</>
                    ) : (
                      <>No data available</>
                    )}
                  </p>
                  {device.deviceAddress && (
                    <p className="body-xs text-gray-500 mt-1 font-mono">
                      Device: {device.deviceAddress.slice(0, 10)}...{device.deviceAddress.slice(-8)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-primary-blue" />
                      <span className="body-base font-semibold text-primary-blue">LOADING</span>
                    </>
                  ) : latestPoint ? (
                    <>
                      <div className="w-3 h-3 rounded-full bg-success-green animate-pulse" />
                      <span className="body-base font-semibold text-success-green">LIVE</span>
                    </>
                  ) : (
                    <>
                      <div className="w-3 h-3 rounded-full bg-gray-400" />
                      <span className="body-base font-semibold text-gray-600">OFFLINE</span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* View Tabs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Data Stream</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('CSV')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('JSON')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export JSON
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value={ViewMode.MAP}>
                    <MapPin className="w-4 h-4 mr-2" />
                    Map View
                  </TabsTrigger>
                  <TabsTrigger value={ViewMode.CHART}>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Chart View
                  </TabsTrigger>
                  <TabsTrigger value={ViewMode.TABLE}>
                    <TableIcon className="w-4 h-4 mr-2" />
                    Table View
                  </TabsTrigger>
                </TabsList>

                {/* Map View */}
                <TabsContent value={ViewMode.MAP}>
                  <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="body-base text-gray-600">Map view for GPS devices</p>
                      <p className="body-sm text-gray-500 mt-1">
                        Current position: {latestPoint.latitude?.toFixed(4)}, {latestPoint.longitude?.toFixed(4)}
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* Chart View */}
                <TabsContent value={ViewMode.CHART}>
                  {liveData.length === 0 ? (
                    <div className="h-96 flex items-center justify-center">
                      <div className="text-center">
                        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="body-base text-gray-600">No data points available</p>
                        <p className="body-sm text-gray-500 mt-1">
                          Chart will appear here when data is available
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 flex gap-2">
                        {[TimeRange.ONE_HOUR, TimeRange.SIX_HOURS, TimeRange.TWENTY_FOUR_HOURS, TimeRange.SEVEN_DAYS].map((range) => (
                          <Button
                            key={range}
                            variant={timeRange === range ? "default" : "outline"}
                            size="sm"
                            onClick={() => setTimeRange(range)}
                          >
                            {range}
                          </Button>
                        ))}
                      </div>
                      <div 
                        ref={chartContainerRef}
                        className="h-96 w-full"
                        style={{ minWidth: 0, minHeight: 384 }}
                      >
                        {chartMounted && chartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                              <XAxis 
                                dataKey="time" 
                                stroke="#6B7280"
                                style={{ fontSize: '12px' }}
                              />
                              <YAxis 
                                stroke="#6B7280"
                                style={{ fontSize: '12px' }}
                              />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: '#fff',
                                  border: '1px solid #E5E7EB',
                                  borderRadius: '8px'
                                }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#0066FF" 
                                strokeWidth={2}
                                dot={{ fill: '#0066FF', r: 3 }}
                                activeDot={{ r: 5 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-primary-blue" />
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* Table View */}
                <TabsContent value={ViewMode.TABLE}>
                  {liveData.length === 0 ? (
                    <div className="h-96 flex items-center justify-center">
                      <div className="text-center">
                        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="body-base text-gray-600">No data points available</p>
                        <p className="body-sm text-gray-500 mt-1">
                          Data will appear here when the device publishes to the blockchain
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Status</TableHead>
                            {device.type === 'GPS Tracker' && (
                              <>
                                <TableHead>Latitude</TableHead>
                                <TableHead>Longitude</TableHead>
                              </>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...liveData].reverse().map((point, index) => (
                            <TableRow key={index} className="animate-in fade-in duration-300">
                              <TableCell className="font-mono text-sm">
                                {formatDateTime(point.timestamp)}
                              </TableCell>
                              <TableCell className="font-semibold text-primary-blue">
                                {point.value.toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center gap-1 text-sm ${
                                  point.status === 'verified' ? 'text-success-green' : 
                                  point.status === 'pending' ? 'text-warning-yellow' : 
                                  'text-red-600'
                                }`}>
                                  <span className={`w-2 h-2 rounded-full ${
                                    point.status === 'verified' ? 'bg-success-green' : 
                                    point.status === 'pending' ? 'bg-warning-yellow' : 
                                    'bg-red-600'
                                  }`} />
                                  {point.status}
                                </span>
                              </TableCell>
                              {device.type === 'GPS Tracker' && (
                                <>
                                  <TableCell className="font-mono text-sm">
                                    {point.latitude?.toFixed(6) || 'N/A'}
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">
                                    {point.longitude?.toFixed(6) || 'N/A'}
                                  </TableCell>
                                </>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}