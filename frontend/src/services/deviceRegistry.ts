/**
 * Device Registry Service
 * 
 * Handles loading and discovering devices from the Somnia blockchain
 */

import type { Address } from 'viem';
import { readDeviceMetadata, calculateDeviceMetrics } from './deviceService';
import type { UserDevice, MarketplaceDevice } from '@/lib/types';
import type { RegistryDevice } from './registryService';
import { DeviceStatus, DeviceType } from '@/lib/enums';

/**
 * Load user's devices from blockchain registry
 * 
 * Fetches devices owned by the user from the on-chain DeviceRegistry contract
 * and converts them to UserDevice format.
 * 
 * @param ownerAddress - The wallet address of the device owner
 */
export async function loadUserDevicesFromRegistry(
  ownerAddress: Address
): Promise<UserDevice[]> {
  try {
    // Fetch devices from the on-chain registry
    const { fetchDevicesByOwner } = await import('./registryService');
    
    // Add timeout wrapper to prevent hanging
    const timeoutPromise = new Promise<RegistryDevice[]>((_, reject) => 
      setTimeout(() => reject(new Error('Load user devices timeout')), 15000)
    );
    
    const registryDevices = await Promise.race([
      fetchDevicesByOwner(ownerAddress),
      timeoutPromise,
    ]).catch((error) => {
      console.error('Error or timeout fetching user devices from registry:', error);
      return [];
    });
    
    if (registryDevices.length === 0) {
      return [];
    }

    const buildUserDevice = (device: RegistryDevice): UserDevice => {
      return {
        id: `device-${device.address.slice(2, 10)}`,
        name: device.name,
        type: device.deviceType as DeviceType,
        status: device.isActive ? DeviceStatus.ONLINE : DeviceStatus.OFFLINE,
        qualityScore: 0,
        location: device.location,
        totalDataPoints: 0,
        totalEarnings: 0,
        totalEarningsUsd: 0,
        activeSubscribers: 0,
        deviceAddress: device.address,
        ownerAddress: device.owner,
        pricePerDataPoint: device.pricePerDataPoint,
        updateFrequency: 'Unknown',
        uptime: 0,
        lastPublished: new Date(device.registeredAt),
      };
    };

    const devicePromises = registryDevices.map(async (device) => {
      try {
        // Calculate real metrics from Somnia Data Streams with shorter timeout
        const metricsPromise = calculateDeviceMetrics(
          device.owner,
          device.address as Address,
          device.deviceType as DeviceType,
          device.registeredAt
        );
        
        const timeoutPromise = new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Metrics calculation timeout')), 1500)
        );
        
        const metrics = await Promise.race([
          metricsPromise,
          timeoutPromise,
        ]).catch((error) => {
          // Silently return null for timeouts - expected when device has no data
          return null;
        });

        const userDevice = buildUserDevice(device);
        
        if (metrics) {
          userDevice.status = metrics.isActive ? DeviceStatus.ONLINE : DeviceStatus.OFFLINE;
          userDevice.updateFrequency = metrics.updateFrequency;
          userDevice.uptime = metrics.uptime;
          if (metrics.lastPublished) {
            userDevice.lastPublished = metrics.lastPublished;
          }
        }

        return userDevice;
      } catch (error) {
        // Fallback to basic device info
        return buildUserDevice(device);
      }
    });
    
    // Use allSettled so slow/failing devices don't block others
    const results = await Promise.allSettled(devicePromises);
    const devices = results
      .map((result) => result.status === 'fulfilled' ? result.value : null)
      .filter((device): device is UserDevice => device !== null);
    return devices;
  } catch (error) {
    console.error('Error loading user devices from registry:', error);
    return [];
  }
}

/**
 * Load user's devices from blockchain (legacy - uses localStorage addresses)
 * 
 * @deprecated Use loadUserDevicesFromRegistry instead
 * @param ownerAddress - The wallet address of the device owner
 * @param deviceAddresses - Array of device addresses to load metadata for
 */
