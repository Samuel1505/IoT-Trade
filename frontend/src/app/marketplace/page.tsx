'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Search, Users, Eye, ShoppingCart, RefreshCw } from 'lucide-react';
import { DeviceIcon } from '@/components/shared/DeviceIcon';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useApp } from '@/context/AppContext';
import { DeviceType, SortOption } from '@/lib/enums';
import { formatEthAmount, formatPercentage } from '@/lib/formatters';

export default function MarketplacePage() {
  const router = useRouter();
  const { marketplaceDevices, isLoadingDevices, refreshMarketplaceDevices } = useApp();
  const [search, setSearch] = useState('');
  const [deviceType, setDeviceType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>(SortOption.QUALITY_SCORE);
  const [priceRange, setPriceRange] = useState([0, 100]);
  const [qualityScore, setQualityScore] = useState([0]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refresh marketplace on mount
  useEffect(() => {
    refreshMarketplaceDevices();
  }, [refreshMarketplaceDevices]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshMarketplaceDevices();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter and sort devices
  const filteredDevices = marketplaceDevices
    .filter(device => {
      if (search && !device.name.toLowerCase().includes(search.toLowerCase()) && 
          !device.location.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (deviceType !== 'all' && device.type !== deviceType) {
        return false;
      }
      if (device.qualityScore < qualityScore[0]) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case SortOption.QUALITY_SCORE:
          return b.qualityScore - a.qualityScore;
        case SortOption.PRICE:
          return a.pricePerDataPoint - b.pricePerDataPoint;
        case SortOption.SUBSCRIBERS:
          return b.subscribers - a.subscribers;
        default:
          return 0;
      }
    });

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="heading-xl mb-2">Marketplace</h1>
              <p className="body-lg text-gray-600">Browse and subscribe to IoT data streams</p>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoadingDevices}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Filter Bar */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search devices..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Device Type */}
                <Select value={deviceType} onValueChange={setDeviceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Device Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value={DeviceType.GPS_TRACKER}>GPS Tracker</SelectItem>
                    <SelectItem value={DeviceType.WEATHER_STATION}>Weather Station</SelectItem>
                    <SelectItem value={DeviceType.AIR_QUALITY_MONITOR}>Air Quality Monitor</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SortOption.QUALITY_SCORE}>Quality Score</SelectItem>
                    <SelectItem value={SortOption.PRICE}>Price</SelectItem>
                    <SelectItem value={SortOption.SUBSCRIBERS}>Subscribers</SelectItem>
                  </SelectContent>
                </Select>

                {/* Quality Score Filter */}
                <div className="space-y-2">
                  <label className="body-sm text-gray-600">Min Quality: {qualityScore[0]}%</label>
                  <Slider
                    value={qualityScore}
                    onValueChange={setQualityScore}
                    max={100}
                    step={1}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Devices Grid */}
          {isLoadingDevices ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mx-auto mb-4" />
                <p className="body-base text-gray-600">Loading marketplace devices...</p>
              </div>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDevices.map((device) => (
              <Card key={device.id} className="card-hover">
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                        <DeviceIcon type={device.type} size={24} className="text-primary-blue" />
                      </div>
                      <div>
                        <CardTitle className="body-lg font-semibold">{device.name}</CardTitle>
                        <p className="body-sm text-gray-600">{device.location}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={device.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats */}
                  <div className="flex items-center justify-between py-3 border-t border-b">
                    <div className="flex items-center gap-1 text-warning-yellow">
                      <span>⭐</span>
                      <span className="body-sm font-medium">{formatPercentage(device.qualityScore)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Users className="w-4 h-4" />
                      <span className="body-sm">{device.subscribers} subscribers</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div>
                    <p className="body-sm text-gray-600 mb-1">Price per data point</p>
                    <p className="heading-md text-primary-blue">{formatEthAmount(device.pricePerDataPoint)}</p>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/device/${device.id}`)}
                      className="w-full"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      onClick={() => router.push(`/device/${device.id}?tab=subscribe`)}
                      className="w-full gradient-primary"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Subscribe
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          )}

          {!isLoadingDevices && filteredDevices.length === 0 && (
            <div className="text-center py-12">
              <p className="body-lg text-gray-600">
                {marketplaceDevices.length === 0 
                  ? 'No devices available in the marketplace yet. Be the first to register a device!'
                  : 'No devices found matching your filters'}
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}