/**
 * Device Service for IoT-Trade
 * 
 * Handles device registration, data publishing, and data reading
 * using Somnia Data Streams
 */

import { type Address, type Hex, toHex, type WalletClient } from "viem";
import { SchemaEncoder, zeroBytes32 } from "@somnia-chain/streams";
import { 
  computeSchemaId,
  generateDataId,
  publishData,
  readData,
  encodeGPSData,
  encodeWeatherData,
  encodeAirQualityData,
  decodeGPSData,
  decodeWeatherData,
  decodeAirQualityData,
} from "@/lib/somnia";
import {
  DEVICE_METADATA_SCHEMA,
  getSchemaForDeviceType,
  type GPSData,
  type WeatherData,
  type AirQualityData,
} from "@/lib/schemas";
import { DeviceType } from "@/lib/enums";
import type { DataPoint } from "@/lib/types";

/**
 * Register a device on-chain
 * Creates a metadata stream for the device
 * @param walletClient - Viem wallet client for signing transactions
 * @param deviceName - Name of the device
 * @param deviceType - Type of device (GPS, Weather, Air Quality)
 * @param location - Location of the device
 * @param pricePerDataPoint - Price per data point in ETH
 * @param ownerAddress - The owner's wallet address (publisher address)
 * @param deviceAddress - The device's identifier address (for data ID generation)
 */
export async function registerDevice(
  walletClient: WalletClient,
  deviceName: string,
  deviceType: DeviceType,
  location: string,
  pricePerDataPoint: number,
  ownerAddress: Address,
  deviceAddress: Address
): Promise<{ dataId: Hex; schemaId: Hex; txHash: Hex }> {
  // Generate device data ID from device address
  // This will be used as the unique identifier for this device's stream
  const deviceDataId = generateDataId(deviceAddress);
  
  // Compute schema ID
  const schemaId = await computeSchemaId(DEVICE_METADATA_SCHEMA);
  
  // Encode device metadata
  const encoder = new SchemaEncoder(DEVICE_METADATA_SCHEMA);
  const encodedMetadata = encoder.encodeData([
    { name: "deviceName", value: deviceName, type: "string" },
    { name: "deviceType", value: deviceType, type: "string" },
    { name: "location", value: location, type: "string" },
    { name: "pricePerDataPoint", value: BigInt(Math.floor(pricePerDataPoint * 1e18)).toString(), type: "uint256" },
    { name: "ownerAddress", value: ownerAddress, type: "address" },
    { name: "entityId", value: zeroBytes32, type: "bytes32" },
    { name: "nonce", value: "0", type: "uint256" },
  ]);
  
  // Publish device metadata
  // Note: The publisher will be the wallet that signs the transaction (ownerAddress)
  const txHash = await publishData(walletClient, deviceDataId, DEVICE_METADATA_SCHEMA, encodedMetadata);
  
  return {
    dataId: deviceDataId,
    schemaId,
    txHash,
  };
}

/**
 * Publish GPS data to a device stream
 */
export async function publishGPSData(
  walletClient: WalletClient,
  deviceAddress: Address,
  data: Omit<GPSData, "entityId" | "nonce">
): Promise<Hex> {
  const schema = getSchemaForDeviceType(DeviceType.GPS_TRACKER);
  const dataId = generateDataId(deviceAddress);
  const nonce = BigInt(Date.now());
  
  const encodedData = encodeGPSData(data, zeroBytes32, nonce);
  return await publishData(walletClient, dataId, schema, encodedData);
}

/**
 * Publish Weather data to a device stream
 */
export async function publishWeatherData(
  walletClient: WalletClient,
  deviceAddress: Address,
  data: Omit<WeatherData, "entityId" | "nonce">
): Promise<Hex> {
  const schema = getSchemaForDeviceType(DeviceType.WEATHER_STATION);
  const dataId = generateDataId(deviceAddress);
  const nonce = BigInt(Date.now());
  
  const encodedData = encodeWeatherData(data, zeroBytes32, nonce);
  return await publishData(walletClient, dataId, schema, encodedData);
}

/**
 * Publish Air Quality data to a device stream
 */
export async function publishAirQualityData(
  walletClient: WalletClient,
  deviceAddress: Address,
  data: Omit<AirQualityData, "entityId" | "nonce">
): Promise<Hex> {
  const schema = getSchemaForDeviceType(DeviceType.AIR_QUALITY_MONITOR);
  const dataId = generateDataId(deviceAddress);
  const nonce = BigInt(Date.now());
  
  const encodedData = encodeAirQualityData(data, zeroBytes32, nonce);
  return await publishData(walletClient, dataId, schema, encodedData);
}

/**
 * Calculate device metrics from data activity
 * @param publisherAddress - The wallet address that published the data (owner's address)
 * @param deviceAddress - The device identifier address (used for dataId generation)
 * @param deviceType - Type of device
 * @param registeredAtMs - Device registration timestamp in milliseconds
 */
