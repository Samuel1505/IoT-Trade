/**
 * Somnia Data Streams SDK Service
 * 
 * This service provides a wrapper around the Somnia Data Streams SDK
 * to interact with the Somnia blockchain for IoT data streams.
 */

import { SDK, SchemaEncoder, zeroBytes32 } from "@somnia-chain/streams";
import { createPublicClient, createWalletClient, custom, http, type Address, type Hex, keccak256, toBytes, toHex, type WalletClient } from "viem";
import { somniaTestnet } from "@/config/wagmi";
import { 
  GPS_TRACKER_SCHEMA, 
  WEATHER_STATION_SCHEMA, 
  AIR_QUALITY_MONITOR_SCHEMA,
  DEVICE_METADATA_SCHEMA,
  getSchemaForDeviceType,
  type GPSData,
  type WeatherData,
  type AirQualityData,
  type DeviceMetadata
} from "./schemas";

/**
 * Initialize Somnia SDK with public client (for reading)
 */
export function createSomniaSDKPublic() {
  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: http(somniaTestnet.rpcUrls.default.http[0]),
  });

  return new SDK({
    public: publicClient,
  });
}

/**
 * Create a Somnia wallet client from an EIP-1193 provider
 */
export function createSomniaWalletClient(provider: any, account: Address) {
  return createWalletClient({
    account,
    chain: somniaTestnet,
    transport: custom(provider),
  });
}

/**
 * Initialize Somnia SDK with wallet client (for writing)
 * Requires wallet connection
 */
export async function createSomniaSDKWithWallet(walletClient: WalletClient) {
  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: http(somniaTestnet.rpcUrls.default.http[0]),
  });

  return new SDK({
    public: publicClient,
    wallet: walletClient,
  });
}

/**
 * Compute schema ID for a given schema string
 */
export async function computeSchemaId(schema: string): Promise<Hex> {
  const sdk = createSomniaSDKPublic();
  const result = await sdk.streams.computeSchemaId(schema);
  
  // Handle case where SDK returns an Error
  if (result instanceof Error) {
    throw result;
  }
  
  return result as Hex;
}

/**
 * Encode GPS data for publishing
 */
export function encodeGPSData(data: Omit<GPSData, "entityId" | "nonce">, entityId: string = zeroBytes32, nonce: bigint = BigInt(0)): Hex {
  const encoder = new SchemaEncoder(GPS_TRACKER_SCHEMA);
  return encoder.encodeData([
    { name: "timestamp", value: data.timestamp.toString(), type: "uint64" },
    { name: "latitude", value: Math.round(data.latitude * 1e6).toString(), type: "int32" },
    { name: "longitude", value: Math.round(data.longitude * 1e6).toString(), type: "int32" },
    { name: "altitude", value: Math.round(data.altitude).toString(), type: "int32" },
    { name: "accuracy", value: data.accuracy.toString(), type: "uint32" },
    { name: "speed", value: data.speed.toString(), type: "uint32" },
    { name: "heading", value: data.heading.toString(), type: "uint32" },
    { name: "entityId", value: entityId, type: "bytes32" },
    { name: "nonce", value: nonce.toString(), type: "uint256" },
  ]);
}

/**
 * Decode GPS data from on-chain stream
 */
export function decodeGPSData(encodedData: Hex): GPSData {
  const encoder = new SchemaEncoder(GPS_TRACKER_SCHEMA);
  
  // Check if decode method exists, if not try decodeData
  const decoder = (encoder as any).decode || (encoder as any).decodeData;
  if (!decoder || typeof decoder !== 'function') {
    throw new Error('SchemaEncoder decode method not available. Encoder may not be properly initialized.');
  }
  
  const decoded = decoder.call(encoder, encodedData);
  
  return {
    timestamp: BigInt(decoded.timestamp),
    latitude: Number(decoded.latitude) / 1e6,
    longitude: Number(decoded.longitude) / 1e6,
    altitude: Number(decoded.altitude),
    accuracy: Number(decoded.accuracy),
    speed: Number(decoded.speed),
    heading: Number(decoded.heading),
    entityId: decoded.entityId,
    nonce: BigInt(decoded.nonce),
  };
}

/**
 * Encode Weather data for publishing
 */
