/**
 * Device Registry Service
 * 
 * Handles loading and discovering devices from the Somnia blockchain
 */

import type { Address } from 'viem';
import { readDeviceMetadata } from './deviceService';
import type { UserDevice, MarketplaceDevice } from '@/lib/types';
import { DeviceStatus, DeviceType } from '@/lib/enums';

/**
 * Load user's devices from blockchain
 * 
 * Note: Since Somnia Data Streams doesn't have a built-in registry,
 * we need to track device addresses. For now, we'll use localStorage
 * or later implement a device registry contract.
 * 
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
    const registryDevices = await fetchAllRegistryDevices();
    
    if (registryDevices.length === 0) {
      return [];
    }
    
    // Convert RegistryDevice to MarketplaceDevice format
    const now = Date.now();
    const devices: MarketplaceDevice[] = registryDevices
      .filter(device => device.isActive) // Only show active devices
      .slice(0, limit)
      .map(device => {
        // Calculate uptime: time since registration as a percentage
        // For now, show days since registration (could be enhanced with actual uptime tracking)
        const registeredAtMs = device.registeredAt;
        const daysSinceRegistration = Math.floor((now - registeredAtMs) / (1000 * 60 * 60 * 24));
        const hoursSinceRegistration = (now - registeredAtMs) / (1000 * 60 * 60);
        
        // Uptime percentage: 100% if registered recently (within 24h), decreases over time
        // This is a simplified calculation - real uptime would track actual online/offline periods
        const uptimePercentage = daysSinceRegistration === 0 
          ? 100 
          : Math.max(0, 100 - (daysSinceRegistration * 5)); // Decrease 5% per day as placeholder
        
        return {
          id: `device-${device.address.slice(2, 10)}`,
          name: device.name,
          type: device.deviceType as DeviceType,
          status: device.isActive ? DeviceStatus.ONLINE : DeviceStatus.OFFLINE,
          qualityScore: 0, // Could calculate from data quality metrics in the future
          location: device.location,
          pricePerDataPoint: device.pricePerDataPoint,
          subscribers: 0, // Would need to track from purchase events or subgraph
          owner: device.owner,
          updateFrequency: 'Calculating...', // Would need to fetch recent data points to calculate
          uptime: Math.round(uptimePercentage * 10) / 10, // Round to 1 decimal
        };
      });
    
    return devices;
  } catch (error) {
    console.error('Error discovering marketplace devices:', error);
    return [];
  }
}

/**
 * Load marketplace device by address from on-chain registry
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

    return {
      id: `device-${deviceAddress.slice(2, 10)}`,
      name: device.name,
      type: device.deviceType as DeviceType,
      status: device.isActive ? DeviceStatus.ONLINE : DeviceStatus.OFFLINE,
      qualityScore: 0, // Could calculate from data quality metrics
      location: device.location,
      pricePerDataPoint: device.pricePerDataPoint,
      subscribers: 0, // Would need to track from purchase events
      owner: device.owner,
      updateFrequency: 'Unknown',
      uptime: 0,
    };
  } catch (error) {
    console.error('Error loading marketplace device:', error);
    return null;
  }
}

