'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAccount } from 'wagmi';
import type { UserDevice, UserSubscription, MarketplaceDevice, DataPoint } from '@/lib/types';
import { loadUserDevicesFromRegistry, getUserDeviceAddresses, saveUserDeviceAddress, discoverMarketplaceDevices } from '@/services/deviceRegistry';
import type { Address } from 'viem';

interface AppContextType {
  userDevices: UserDevice[];
  userSubscriptions: UserSubscription[];
  marketplaceDevices: MarketplaceDevice[];
  liveDataPoints: DataPoint[];
  isLoadingDevices: boolean;
  addUserDevice: (device: UserDevice) => void;
  updateUserDevice: (deviceId: string, updates: Partial<UserDevice>) => void;
  deleteUserDevice: (deviceId: string) => void;
  addUserSubscription: (subscription: UserSubscription) => void;
  updateUserSubscription: (subscriptionId: string, updates: Partial<UserSubscription>) => void;
  cancelUserSubscription: (subscriptionId: string) => void;
  refreshUserDevices: () => Promise<void>;
  refreshMarketplaceDevices: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const [userDevices, setUserDevices] = useState<UserDevice[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<UserSubscription[]>([]);
  const [marketplaceDevices, setMarketplaceDevices] = useState<MarketplaceDevice[]>([]);
  const [liveDataPoints] = useState<DataPoint[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  // Load user devices from blockchain when wallet is connected
  const refreshUserDevices = useCallback(async () => {
    if (!address || !isConnected) {
      setUserDevices([]);
      return;
    }

    setIsLoadingDevices(true);
    try {
      // Load devices from on-chain registry (primary method)
      const devices = await loadUserDevicesFromRegistry(address);
      setUserDevices(devices);
    } catch (error) {
      console.error('Error loading user devices:', error);
      // Keep existing devices on error
      setUserDevices([]);
    } finally {
      setIsLoadingDevices(false);
    }
  }, [address, isConnected]);

  // Load marketplace devices from blockchain
  const refreshMarketplaceDevices = useCallback(async () => {
    setIsLoadingDevices(true);
    try {
      const devices = await discoverMarketplaceDevices(50);
      setMarketplaceDevices(devices || []);
    } catch (error) {
      console.error('Error loading marketplace devices:', error);
      // Set empty array on error to show empty state
      setMarketplaceDevices([]);
    } finally {
      // Always reset loading state, even if there's an error
      setIsLoadingDevices(false);
    }
  }, []);

  // Load devices when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      refreshUserDevices();
    } else {
      setUserDevices([]);
      setUserSubscriptions([]);
    }
  }, [isConnected, address]);

  // Load marketplace devices on mount
  useEffect(() => {
    refreshMarketplaceDevices();
  }, []);

  const addUserDevice = (device: UserDevice) => {
    // Save device address to localStorage
    if (device.ownerAddress && device.deviceAddress) {
      saveUserDeviceAddress(device.ownerAddress as Address, device.deviceAddress as Address);
    }
    
    setUserDevices(prev => {
      // Check if device already exists
      const exists = prev.find(d => d.deviceAddress === device.deviceAddress);
      if (exists) {
        // Update existing device
        return prev.map(d => d.deviceAddress === device.deviceAddress ? device : d);
      }
      // Add new device
      return [...prev, device];
    });

    // Refresh marketplace devices to include the newly registered device
    refreshMarketplaceDevices();
  };

  const updateUserDevice = (deviceId: string, updates: Partial<UserDevice>) => {
    setUserDevices(prev => 
      prev.map(device => device.id === deviceId ? { ...device, ...updates } : device)
    );
  };

  const deleteUserDevice = (deviceId: string) => {
    const device = userDevices.find(d => d.id === deviceId);
    if (device && address) {
      // Remove from localStorage
      const deviceAddresses = getUserDeviceAddresses(address);
      const filtered = deviceAddresses.filter(addr => addr !== device.deviceAddress);
      const key = `user_devices_${address.toLowerCase()}`;
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(filtered));
      }
    }
    
    setUserDevices(prev => prev.filter(device => device.id !== deviceId));
  };

  const addUserSubscription = (subscription: UserSubscription) => {
    setUserSubscriptions(prev => [...prev, subscription]);
  };

  const updateUserSubscription = (subscriptionId: string, updates: Partial<UserSubscription>) => {
    setUserSubscriptions(prev =>
      prev.map(sub => sub.id === subscriptionId ? { ...sub, ...updates } : sub)
    );
  };

  const cancelUserSubscription = (subscriptionId: string) => {
    setUserSubscriptions(prev => prev.filter(sub => sub.id !== subscriptionId));
  };

  return (
    <AppContext.Provider
      value={{
        userDevices,
        userSubscriptions,
        marketplaceDevices,
        liveDataPoints,
        isLoadingDevices,
        addUserDevice,
        updateUserDevice,
        deleteUserDevice,
        addUserSubscription,
        updateUserSubscription,
        cancelUserSubscription,
        refreshUserDevices,
        refreshMarketplaceDevices,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}