export function encodeWeatherData(data: Omit<WeatherData, "entityId" | "nonce">, entityId: string = zeroBytes32, nonce: bigint = BigInt(0)): Hex {
  const encoder = new SchemaEncoder(WEATHER_STATION_SCHEMA);
  return encoder.encodeData([
    { name: "timestamp", value: data.timestamp.toString(), type: "uint64" },
    { name: "temperature", value: Math.round(data.temperature * 100).toString(), type: "int32" },
    { name: "humidity", value: Math.round(data.humidity * 100).toString(), type: "uint32" },
    { name: "pressure", value: Math.round(data.pressure).toString(), type: "uint32" },
    { name: "windSpeed", value: Math.round(data.windSpeed * 100).toString(), type: "uint32" },
    { name: "windDirection", value: data.windDirection.toString(), type: "uint32" },
    { name: "rainfall", value: Math.round(data.rainfall * 100).toString(), type: "uint32" },
    { name: "entityId", value: entityId, type: "bytes32" },
    { name: "nonce", value: nonce.toString(), type: "uint256" },
  ]);
}

/**
 * Decode Weather data from on-chain stream
 */
export function decodeWeatherData(encodedData: Hex): WeatherData {
  const encoder = new SchemaEncoder(WEATHER_STATION_SCHEMA);
  
  // Check if decode method exists, if not try decodeData
  const decoder = (encoder as any).decode || (encoder as any).decodeData;
  if (!decoder || typeof decoder !== 'function') {
    throw new Error('SchemaEncoder decode method not available. Encoder may not be properly initialized.');
  }
  
  const decoded = decoder.call(encoder, encodedData);
  
  return {
    timestamp: BigInt(decoded.timestamp),
    temperature: Number(decoded.temperature) / 100,
    humidity: Number(decoded.humidity) / 100,
    pressure: Number(decoded.pressure),
    windSpeed: Number(decoded.windSpeed) / 100,
    windDirection: Number(decoded.windDirection),
    rainfall: Number(decoded.rainfall) / 100,
    entityId: decoded.entityId,
    nonce: BigInt(decoded.nonce),
  };
}

/**
 * Encode Air Quality data for publishing
 */
export function encodeAirQualityData(data: Omit<AirQualityData, "entityId" | "nonce">, entityId: string = zeroBytes32, nonce: bigint = BigInt(0)): Hex {
  const encoder = new SchemaEncoder(AIR_QUALITY_MONITOR_SCHEMA);
  return encoder.encodeData([
    { name: "timestamp", value: data.timestamp.toString(), type: "uint64" },
    { name: "pm25", value: data.pm25.toString(), type: "uint32" },
    { name: "pm10", value: data.pm10.toString(), type: "uint32" },
    { name: "co2", value: data.co2.toString(), type: "uint32" },
    { name: "no2", value: data.no2.toString(), type: "uint32" },
    { name: "o3", value: data.o3.toString(), type: "uint32" },
    { name: "aqi", value: data.aqi.toString(), type: "uint32" },
    { name: "entityId", value: entityId, type: "bytes32" },
    { name: "nonce", value: nonce.toString(), type: "uint256" },
  ]);
}

/**
 * Decode Air Quality data from on-chain stream
 */
export function decodeAirQualityData(encodedData: Hex): AirQualityData {
  const encoder = new SchemaEncoder(AIR_QUALITY_MONITOR_SCHEMA);
  
  // Check if decode method exists, if not try decodeData
  const decoder = (encoder as any).decode || (encoder as any).decodeData;
  if (!decoder || typeof decoder !== 'function') {
    throw new Error('SchemaEncoder decode method not available. Encoder may not be properly initialized.');
  }
  
  const decoded = decoder.call(encoder, encodedData);
  
  return {
    timestamp: BigInt(decoded.timestamp),
    pm25: Number(decoded.pm25),
    pm10: Number(decoded.pm10),
    co2: Number(decoded.co2),
    no2: Number(decoded.no2),
    o3: Number(decoded.o3),
    aqi: Number(decoded.aqi),
    entityId: decoded.entityId,
    nonce: BigInt(decoded.nonce),
  };
}

/**
 * Publish data to a Somnia stream
 */