export async function loadUserDevices(
  ownerAddress: Address,
  deviceAddresses: Address[]
): Promise<UserDevice[]> {
  const devices: UserDevice[] = [];

  for (const deviceAddress of deviceAddresses) {
    try {
      const metadata = await readDeviceMetadata(ownerAddress, deviceAddress);
      
      if (metadata) {
        // Create device object from metadata
        const device: UserDevice = {
          id: `device-${deviceAddress.slice(2, 10)}`,
          name: metadata.deviceName,
          type: metadata.deviceType,
          status: DeviceStatus.ONLINE, // Could check latest data timestamp to determine status
          qualityScore: 0, // Would need to calculate from data quality
          location: metadata.location,
          totalDataPoints: 0, // Would need to track from events
          totalEarnings: 0, // Would need to track from payments
          totalEarningsUsd: 0,
          activeSubscribers: 0, // Would need to track subscriptions
          deviceAddress: deviceAddress,
          ownerAddress: metadata.ownerAddress,
          pricePerDataPoint: metadata.pricePerDataPoint,
          updateFrequency: 'Unknown', // Not stored in metadata
          uptime: 0, // Would need to calculate
          lastPublished: new Date(), // Could check latest data timestamp
        };

        devices.push(device);
      }
    } catch (error) {
      console.error(`Error loading device ${deviceAddress}:`, error);
      // Continue loading other devices
    }
  }

  return devices;
}

/**
 * Get device addresses for a user from localStorage
 * (In production, this would come from a registry contract or database)
 */
export function getUserDeviceAddresses(ownerAddress: Address): Address[] {
  if (typeof window === 'undefined') return [];
  
  const key = `user_devices_${ownerAddress.toLowerCase()}`;
  const stored = localStorage.getItem(key);
  
  if (stored) {
    try {
      return JSON.parse(stored) as Address[];
    } catch (error) {
      console.error('Error parsing stored device addresses:', error);
      return [];
    }
  }
  
  return [];
}

/**
 * Save device address for a user to localStorage
 */
export function saveUserDeviceAddress(ownerAddress: Address, deviceAddress: Address): void {
  if (typeof window === 'undefined') return;
  
  const key = `user_devices_${ownerAddress.toLowerCase()}`;
  const addresses = getUserDeviceAddresses(ownerAddress);
  
  if (!addresses.includes(deviceAddress)) {
    addresses.push(deviceAddress);
    localStorage.setItem(key, JSON.stringify(addresses));
  }
}

/**
 * Discover marketplace devices from on-chain registry
 * 
 * Fetches all registered devices from the DeviceRegistry contract
 * and converts them to MarketplaceDevice format.
 */