export async function calculateDeviceMetrics(
  publisherAddress: Address,
  deviceAddress: Address,
  deviceType: DeviceType,
  registeredAtMs: number
): Promise<{
  updateFrequency: string;
  uptime: number;
  lastPublished: Date | null;
  isActive: boolean;
}> {
  try {
    // Read latest data point to check if device is active
    const latestData = await readDeviceData(publisherAddress, deviceAddress, deviceType);
    const now = Date.now();
    
    if (!latestData) {
      // No data published - device is inactive
      const daysSinceRegistration = (now - registeredAtMs) / (1000 * 60 * 60 * 24);
      return {
        updateFrequency: 'No data published',
        uptime: 0,
        lastPublished: null,
        isActive: false,
      };
    }

    // Device has published data - calculate metrics
    const lastPublishedMs = latestData.timestamp.getTime();
    const timeSinceLastUpdate = now - lastPublishedMs;
    const timeSinceRegistration = now - registeredAtMs;
    
    // Consider device active if published data within last 24 hours
    const isActive = timeSinceLastUpdate < 24 * 60 * 60 * 1000;
    
    // Calculate uptime based on recent activity
    // If device published recently, calculate percentage of time since registration that it was active
    // For simplicity, if published within last 24h, assume 100% uptime
    // If older, decrease based on last update time
    let uptime = 0;
    if (isActive) {
      // Device is currently active
      const hoursSinceRegistration = timeSinceRegistration / (1000 * 60 * 60);
      if (hoursSinceRegistration < 24) {
        // Less than 24 hours since registration, assume 100% uptime
        uptime = 100;
      } else {
        // Calculate based on how recently data was published
        // If data is within last hour: 100%, within last 6 hours: 95%, etc.
        const hoursSinceUpdate = timeSinceLastUpdate / (1000 * 60 * 60);
        if (hoursSinceUpdate < 1) {
          uptime = 100;
        } else if (hoursSinceUpdate < 6) {
          uptime = 95;
        } else if (hoursSinceUpdate < 12) {
          uptime = 90;
        } else {
          uptime = 85;
        }
      }
    } else {
      // Device inactive - uptime decreases based on how long since last update
      const daysSinceUpdate = timeSinceLastUpdate / (1000 * 60 * 60 * 24);
      uptime = Math.max(0, 100 - (daysSinceUpdate * 10));
    }

    // Calculate update frequency from last published timestamp
    // Format as "Every X minutes/hours" or "N/A"
    let updateFrequency = 'N/A';
    if (timeSinceRegistration > 0) {
      // Estimate frequency based on registration time vs last update
      // This is a rough estimate - real frequency would need multiple data points
      const daysSinceReg = timeSinceRegistration / (1000 * 60 * 60 * 24);
      if (daysSinceReg > 0 && isActive) {
        // If active and registered recently, show estimated frequency
        if (timeSinceLastUpdate < 60 * 1000) {
          updateFrequency = 'Every minute';
        } else if (timeSinceLastUpdate < 5 * 60 * 1000) {
          updateFrequency = 'Every 5 minutes';
        } else if (timeSinceLastUpdate < 15 * 60 * 1000) {
          updateFrequency = 'Every 15 minutes';
        } else if (timeSinceLastUpdate < 60 * 60 * 1000) {
          updateFrequency = 'Every hour';
        } else {
          updateFrequency = `Every ${Math.round(timeSinceLastUpdate / (60 * 60 * 1000))} hours`;
        }
      } else {
        updateFrequency = 'Inactive';
      }
    }

    return {
      updateFrequency,
      uptime: Math.round(uptime * 10) / 10,
      lastPublished: latestData.timestamp,
      isActive,
    };
  } catch (error) {
    console.error('Error calculating device metrics:', error);
    return {
      updateFrequency: 'N/A',
      uptime: 0,
      lastPublished: null,
      isActive: false,
    };
  }
}

/**
 * Read latest data from a device stream
 * @param publisherAddress - The wallet address that published the data (owner's address)
 * @param deviceAddress - The device identifier address (used for dataId generation)
 * @param deviceType - Type of device
 */
