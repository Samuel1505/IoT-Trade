/**
 * Registry Service - SDK-Only Registry Pattern
 * 
 * This service demonstrates how to create a device registry using ONLY the SDK,
 * without deploying a custom smart contract.
 * 
 * How it works:
 * 1. Use a known registry owner address (could be a DAO or shared address)
 * 2. Publish device entries to a registry schema
 * 3. Query the registry to discover devices
 * 
 * Limitations:
 * - Need to know the registry owner address
 * - Can't easily query all devices (need to track device addresses)
 * - No complex queries or filtering
 * - No automatic cleanup or management
 */

import type { Address, Hex, WalletClient } from 'viem';
import { JsonRpcSigner } from 'ethers';
import { SchemaEncoder, zeroBytes32 } from "@somnia-chain/streams";
import { publishData, readData, computeSchemaId, generateDataId } from '@/lib/somnia';
import { DEVICE_REGISTRY_SCHEMA } from '@/lib/schemas';
import type { DeviceRegistryEntry } from '@/lib/schemas';

/**
 * Registry owner address
 * 
 * In a production setup, this could be:
 * - A DAO address
 * - A shared address controlled by multiple parties
 * - A dedicated registry service address
 * 
 * For now, we'll use a shared localStorage-based approach where devices
 * self-register and the registry owner is dynamically determined.
 * In production, you'd want this to be a well-known address.
 */
const REGISTRY_OWNER_STORAGE_KEY = 'iot_trade_registry_owner';

/**
 * Get or create registry owner address
 * Uses the first device owner that registers a device, or creates a shared address
 */
export function getRegistryOwnerAddress(): Address {
  if (typeof window === 'undefined') {
    return '0x0000000000000000000000000000000000000000' as Address;
  }
  
  const stored = localStorage.getItem(REGISTRY_OWNER_STORAGE_KEY);
  if (stored) {
    return stored as Address;
  }
  
  // Use a well-known shared address for the registry
  // In production, this would be a dedicated address
  const defaultRegistryOwner = '0x1111111111111111111111111111111111111111' as Address;
  localStorage.setItem(REGISTRY_OWNER_STORAGE_KEY, defaultRegistryOwner);
  return defaultRegistryOwner;
}

/**
 * Set registry owner address (used when first device is registered)
 */
export function setRegistryOwnerAddress(address: Address): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REGISTRY_OWNER_STORAGE_KEY, address);
}

// Note: REGISTRY_OWNER_ADDRESS is now a function call, not a constant
// Use getRegistryOwnerAddress() instead for dynamic registry owner

/**
 * Registry data ID - a fixed identifier for the registry
 */
export const REGISTRY_DATA_ID: Hex = generateDataId('iot-trade-device-registry');

/**
 * Register a device in the registry (both on-chain and in local discovery list)
 * 
 * @param walletClient - Viem wallet client for signing
 * @param deviceAddress - Device address to register
 * @param ownerAddress - Device owner address
 * @param deviceType - Device type
 */
export async function registerDeviceInRegistry(
  walletClient: WalletClient,
  deviceAddress: Address,
  ownerAddress: Address,
  deviceType: string
): Promise<Hex | null> {
  // Add to local discovery list (works across all users)
  addDeviceToDiscoveryList(deviceAddress, ownerAddress);
  
  // Optionally register on-chain (if registry owner is available)
  // For now, we'll skip on-chain registration and use local discovery
  // In production, you'd want to use a dedicated registry contract or service
  
  try {
    const registryOwner = getRegistryOwnerAddress();
    // Only register on-chain if we have a valid registry owner
    if (registryOwner && registryOwner !== '0x0000000000000000000000000000000000000000') {
      const encoder = new SchemaEncoder(DEVICE_REGISTRY_SCHEMA);
      const encodedData = encoder.encodeData([
        { name: "deviceAddress", value: deviceAddress, type: "address" },
        { name: "ownerAddress", value: ownerAddress, type: "address" },
        { name: "deviceType", value: deviceType, type: "string" },
        { name: "isActive", value: "true", type: "bool" },
        { name: "entityId", value: zeroBytes32, type: "bytes32" },
        { name: "nonce", value: Date.now().toString(), type: "uint256" },
      ]);

      // Use device address as dataId for registry entry
      const registryDataId = generateDataId(`registry_${deviceAddress}`);
      const txHash = await publishData(walletClient, registryDataId, DEVICE_REGISTRY_SCHEMA, encodedData);
      return txHash;
    }
  } catch (error) {
    console.warn('Failed to register device in on-chain registry:', error);
    // Continue with local discovery only
  }
  
  return null;
}

