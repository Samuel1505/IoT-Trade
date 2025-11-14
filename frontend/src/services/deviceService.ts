/**
 * Device Service for IoT-Trade
 * 
 * Handles device registration, data publishing, and data reading
 * using Somnia Data Streams
 */

import { type Address, type Hex, toHex } from "viem";
import { JsonRpcSigner } from "ethers";
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
 * @param signer - Ethers signer for signing transactions
 * @param deviceName - Name of the device
 * @param deviceType - Type of device (GPS, Weather, Air Quality)
 * @param location - Location of the device
 * @param pricePerDataPoint - Price per data point in ETH
 * @param ownerAddress - The owner's wallet address (publisher address)
 * @param deviceAddress - The device's identifier address (for data ID generation)
 */
export async function registerDevice(
  signer: JsonRpcSigner,
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
  const txHash = await publishData(signer, deviceDataId, DEVICE_METADATA_SCHEMA, encodedMetadata);
  
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
  signer: JsonRpcSigner,
  deviceAddress: Address,
  data: Omit<GPSData, "entityId" | "nonce">
): Promise<Hex> {
  const schema = getSchemaForDeviceType(DeviceType.GPS_TRACKER);
  const dataId = generateDataId(deviceAddress);
  const nonce = BigInt(Date.now());
  
  const encodedData = encodeGPSData(data, zeroBytes32, nonce);
  return await publishData(signer, dataId, schema, encodedData);
}

/**
 * Publish Weather data to a device stream
 */
export async function publishWeatherData(
  signer: JsonRpcSigner,
  deviceAddress: Address,
  data: Omit<WeatherData, "entityId" | "nonce">
): Promise<Hex> {
  const schema = getSchemaForDeviceType(DeviceType.WEATHER_STATION);
  const dataId = generateDataId(deviceAddress);
  const nonce = BigInt(Date.now());
  
  const encodedData = encodeWeatherData(data, zeroBytes32, nonce);
  return await publishData(signer, dataId, schema, encodedData);
}

/**
 * Publish Air Quality data to a device stream
 */
export async function publishAirQualityData(
  signer: JsonRpcSigner,
  deviceAddress: Address,
  data: Omit<AirQualityData, "entityId" | "nonce">
): Promise<Hex> {
  const schema = getSchemaForDeviceType(DeviceType.AIR_QUALITY_MONITOR);
  const dataId = generateDataId(deviceAddress);
  const nonce = BigInt(Date.now());
  
  const encodedData = encodeAirQualityData(data, zeroBytes32, nonce);
  return await publishData(signer, dataId, schema, encodedData);
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
    const encodedData = await readData(schema, publisherAddress, dataId);
    
    if (!encodedData) {
      return null;
    }
    
    // Decode based on device type
    let decoded: any;
    switch (deviceType) {
      case DeviceType.GPS_TRACKER:
        decoded = decodeGPSData(encodedData);
        return {
          timestamp: new Date(Number(decoded.timestamp)),
          value: decoded.latitude, // Using latitude as primary value
          status: "verified" as const,
          latitude: decoded.latitude,
          longitude: decoded.longitude,
        };
      case DeviceType.WEATHER_STATION:
        decoded = decodeWeatherData(encodedData);
        return {
          timestamp: new Date(Number(decoded.timestamp)),
          value: decoded.temperature,
          status: "verified" as const,
        };
      case DeviceType.AIR_QUALITY_MONITOR:
        decoded = decodeAirQualityData(encodedData);
        return {
          timestamp: new Date(Number(decoded.timestamp)),
          value: decoded.aqi,
          status: "verified" as const,
        };
      default:
        return null;
    }
  } catch (error) {
    console.error("Error reading device data:", error);
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
    
    const encoder = new SchemaEncoder(DEVICE_METADATA_SCHEMA);
    const decoded = encoder.decode(encodedData);
    
    return {
      deviceName: decoded.deviceName,
      deviceType: decoded.deviceType as DeviceType,
      location: decoded.location,
      pricePerDataPoint: Number(decoded.pricePerDataPoint) / 1e18,
      ownerAddress: decoded.ownerAddress as Address,
    };
  } catch (error) {
    console.error("Error reading device metadata:", error);
    return null;
  }
}

