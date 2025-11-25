'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, Users, Database, Settings, Eye, Pause, Play, Loader2 } from 'lucide-react';
import { DeviceIcon } from '@/components/shared/DeviceIcon';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { useApp } from '@/context/AppContext';
import { formatEthAmount, formatUsdAmount, formatPercentage, formatCount } from '@/lib/formatters';
import { DeviceStatus } from '@/lib/enums';
import { setDeviceActiveOnChain } from '@/services/registryService';
import { createWalletClient, custom } from 'viem';
import { somniaTestnet } from '@/config/wagmi';
import type { Address } from 'viem';
import { parseError, getUserFriendlyMessage } from '@/lib/errors';

export default function DashboardPage() {
  const router = useRouter();
  const { address } = useAccount();
  const { userDevices, isLoadingDevices, updateUserDevice, refreshUserDevices } = useApp();
  const [togglingDevices, setTogglingDevices] = useState<Set<string>>(new Set());

  const getWalletClient = async () => {
    if (!address) {
      throw new Error('Wallet not connected');
    }
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('Wallet not available');
    }
    const provider = (window as any).ethereum;
    
    return createWalletClient({
      account: address as Address,
      chain: somniaTestnet,
      transport: custom(provider),
    });
  };

  const handleToggleDeviceStatus = async (device: typeof userDevices[0]) => {
    if (!address) {
      alert('Please connect your wallet first');
      return;
    }

    const isCurrentlyActive = device.status === DeviceStatus.ONLINE;
    const newStatus = isCurrentlyActive ? DeviceStatus.OFFLINE : DeviceStatus.ONLINE;
    
    setTogglingDevices(prev => new Set(prev).add(device.id));

    try {
      const walletClient = await getWalletClient();
      
      // Update on-chain status
      await setDeviceActiveOnChain(
        walletClient,
        device.deviceAddress as Address,
        newStatus === DeviceStatus.ONLINE
      );

      // Update local state optimistically
      updateUserDevice(device.id, {
        status: newStatus
      });

      // Refresh devices to ensure sync
      await refreshUserDevices();
    } catch (error: any) {
      console.error('Error toggling device status:', error);
      const appError = parseError(error);
      alert(`${getUserFriendlyMessage(appError)}: ${appError.details || appError.message || 'Failed to update device status'}`);
    } finally {
      setTogglingDevices(prev => {
        const next = new Set(prev);
        next.delete(device.id);
        return next;
      });
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="heading-xl">My Devices</h1>
            <Button onClick={() => router.push('/register')} className="gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Device
            </Button>
          </div>

          {/* Devices Grid */}
          {isLoadingDevices ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mx-auto mb-4" />
                <p className="body-base text-gray-600">Loading devices from blockchain...</p>
              </div>
            </div>
          ) : userDevices.length === 0 ? (
            <EmptyState
              icon={Database}
              title="No devices yet"
              description="Register your first device to start earning from your IoT data streams."
              actionLabel="Register Device"
              onAction={() => router.push('/register')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userDevices.map((device) => (
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
                      <div className="flex items-center gap-1 text-warning-yellow">
                        <span>⭐</span>
                        <span className="body-sm font-medium">{formatPercentage(device.qualityScore)}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 py-4 border-t border-b">
                      <div>
                        <div className="flex items-center gap-1 text-gray-600 mb-1">
                          <Database className="w-3 h-3" />
                          <span className="body-sm">Data Points</span>
                        </div>
                        <p className="body-base font-semibold">{formatCount(device.totalDataPoints)}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-gray-600 mb-1">
                          <TrendingUp className="w-3 h-3" />
                          <span className="body-sm">Earnings</span>
                        </div>
                        <p className="body-base font-semibold">{formatEthAmount(device.totalEarnings)}</p>
                        <p className="body-sm text-gray-600">{formatUsdAmount(device.totalEarningsUsd)}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-gray-600 mb-1">
                          <Users className="w-3 h-3" />
                          <span className="body-sm">Subscribers</span>
                        </div>
                        <p className="body-base font-semibold">{device.activeSubscribers}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/stream/${device.id}`)}
                        className="w-full"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/device/${device.id}/settings`)}
                        className="w-full"
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        Settings
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleToggleDeviceStatus(device)}
                        disabled={togglingDevices.has(device.id)}
                      >
                        {togglingDevices.has(device.id) ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            {device.status === DeviceStatus.ONLINE ? 'Pausing...' : 'Resuming...'}
                          </>
                        ) : device.status === DeviceStatus.ONLINE ? (
                          <>
                            <Pause className="w-3 h-3 mr-1" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 mr-1" />
                            Play
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}