export async function readDeviceData(
  publisherAddress: Address,
  deviceAddress: Address,
  deviceType: DeviceType
): Promise<DataPoint | null> {
  try {
    const schema = getSchemaForDeviceType(deviceType);
    const dataId = generateDataId(deviceAddress);
    
    // Read data from the publisher's stream
    const data = await readData(schema, publisherAddress, dataId);
    
    if (!data || data === '0x' || data === '0x0') {
      return null;
    }
    
    // If the schema is public, the SDK may already return a decoded object.
    // Otherwise, it returns raw hex that we need to decode.
    // See: Somnia Quickstart - Direct data read without reactivity
    // https://docs.somnia.network/somnia-data-streams/getting-started/quickstart
    // Try to interpret both cases.
    const maybeDecoded: any = data as any;
    const isHex = typeof data === 'string' && (data as string).startsWith('0x');

    // Decode based on device type with error handling
    let decoded: any;
    try {
      switch (deviceType) {
        case DeviceType.GPS_TRACKER: {
          if (isHex) {
            decoded = decodeGPSData(data as any);
          } else {
            decoded = maybeDecoded;
          }
          return {
            timestamp: new Date(Number(decoded.timestamp)),
            value: decoded.latitude,
            status: "verified" as const,
            latitude: decoded.latitude,
            longitude: decoded.longitude,
          };
        }
        case DeviceType.WEATHER_STATION: {
          if (isHex) {
            decoded = decodeWeatherData(data as any);
          } else {
            decoded = maybeDecoded;
          }
          return {
            timestamp: new Date(Number(decoded.timestamp)),
            value: decoded.temperature,
            status: "verified" as const,
          };
        }
        case DeviceType.AIR_QUALITY_MONITOR: {
          if (isHex) {
            decoded = decodeAirQualityData(data as any);
          } else {
            decoded = maybeDecoded;
          }
          return {
            timestamp: new Date(Number(decoded.timestamp)),
            value: decoded.aqi,
            status: "verified" as const,
          };
        }
        default:
          return null;
      }
    } catch (decodeError: any) {
      // If decode fails, log but don't throw - device might not have published data yet
      console.warn(`Failed to decode data for device ${deviceAddress}:`, decodeError?.message || decodeError);
      return null;
    }
  } catch (error) {
    // Silently return null - device might not have data yet
    // Only log if it's not a common "no data" scenario
    if (error instanceof Error && !error.message.includes('decode')) {
      console.error("Error reading device data:", error);
    }
    return null;
  }
}

/**
 * Read device metadata from on-chain stream
 * @param publisherAddress - The wallet address that published the metadata (owner's address)
 * @param deviceAddress - The device identifier address (used for dataId generation)
 */
export async function readDeviceMetadata(
  publisherAddress: Address,
  deviceAddress: Address
): Promise<{
  deviceName: string;
  deviceType: DeviceType;
  location: string;
  pricePerDataPoint: number;
  ownerAddress: Address;
} | null> {
  try {
    const dataId = generateDataId(deviceAddress);
    // Read metadata from the publisher's stream
    const encodedData = await readData(DEVICE_METADATA_SCHEMA, publisherAddress, dataId);
    
    if (!encodedData) {
      return null;
    }
    
    // Validate that encodedData is a valid hex string
    // readData already normalizes to Hex | null, so encodedData is always a string here
    let validHexData: Hex;
    
    // Check if it's a valid hex string (starts with 0x)
    if (encodedData.startsWith('0x')) {
      // Validate it's not empty or just '0x'
      if (encodedData === '0x' || encodedData === '0x0' || encodedData.length < 4) {
        return null;
      }
      validHexData = encodedData;
    } else {
      // Not a valid hex string
      console.warn(`Invalid hex data format for device ${deviceAddress}: ${encodedData}`);
      return null;
    }
    
    const encoder = new SchemaEncoder(DEVICE_METADATA_SCHEMA);
    const decoder = (encoder as any).decode || (encoder as any).decodeData;
    if (!decoder || typeof decoder !== 'function') {
      throw new Error('SchemaEncoder decode method not available. Encoder may not be properly initialized.');
    }
    
    // Try to decode with error handling
    let decoded: any;
    try {
      decoded = decoder.call(encoder, validHexData);
    } catch (decodeError: any) {
      // If decode fails, check if it's a DataView/ArrayBuffer issue
      if (decodeError?.message?.includes('ArrayBuffer') || decodeError?.message?.includes('DataView')) {
        console.warn(`Failed to decode metadata for device ${deviceAddress}: Invalid data format`);
        return null;
      }
      throw decodeError;
    }
    
    // Validate decoded data has required fields
    if (!decoded || !decoded.deviceName || !decoded.deviceType) {
      console.warn(`Decoded metadata missing required fields for device ${deviceAddress}`);
      return null;
    }
    
    return {
      deviceName: decoded.deviceName,
      deviceType: decoded.deviceType as DeviceType,
      location: decoded.location || '',
      pricePerDataPoint: Number(decoded.pricePerDataPoint || 0) / 1e18,
      ownerAddress: (decoded.ownerAddress || publisherAddress) as Address,
    };
  } catch (error) {
    // Don't log DataView/ArrayBuffer errors as errors - they're expected when data doesn't exist
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (!errorMessage.includes('ArrayBuffer') && !errorMessage.includes('DataView')) {
      console.error("Error reading device metadata:", error);
    }
    return null;
  }
}

