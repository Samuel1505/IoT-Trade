# Device Integration Guide

This guide helps you integrate IoT devices with IoT-Trade to automatically publish sensor data to the Somnia blockchain.

## Overview

IoT-Trade uses **Somnia Data Streams** to store and stream sensor data on-chain. Your device needs to publish data to Somnia after registration.

## Quick Start

1. **Register your device** on the IoT-Trade platform (get device credentials)
2. **Install the IoT-Trade SDK** or use our HTTP API
3. **Configure your device** with credentials
4. **Start publishing** sensor data automatically

## Integration Options

### Option 1: HTTP REST API (Recommended for Cloud/Server)

Use our REST API to publish data from your backend or cloud services.

**Base URL:** `https://api.iot-trade.io/v1` (or your deployment URL)

**Publish GPS Data:**
```bash
curl -X POST https://api.iot-trade.io/v1/devices/{deviceId}/data/gps \
  -H "Authorization: Bearer {apiKey}" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 37.7749,
    "longitude": -122.4194,
    "altitude": 10,
    "accuracy": 5,
    "speed": 0,
    "heading": 0
  }'
```

**Publish Weather Data:**
```bash
curl -X POST https://api.iot-trade.io/v1/devices/{deviceId}/data/weather \
  -H "Authorization: Bearer {apiKey}" \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 72.5,
    "humidity": 65.0,
    "pressure": 1013.25,
    "windSpeed": 5.0,
    "windDirection": 180,
    "rainfall": 0.0
  }'
```

**Publish Air Quality Data:**
```bash
curl -X POST https://api.iot-trade.io/v1/devices/{deviceId}/data/air-quality \
  -H "Authorization: Bearer {apiKey}" \
  -H "Content-Type: application/json" \
  -d '{
    "pm25": 15,
    "pm10": 25,
    "co2": 400,
    "no2": 20,
    "o3": 50,
    "aqi": 45
  }'
```

### Option 2: Python SDK

Install our Python SDK for easy integration:

```bash
pip install iot-trade-sdk
```

**Example: GPS Tracker**
```python
from iot_trade_sdk import IoTTradeClient
from datetime import datetime

# Initialize client
client = IoTTradeClient(
    device_id="device-abc123",
    api_key="ak_your_api_key",
    rpc_url="https://dream-rpc.somnia.network"
)

# Publish GPS data
client.publish_gps_data(
    latitude=37.7749,
    longitude=-122.4194,
    altitude=10,
    accuracy=5,
    speed=0,
    heading=0
)

# Publish on a schedule
import schedule
import time

def publish_sensor_data():
    # Read from your sensor
    gps_data = read_from_gps_sensor()
    
    # Publish to blockchain
    client.publish_gps_data(**gps_data)

# Publish every minute
schedule.every(1).minutes.do(publish_sensor_data)

while True:
    schedule.run_pending()
    time.sleep(1)
```

**Example: Weather Station**
```python
from iot_trade_sdk import IoTTradeClient

client = IoTTradeClient(
    device_id="device-xyz789",
    api_key="ak_your_api_key"
)

# Read from sensors
temp = read_temperature_sensor()
humidity = read_humidity_sensor()
pressure = read_pressure_sensor()

# Publish data
client.publish_weather_data(
    temperature=temp,
    humidity=humidity,
    pressure=pressure,
    windSpeed=read_wind_speed(),
    windDirection=read_wind_direction(),
    rainfall=read_rainfall()
)
```

### Option 3: Node.js SDK

Install our Node.js SDK:

```bash
npm install @iot-trade/sdk
```