export async function publishData(
  walletClient: WalletClient,
  dataId: Hex,
  schema: string,
  encodedData: Hex
): Promise<Hex> {
  const sdk = await createSomniaSDKWithWallet(walletClient);
  const schemaIdResult = await sdk.streams.computeSchemaId(schema);
  
  // Handle case where SDK returns an Error
  if (schemaIdResult instanceof Error) {
    throw schemaIdResult;
  }
  
  const schemaId = schemaIdResult as Hex;
  
  const txHash = await sdk.streams.set([
    {
      id: dataId,
      schemaId: schemaId,
      data: encodedData,
    },
  ]);
  
  return txHash as Hex;
}

/**
 * Read data from a Somnia stream
 * Returns null if no data exists or if the read times out
 */
export async function readData(
  schema: string,
  publisherAddress: Address,
  dataId: Hex,
  timeoutMs: number = 1500
): Promise<Hex | null> {
  const sdk = createSomniaSDKPublic();
  const schemaIdResult = await sdk.streams.computeSchemaId(schema);
  
  // Handle case where SDK returns an Error
  if (schemaIdResult instanceof Error) {
    throw schemaIdResult;
  }
  
  const schemaId = schemaIdResult as Hex;
  
  try {
    // Add timeout to prevent hanging when no data exists
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Read timeout')), timeoutMs)
    );
    
    const dataPromise = sdk.streams.getByKey(schemaId, publisherAddress, dataId);
    const data: unknown = await Promise.race([dataPromise, timeoutPromise]);
    
    // Validate and normalize the returned data
    if (!data) {
      return null;
    }
    
    // If data is already a hex string, validate it
    if (typeof data === 'string') {
      if (data.startsWith('0x')) {
        // Validate it's a proper hex string (not empty or just '0x')
        if (data === '0x' || data === '0x0') {
          return null;
        }
        return data as Hex;
      } else {
        // Not a valid hex string format
        console.warn(`Invalid hex format returned from readData: ${data.substring(0, 50)}`);
        return null;
      }
    }
    
    // If data is bytes/ArrayBuffer, convert to hex
    if (data instanceof Uint8Array) {
      return toHex(data);
    }
    if (data instanceof ArrayBuffer) {
      return toHex(new Uint8Array(data));
    }
    
    // For other types, try to convert to hex if possible
    return toHex(data as any);
  } catch (err: any) {
    const message: string = err?.message || '';
    const statusCode = err?.status || err?.statusCode || err?.code;
    
    // If no data exists yet for this publisher/schema/dataId, SDK may revert with index OOB
    // Or if read timed out, return null (treat as no data)
    // Also catch DataView/ArrayBuffer errors which indicate invalid data format
    // HTTP 400 errors typically indicate invalid request (e.g., data doesn't exist)
    if (
      statusCode === 400 ||
      message.includes('Array index is out of bounds') ||
      message.includes('ContractFunctionRevertedError') ||
      message.includes('ContractFunctionExecutionError') ||
      message.includes('Read timeout') ||
      message.includes('ArrayBuffer') ||
      message.includes('DataView') ||
      message.includes('First argument to DataView constructor') ||
      message.includes('400') ||
      message.includes('Bad Request')
    ) {
      return null;
    }
    // Otherwise, rethrow to surface unexpected errors
    throw err;
  }
}

/**
 * Generate data ID from device address or identifier
 * Uses keccak256 hash to create a deterministic 32-byte hex string
 */
export function generateDataId(deviceId: string | Address): Hex {
  // Convert device ID/address to bytes and hash with keccak256
  // This creates a deterministic 32-byte identifier
  try {
    const bytes = toBytes(deviceId);
    const hash = keccak256(bytes);
    return hash;
  } catch (error) {
    // Fallback: pad and convert to hex
    const padded = deviceId.padEnd(64, '0').slice(0, 64);
    return `0x${padded}` as Hex;
  }
}

/**
 * Get all data for a device stream (if supported by SDK)
 */
export async function getAllDataForDevice(
  schema: string,
  publisherAddress: Address
): Promise<Array<{ dataId: Hex; data: Hex; timestamp: bigint }>> {
  const sdk = createSomniaSDKPublic();
  const schemaIdResult = await sdk.streams.computeSchemaId(schema);
  
  // Handle case where SDK returns an Error
  if (schemaIdResult instanceof Error) {
    throw schemaIdResult;
  }
  
  const schemaId = schemaIdResult as Hex;
  
  // Note: This depends on SDK capabilities. If not available, we'll need to track dataIds separately
  // For now, returning empty array - we'll implement a registry pattern
  return [];
}

