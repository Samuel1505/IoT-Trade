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

import type { Address, Hex } from 'viem';
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
 * For now, we'll use a placeholder. In practice, you'd want this to be
 * a well-known address that everyone can query.
 */
export const REGISTRY_OWNER_ADDRESS: Address = '0x0000000000000000000000000000000000000000' as Address; // TODO: Set actual registry address

/**
 * Registry data ID - a fixed identifier for the registry
 */
export const REGISTRY_DATA_ID: Hex = generateDataId('iot-trade-device-registry');

/**
 * Register a device in the registry
 * 
 * @param walletClient - Wallet client for signing (should be registry owner or authorized address)
 * @param deviceAddress - Device address to register
 * @param ownerAddress - Device owner address
 * @param deviceType - Device type
 */
export async function registerDeviceInRegistry(
  walletClient: any,
  deviceAddress: Address,
  ownerAddress: Address,
  deviceType: string
): Promise<Hex> {
  const encoder = new SchemaEncoder(DEVICE_REGISTRY_SCHEMA);
  const encodedData = encoder.encodeData([
    { name: "deviceAddress", value: deviceAddress, type: "address" },
    { name: "ownerAddress", value: ownerAddress, type: "address" },
    { name: "deviceType", value: deviceType, type: "string" },
    { name: "isActive", value: "true", type: "bool" },
    { name: "entityId", value: zeroBytes32, type: "bytes32" },
    { name: "nonce", value: Date.now().toString(), type: "uint256" },
  ]);

  // Publish to registry
  // Note: This requires the wallet to be the registry owner or authorized
  const txHash = await publishData(walletClient, REGISTRY_DATA_ID, DEVICE_REGISTRY_SCHEMA, encodedData);
  
  return txHash;
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
    // Use device address as dataId for lookup
    const dataId = generateDataId(deviceAddress);
    const encodedData = await readData(DEVICE_REGISTRY_SCHEMA, REGISTRY_OWNER_ADDRESS, dataId);
    
    if (!encodedData) {
      return null;
    }
    
    const encoder = new SchemaEncoder(DEVICE_REGISTRY_SCHEMA);
    const decoded = encoder.decode(encodedData);
    
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