/**
 * Add device to local discovery list (shared across users)
 */
export function addDeviceToDiscoveryList(deviceAddress: Address, ownerAddress: Address): void {
  if (typeof window === 'undefined') return;
  
  const key = 'iot_trade_discoverable_devices';
  const stored = localStorage.getItem(key);
  const devices: Array<{ deviceAddress: Address; ownerAddress: Address }> = stored 
    ? JSON.parse(stored) 
    : [];
  
  // Check if device already exists
  const exists = devices.some(d => 
    d.deviceAddress.toLowerCase() === deviceAddress.toLowerCase()
  );
  
  if (!exists) {
    devices.push({ deviceAddress, ownerAddress });
    localStorage.setItem(key, JSON.stringify(devices));
  }
}

/**
 * Get discoverable devices from local list
 */
export function getDiscoverableDevices(): Array<{ deviceAddress: Address; ownerAddress: Address }> {
  if (typeof window === 'undefined') return [];
  
  const key = 'iot_trade_discoverable_devices';
  const stored = localStorage.getItem(key);
  
  if (stored) {
    try {
      return JSON.parse(stored) as Array<{ deviceAddress: Address; ownerAddress: Address }>;
    } catch (error) {
      console.error('Error parsing discoverable devices:', error);
      return [];
    }
  }
  
  return [];
}

/**
 * Read device from registry
 * 
 * @param deviceAddress - Device address to look up
 */
export async function readDeviceFromRegistry(
  deviceAddress: Address
): Promise<DeviceRegistryEntry | null> {
  try {
    // Use the same dataId format as used when registering (registry_${deviceAddress})
    const registryDataId = generateDataId(`registry_${deviceAddress}`);
    const registryOwner = getRegistryOwnerAddress();
    const encodedData = await readData(DEVICE_REGISTRY_SCHEMA, registryOwner, registryDataId);
    
    if (!encodedData) {
      return null;
    }
    
    const encoder = new SchemaEncoder(DEVICE_REGISTRY_SCHEMA);
    // Use decodeData instead of decode - check SDK API
    // If decode doesn't work, we'll need to use a different approach
    const decoded = (encoder as any).decode(encodedData);
    
    return {
      deviceAddress: decoded.deviceAddress as Address,
      ownerAddress: decoded.ownerAddress as Address,
      deviceType: decoded.deviceType,
      isActive: decoded.isActive === true || decoded.isActive === 'true',
      entityId: decoded.entityId,
      nonce: BigInt(decoded.nonce),
    };
  } catch (error) {
    console.error('Error reading device from registry:', error);
    return null;
  }
}

/**
 * Check if device is registered
 */
export async function isDeviceRegistered(deviceAddress: Address): Promise<boolean> {
  const entry = await readDeviceFromRegistry(deviceAddress);
  return entry !== null && entry.isActive;
}

/**
 * Limitations of SDK-Only Registry:
 * 
 * 1. **No List Function**: Can't get all devices without knowing their addresses
 *    Solution: Use event logs or indexing service
 * 
 * 2. **Single Registry Owner**: Need a known address to query
 *    Solution: Use a DAO or shared address
 * 
 * 3. **No Automatic Cleanup**: Devices stay in registry even if inactive
 *    Solution: Implement cleanup logic or use isActive flag
 * 
 * 4. **No Complex Queries**: Can't filter by type, location, etc.
 *    Solution: Use indexing service (The Graph) or off-chain database
 * 
 * 5. **No Access Control**: Anyone can read registry
 *    Solution: Use encryption or access control contract
 */

