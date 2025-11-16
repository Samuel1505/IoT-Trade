/**
 * Device Registry Service
 * 
 * Handles loading and discovering devices from the Somnia blockchain
 */

import type { Address } from 'viem';
import { readDeviceMetadata, calculateDeviceMetrics } from './deviceService';
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
    
    // Convert RegistryDevice to MarketplaceDevice format with real metrics
    const devices: MarketplaceDevice[] = [];
    
    for (const device of registryDevices.filter(d => d.isActive).slice(0, limit)) {
      try {
        // Calculate real metrics from Somnia Data Streams
        // Wrap in timeout to prevent hanging if device has no data
        const metrics = await Promise.race([
          calculateDeviceMetrics(
            device.owner,
            device.address as Address,
            device.deviceType as DeviceType,
            device.registeredAt
          ),
          new Promise<typeof import('./deviceService').calculateDeviceMetrics extends (...args: any[]) => Promise<infer R> ? R : never>((_, reject) => 
            setTimeout(() => reject(new Error('Metrics calculation timeout')), 10000)
          ),
        ]).catch((error) => {
          // If metrics calculation fails, return fallback
          console.warn(`Metrics calculation failed for device ${device.address}:`, error?.message || error);
          return null;
        });

        if (!metrics) {
          // Use fallback metrics if calculation failed
          const now = Date.now();
          const registeredAtMs = device.registeredAt;
          const daysSinceRegistration = Math.floor((now - registeredAtMs) / (1000 * 60 * 60 * 24));
          const uptimePercentage = daysSinceRegistration === 0 
            ? 100 
            : Math.max(0, 100 - (daysSinceRegistration * 5));
          
          devices.push({
            id: `device-${device.address.slice(2, 10)}`,
            name: device.name,
            type: device.deviceType as DeviceType,
            status: device.isActive ? DeviceStatus.ONLINE : DeviceStatus.OFFLINE,
            qualityScore: 0,
            location: device.location,
            pricePerDataPoint: device.pricePerDataPoint,
            subscribers: 0,
            owner: device.owner,
            updateFrequency: 'N/A',
            uptime: Math.round(uptimePercentage * 10) / 10,
          });
        } else {
          devices.push({
            id: `device-${device.address.slice(2, 10)}`,
            name: device.name,
            type: device.deviceType as DeviceType,
            status: metrics.isActive ? DeviceStatus.ONLINE : DeviceStatus.OFFLINE,
            qualityScore: 0, // Could calculate from data quality metrics in the future
            location: device.location,
            pricePerDataPoint: device.pricePerDataPoint,
            subscribers: 0, // Would need to track from purchase events or subgraph
            owner: device.owner,
            updateFrequency: metrics.updateFrequency,
            uptime: metrics.uptime,
          });
        }
      } catch (error) {
        // Silently continue - use fallback metrics
        console.warn(`Error processing device ${device.address}:`, error);
        // Fallback to basic metrics if calculation fails
        const now = Date.now();
        const registeredAtMs = device.registeredAt;
        const daysSinceRegistration = Math.floor((now - registeredAtMs) / (1000 * 60 * 60 * 24));
        const uptimePercentage = daysSinceRegistration === 0 
          ? 100 
          : Math.max(0, 100 - (daysSinceRegistration * 5));
        
        devices.push({
          id: `device-${device.address.slice(2, 10)}`,
          name: device.name,
          type: device.deviceType as DeviceType,
          status: device.isActive ? DeviceStatus.ONLINE : DeviceStatus.OFFLINE,
          qualityScore: 0,
          location: device.location,
          pricePerDataPoint: device.pricePerDataPoint,
          subscribers: 0,
          owner: device.owner,
          updateFrequency: 'N/A',
          uptime: Math.round(uptimePercentage * 10) / 10,
        });
      }
    }
    
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
      subscribers: 0, // Would need to track from purchase events
      owner: device.owner,
      updateFrequency: metrics.updateFrequency,
      uptime: metrics.uptime,
    };
  } catch (error) {
    console.error('Error loading marketplace device:', error);
    return null;
  }
}