**Example: Air Quality Monitor**
```javascript
const { IoTTradeClient } = require('@iot-trade/sdk');

const client = new IoTTradeClient({
  deviceId: 'device-abc123',
  apiKey: 'ak_your_api_key',
  rpcUrl: 'https://dream-rpc.somnia.network'
});

// Publish air quality data
async function publishAirQuality() {
  // Read from sensors
  const sensors = await readSensors();
  
  await client.publishAirQualityData({
    pm25: sensors.pm25,
    pm10: sensors.pm10,
    co2: sensors.co2,
    no2: sensors.no2,
    o3: sensors.o3,
    aqi: calculateAQI(sensors)
  });
}

// Publish every 5 minutes
setInterval(publishAirQuality, 5 * 60 * 1000);
```

### Option 4: Direct Somnia SDK Integration

For advanced users, integrate directly with Somnia Data Streams SDK:

```typescript
import { SDK, SchemaEncoder } from "@somnia-chain/streams";
import { createWalletClient, custom, createPublicClient, http } from "viem";
import { somniaTestnet } from "./config";

// Initialize SDK
const publicClient = createPublicClient({
  chain: somniaTestnet,
  transport: http("https://dream-rpc.somnia.network")
});

const walletClient = createWalletClient({
  account: privateKey, // Your device's private key
  chain: somniaTestnet,
  transport: custom(provider)
});

const sdk = new SDK({
  public: publicClient,
  wallet: walletClient
});

// Define schema
const GPS_SCHEMA = "uint64 timestamp, int32 latitude, int32 longitude, int32 altitude, uint32 accuracy, uint32 speed, uint32 heading, bytes32 entityId, uint256 nonce";

// Encode and publish
const encoder = new SchemaEncoder(GPS_SCHEMA);
const schemaId = await sdk.streams.computeSchemaId(GPS_SCHEMA);
const dataId = generateDataId(deviceAddress);

const encodedData = encoder.encodeData([
  { name: "timestamp", value: Date.now().toString(), type: "uint64" },
  { name: "latitude", value: Math.round(latitude * 1e6).toString(), type: "int32" },
  { name: "longitude", value: Math.round(longitude * 1e6).toString(), type: "int32" },
  // ... other fields
]);

await sdk.streams.set([{
  id: dataId,
  schemaId: schemaId,
  data: encodedData
}]);
```

## Device Credentials

After registering your device, you'll receive:

- **Device ID**: Unique identifier (e.g., `device-abc123`)
- **Device Address**: On-chain address (e.g., `0x1234...`)
- **API Key**: Authentication token for API access
- **Private Key** (optional): For direct SDK integration

Store these securely. The API Key should never be exposed in client-side code.

## Publishing Frequency

**Recommended intervals:**
- **GPS Trackers**: Every 1-5 minutes (or on movement)
- **Weather Stations**: Every 5-15 minutes
- **Air Quality Monitors**: Every 5-30 minutes

Adjust based on your device's battery life and data costs.

## Error Handling

Always implement retry logic:

```python
import time
from iot_trade_sdk import IoTTradeClient, IoTTradeError

def publish_with_retry(client, data, max_retries=3):
    for attempt in range(max_retries):
        try:
            client.publish_gps_data(**data)
            return True
        except IoTTradeError as e:
            if attempt == max_retries - 1:
                print(f"Failed after {max_retries} attempts: {e}")
                return False
            time.sleep(2 ** attempt)  # Exponential backoff
    return False
```

## Best Practices

1. **Batch Publishing**: If possible, batch multiple readings before publishing
2. **Offline Queue**: Queue data locally when offline, sync when online
3. **Data Validation**: Validate sensor readings before publishing
4. **Rate Limiting**: Respect rate limits (typically 100 requests/minute)
5. **Monitoring**: Monitor publishing success/failure rates

## Testing

Use the device settings page (`/device/[id]/settings`) to:
- Test data publishing manually
- View publishing history
- Check integration status
- Monitor data quality

## Support

- **Documentation**: [docs.iot-trade.io](https://docs.iot-trade.io)
- **Discord**: [discord.gg/iot-trade](https://discord.gg/iot-trade)
- **Email**: support@iot-trade.io

