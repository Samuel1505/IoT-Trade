/**
 * Somnia Data Streams Schemas for IoT Devices
 * 
 * These schemas define the structure of data published to Somnia blockchain
 * for different IoT device types.
 */

// GPS Tracker Schema
// Format: timestamp, latitude, longitude, altitude, accuracy, speed, heading, entityId, nonce
export const GPS_TRACKER_SCHEMA = 
  "uint64 timestamp, int32 latitude, int32 longitude, int32 altitude, uint32 accuracy, uint32 speed, uint32 heading, bytes32 entityId, uint256 nonce";

// Weather Station Schema
// Format: timestamp, temperature, humidity, pressure, windSpeed, windDirection, rainfall, entityId, nonce
export const WEATHER_STATION_SCHEMA = 
  "uint64 timestamp, int32 temperature, uint32 humidity, uint32 pressure, uint32 windSpeed, uint32 windDirection, uint32 rainfall, bytes32 entityId, uint256 nonce";

// Air Quality Monitor Schema
// Format: timestamp, pm25, pm10, co2, no2, o3, aqi, entityId, nonce
export const AIR_QUALITY_MONITOR_SCHEMA = 
  "uint64 timestamp, uint32 pm25, uint32 pm10, uint32 co2, uint32 no2, uint32 o3, uint32 aqi, bytes32 entityId, uint256 nonce";

// Device Metadata Schema (for device registration)
// Format: deviceName, deviceType, location, pricePerDataPoint, ownerAddress, entityId, nonce
export const DEVICE_METADATA_SCHEMA = 
  "string deviceName, string deviceType, string location, uint256 pricePerDataPoint, address ownerAddress, bytes32 entityId, uint256 nonce";

// Device Registry Schema (for marketplace discovery)
// Format: deviceAddress, ownerAddress, deviceType, isActive, entityId, nonce
// This allows us to create a registry using the SDK without a custom contract
export const DEVICE_REGISTRY_SCHEMA = 
  "address deviceAddress, address ownerAddress, string deviceType, bool isActive, bytes32 entityId, uint256 nonce";

// Device Verification Code Schema (for ownership verification)
// Format: serialNumber, verificationCode, expiresAt, ownerAddress, entityId, nonce
// Published to blockchain so devices can read verification codes directly
export const DEVICE_VERIFICATION_SCHEMA = 
  "string serialNumber, string verificationCode, uint64 expiresAt, address ownerAddress, bytes32 entityId, uint256 nonce";

/**
 * Get schema based on device type
 */
export function getSchemaForDeviceType(deviceType: string): string {
  switch (deviceType) {
    case "GPS Tracker":
      return GPS_TRACKER_SCHEMA;
    case "Weather Station":
      return WEATHER_STATION_SCHEMA;
    case "Air Quality Monitor":
      return AIR_QUALITY_MONITOR_SCHEMA;
    default:
      throw new Error(`Unknown device type: ${deviceType}`);
  }
}

/**
 * Schema field types for type checking
 */
export interface GPSData {
  timestamp: bigint;
  latitude: number;
  longitude: number;
  altitude: number;
  accuracy: number;
  speed: number;
  heading: number;
  entityId: string;
  nonce: bigint;
}

export interface WeatherData {
  timestamp: bigint;
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  rainfall: number;
  entityId: string;
  nonce: bigint;
}

export interface AirQualityData {
  timestamp: bigint;
  pm25: number;
  pm10: number;
  co2: number;
  no2: number;
  o3: number;
  aqi: number;
  entityId: string;
  nonce: bigint;
}

export interface DeviceMetadata {
  deviceName: string;
  deviceType: string;
  location: string;
  pricePerDataPoint: bigint;
  ownerAddress: string;
  entityId: string;
  nonce: bigint;
}

export interface DeviceRegistryEntry {
  deviceAddress: string;
  ownerAddress: string;
  deviceType: string;
  isActive: boolean;
  entityId: string;
  nonce: bigint;
}

export interface DeviceVerificationCode {
  serialNumber: string;
  verificationCode: string;
  expiresAt: bigint;
  ownerAddress: string;
  entityId: string;
  nonce: bigint;
}
