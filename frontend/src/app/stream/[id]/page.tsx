'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, MapPin, TrendingUp, Table as TableIcon, AlertCircle, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useApp } from '@/context/AppContext';
import { ViewMode, TimeRange } from '@/lib/enums';
import { formatDateTime, formatRelativeTime } from '@/lib/formatters';
import { readDeviceData } from '@/services/deviceService';
import type { DataPoint } from '@/lib/types';

export default function LiveDashboardPage({ params }: { params: { id: string } }) {
  const { marketplaceDevices, userDevices } = useApp();
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.CHART);
  const [timeRange, setTimeRange] = useState<TimeRange>(TimeRange.ONE_HOUR);
  const [liveData, setLiveData] = useState<DataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const device = [...marketplaceDevices, ...userDevices].find(d => d.id === params.id);

  // Read data from Somnia stream
  const fetchDeviceData = async () => {
    if (!device) return;

    try {
      setIsLoading(true);
      setError(null);
      
      // Read data from the device owner's stream
      // Use ownerAddress as publisher, deviceAddress as identifier
      const ownerAddress = (device.ownerAddress || device.deviceAddress) as `0x${string}`;
      const deviceAddress = device.deviceAddress as `0x${string}`;
      const dataPoint = await readDeviceData(ownerAddress, deviceAddress, device.type);
      
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
      } else {
        setError('No data available for this device');
      }
    } catch (err: any) {
      console.error('Error fetching device data:', err);
      setError(err?.message || 'Failed to fetch device data');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch and periodic updates
  useEffect(() => {
    if (!device) return;

    // Fetch immediately
    fetchDeviceData();

    // Poll for updates every 5 seconds
    const interval = setInterval(() => {
      fetchDeviceData();
    }, 5000);

    return () => clearInterval(interval);
  }, [device?.id, device?.deviceAddress]);

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
  }, [device]);

  if (!device) {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-24 pb-12 px-6">
          <div className="max-w-7xl mx-auto text-center">
            <p className="body-lg text-gray-600">Device not found</p>
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
    let content: string;
    let filename: string;

    if (format === 'CSV') {
      content = 'Timestamp,Value,Status\n' + 
        liveData.map(p => `${p.timestamp.toISOString()},${p.value},${p.status}`).join('\n');
      filename = `device-${params.id}-data.csv`;
    } else {
      content = JSON.stringify(liveData, null, 2);
      filename = `device-${params.id}-data.json`;
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
                      <div className="h-96">
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