export async function discoverMarketplaceDevices(
  limit: number = 50
): Promise<MarketplaceDevice[]> {
  try {
    // Fetch all devices from the on-chain registry
    const { fetchAllRegistryDevices } = await import('./registryService');
    
    // Add timeout wrapper to prevent hanging
    const timeoutPromise = new Promise<RegistryDevice[]>((_, reject) => 
      setTimeout(() => reject(new Error('Discovery timeout')), 15000)
    );
    
    const registryDevices = await Promise.race([
      fetchAllRegistryDevices(),
      timeoutPromise,
    ]).catch((error) => {
      console.error('Error or timeout fetching registry devices:', error);
      return [];
    });
    
    if (registryDevices.length === 0) {
      return [];
    }
    
    const activeDevices = registryDevices.filter(d => d.isActive).slice(0, limit);
    
    const buildFallbackDevice = (device: RegistryDevice): MarketplaceDevice => {
      const now = Date.now();
      const registeredAtMs = device.registeredAt;
      const daysSinceRegistration = Math.floor((now - registeredAtMs) / (1000 * 60 * 60 * 24));
      const uptimePercentage = daysSinceRegistration === 0 
        ? 100 
        : Math.max(0, 100 - (daysSinceRegistration * 5));

      return {
        id: `device-${device.address.slice(2, 10)}`,
        name: device.name,
        type: device.deviceType as DeviceType,
        status: device.isActive ? DeviceStatus.ONLINE : DeviceStatus.OFFLINE,
        qualityScore: 0,
        location: device.location,
        pricePerDataPoint: device.pricePerDataPoint,
        subscriptionDuration: device.subscriptionDuration,
        subscribers: 0,
        owner: device.owner,
        deviceAddress: device.address,
        ownerAddress: device.owner,
        updateFrequency: 'N/A',
        uptime: Math.round(uptimePercentage * 10) / 10,
      };
    };

    const devicePromises = activeDevices.map(async (device) => {
      try {
        // Calculate real metrics from Somnia Data Streams with shorter timeout
        // Wrap in timeout to prevent hanging if device has no data
        const metricsPromise = calculateDeviceMetrics(
          device.owner,
          device.address as Address,
          device.deviceType as DeviceType,
          device.registeredAt
        );
        
        const timeoutPromise = new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Metrics calculation timeout')), 1500)
        );
        
        const metrics = await Promise.race([
          metricsPromise,
          timeoutPromise,
        ]).catch((error) => {
          // Silently return null for timeouts - expected when device has no data
          return null;
        });

        if (!metrics) {
          return buildFallbackDevice(device);
        }

        return {
          id: `device-${device.address.slice(2, 10)}`,
          name: device.name,
          type: device.deviceType as DeviceType,
          status: metrics.isActive ? DeviceStatus.ONLINE : DeviceStatus.OFFLINE,
          qualityScore: 0, // Could calculate from data quality metrics in the future
          location: device.location,
          pricePerDataPoint: device.pricePerDataPoint,
          subscriptionDuration: device.subscriptionDuration,
          subscribers: 0, // Would need to track from purchase events or subgraph
          owner: device.owner,
          deviceAddress: device.address,
          ownerAddress: device.owner,
          updateFrequency: metrics.updateFrequency,
          uptime: metrics.uptime,
        };
      } catch (error) {
        // Silently fallback to basic device info
        return buildFallbackDevice(device);
      }
    });
    
    // Use allSettled so slow/failing devices don't block others
    const results = await Promise.allSettled(devicePromises);
    const devices = results
      .map((result) => result.status === 'fulfilled' ? result.value : null)
      .filter((device): device is MarketplaceDevice => device !== null);
    return devices;
  } catch (error) {
    console.error('Error discovering marketplace devices:', error);
    return [];
  }
}

/**
 * Load marketplace device by address from on-chain registry with calculated metrics
 */
export async function loadMarketplaceDevice(
  ownerAddress: Address,
  deviceAddress: Address
): Promise<MarketplaceDevice | null> {
  try {
    const { fetchAllRegistryDevices } = await import('./registryService');
    const registryDevices = await fetchAllRegistryDevices();
    const device = registryDevices.find(d => d.address.toLowerCase() === deviceAddress.toLowerCase());
    
    if (!device || !device.isActive) {
      return null;
    }

    // Calculate real metrics from Somnia Data Streams
    const metrics = await calculateDeviceMetrics(
      device.owner,
      device.address as Address,
      device.deviceType as DeviceType,
      device.registeredAt
    );

    return {
      id: `device-${deviceAddress.slice(2, 10)}`,
      name: device.name,
      type: device.deviceType as DeviceType,
      status: metrics.isActive ? DeviceStatus.ONLINE : DeviceStatus.OFFLINE,
      qualityScore: 0, // Could calculate from data quality metrics
      location: device.location,
      pricePerDataPoint: device.pricePerDataPoint,
      subscriptionDuration: device.subscriptionDuration,
      subscribers: 0, // Would need to track from purchase events
      owner: device.owner,
      deviceAddress: device.address,
      ownerAddress: device.owner,
      updateFrequency: metrics.updateFrequency,
      uptime: metrics.uptime,
    };
  } catch (error) {
    console.error('Error loading marketplace device:', error);
    return null;
  }
}

