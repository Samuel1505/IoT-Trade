# IoT-Trade

> A decentralized marketplace for IoT device data streams built on Somnia blockchain

**IoT-Trade** is a Web3 platform that enables IoT device owners to monetize their sensor data by selling access to real-time data streams. Subscribers can discover devices, purchase subscriptions, and access live sensor data (GPS tracking, weather stations, air quality monitors) directly from the blockchain.

## Overview

IoT-Trade connects IoT device owners with data consumers in a decentralized marketplace. The platform leverages **Somnia Data Streams** for on-chain data storage and **smart contracts** for device registry, subscriptions, and payment processing.

### Key Concepts

- **Device Owners**: Register IoT devices, publish sensor data, set pricing, and earn revenue
- **Data Subscribers**: Discover devices, purchase subscriptions, and access real-time sensor data
- **Somnia Blockchain**: Stores all data streams on-chain with cryptographic provenance
- **Smart Contracts**: Manage device registry, subscriptions, and payments

### Use Cases

- **GPS Tracking**: Fleet management, vehicle tracking, asset monitoring
- **Weather Stations**: Environmental monitoring, agricultural data collection
- **Air Quality Monitors**: Pollution monitoring, health tracking, urban planning

## Features

### Implemented Features

#### Core Infrastructure
- Device registration via Somnia Data Streams SDK
- Device registration via Smart Contract (DeviceRegistry)
- On-chain device metadata storage
- Data publishing (GPS, Weather, Air Quality) via SDK
- Real-time data reading from Somnia streams
- Device discovery from on-chain registry
- Marketplace browsing with device filtering
- Dashboard for device owners
- Device pause/play functionality
- Device settings page with manual data publishing
- Stream viewer with multiple views (charts, table, map)
- Wallet connection (AppKit/Reown)
- Responsive UI with modern design

#### Data Management
- GPS tracker data streams (latitude, longitude, altitude, speed, heading)
- Weather station data streams (temperature, humidity, pressure, wind, rainfall)
- Air quality monitor data streams (PM2.5, PM10, CO2, NO2, O3, AQI)
- Device metadata schemas
- Schema encoding/decoding with Somnia SDK
- Data validation and error handling

#### User Interface
- Landing page with hero section
- Marketplace with device listings
- Device detail pages
- Live stream visualization
- Interactive charts (Recharts)
- Map integration for GPS devices
- Data table views
- Subscription management UI
- Device registration flow
- Settings and configuration pages

### Upcoming Features

- Real subscription purchases (on-chain)
- Subscription status loading from blockchain
- Access control enforcement
- Revenue tracking for device owners
- Historical data tracking
- Subscription auto-renewal
- Subscription cancellation with refunds
- Data access logs

## Architecture

IoT-Trade uses a **hybrid architecture** combining SDK-based data streaming with smart contract-based business logic.

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  (Next.js 16, React 19, TypeScript, Tailwind CSS)          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Pages      │  │  Components  │  │   Services   │     │
│  │              │  │              │  │              │     │
│  │ • Marketplace│  │ • UI Kit     │  │ • Device     │     │
│  │ • Dashboard  │  │ • Charts     │  │ • Registry   │     │
│  │ • Streams    │  │ • Maps       │  │ • Somnia     │     │
│  │ • Register   │  │ • Forms      │  │ • Verification│    │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Web3
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
┌──────────────────┐                ┌──────────────────┐
│  Somnia SDK      │                │  Smart Contracts │
│                  │                │                  │
│ • Data Publishing│                │ • DeviceRegistry │
│ • Data Reading   │                │ • Subscriptions  │
│ • Schema Mgmt    │                │ • Payments       │
│ • Encoding       │                │ • Access Control │
└──────────────────┘                └──────────────────┘
        │                                       │
        └───────────────┬───────────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │  Somnia Testnet  │
              │  (Chain ID 50312)│
              │                  │
              │ • Data Streams   │
              │ • Contract State │
              │ • Transactions   │
              └──────────────────┘
```

### Data Flow

1. **Device Registration**:
   - User connects wallet → Enters device details → Smart contract registers device → Metadata stored on-chain

2. **Data Publishing**:
   - Device owner publishes sensor data → Somnia SDK encodes data → Transaction sent to blockchain → Data stored on-chain

3. **Data Reading**:
   - Subscriber selects device → Reads from Somnia stream → SDK decodes data → Displays in UI

4. **Subscription**:
   - User browses marketplace → Selects subscription → Smart contract processes payment → Access granted

## Tech Stack

### Frontend

- **Framework**: Next.js 16.0.1 (App Router)
- **UI Library**: React 19.2.0
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI primitives
- **Charts**: Recharts 3.4.1
- **Animations**: Framer Motion 12.23.24
- **Icons**: Lucide React 0.553.0

### Web3 & Blockchain

- **Wallet Connection**: AppKit (Reown) 1.8.14
- **Blockchain Library**: Viem 2.39.0
- **React Hooks**: Wagmi 2.19.3
- **Data Streaming**: Somnia Data Streams SDK 0.10.1
- **Ethereum Library**: Ethers.js 6.15.0

### Smart Contracts

- **Solidity**: 0.8.28
- **Framework**: Hardhat 3.0.14
- **Testing**: Hardhat Toolbox with Viem
- **Network**: Somnia Testnet (Chain ID 50312)
- **RPC**: https://dream-rpc.somnia.network

### Development Tools

- **Package Manager**: npm
- **Linting**: ESLint (via Next.js)
- **Type Checking**: TypeScript strict mode
- **Code Formatting**: Prettier (recommended)

## Project Structure

```
IoT-Trade/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # Next.js App Router pages
│   │   │   ├── dashboard/   # Device owner dashboard
│   │   │   ├── device/      # Device detail & settings
│   │   │   ├── marketplace/ # Device marketplace
│   │   │   ├── register/    # Device registration
│   │   │   ├── stream/      # Data stream viewer
│   │   │   └── subscription/# Subscription management
│   │   ├── components/      # React components
│   │   │   ├── ui/         # UI primitives (Radix)
│   │   │   └── shared/     # Shared components
│   │   ├── config/         # Configuration files
│   │   │   └── wagmi.ts    # Wagmi/AppKit config
│   │   ├── context/        # React context providers
│   │   ├── lib/            # Core libraries
│   │   │   ├── abi/        # Contract ABIs
│   │   │   ├── schemas.ts  # Data schemas
│   │   │   ├── somnia.ts   # Somnia SDK wrapper
│   │   │   └── types.ts    # TypeScript types
│   │   └── services/       # Business logic services
│   │       ├── deviceService.ts
│   │       ├── deviceRegistry.ts
│   │       └── subscriptionService.ts
│   ├── public/             # Static assets
│   ├── package.json
│   └── tsconfig.json
│
├── smartcontract/          # Hardhat smart contract project
│   ├── contracts/
│   │   └── DeviceRegistry.sol  # Main contract
│   ├── test/
│   │   └── DeviceRegistry.ts   # Contract tests
│   ├── scripts/
│   │   └── deploy-device-registry.ts
│   ├── ignition/
│   │   └── modules/
│   │       └── DeviceRegistry.ts
│   ├── hardhat.config.ts
│   └── package.json
│
├── DEVICE_INTEGRATION.md   # Device integration guide
├── INTEGRATION_ROADMAP.md  # Feature roadmap
└── README.md               # This file
```

### Frontend Key Files

- **`src/lib/somnia.ts`**: Somnia SDK wrapper, data encoding/decoding
- **`src/lib/schemas.ts`**: Data schemas for GPS, Weather, Air Quality
- **`src/services/deviceService.ts`**: High-level device operations
- **`src/services/deviceRegistry.ts`**: Smart contract interactions
- **`src/config/wagmi.ts`**: Wallet and blockchain configuration

### Smart Contract Key Files

- **`contracts/DeviceRegistry.sol`**: Main registry contract
- **`test/DeviceRegistry.ts`**: Comprehensive contract tests
- **`scripts/deploy-device-registry.ts`**: Deployment script

## Getting Started

### Prerequisites

- **Node.js**: v20+ (LTS recommended)
- **npm**: v9+ (comes with Node.js)
- **Git**: For cloning the repository
- **Wallet**: MetaMask or compatible Web3 wallet
- **Testnet Tokens**: STT (Somnia Testnet Token) for gas fees

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd IoT-Trade
   ```

2. **Install frontend dependencies**:
   ```bash
   cd frontend
   npm install
   ```

3. **Install smart contract dependencies**:
   ```bash
   cd ../smartcontract
   npm install
   ```

### Environment Setup

#### Frontend Configuration

1. Create `.env.local` in the `frontend/` directory:
   ```bash
   cd frontend
   cp .env.local.example .env.local  # If example exists
   ```

2. Add your WalletConnect Project ID:
   ```env
   NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id_here
   ```

   Get your Project ID from [https://cloud.reown.com](https://cloud.reown.com)

#### Smart Contract Configuration

1. Create `.env` in the `smartcontract/` directory:
   ```bash
   cd smartcontract
   cp .env.example .env
   ```

2. Add your configuration:
   ```env
   SOMNIA_RPC_URL=https://dream-rpc.somnia.network
   SOMNIA_PRIVATE_KEY=your_private_key_here
   ```

   **Security Note**: Never commit private keys to version control!

### Running the Development Server

#### Frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

#### Smart Contracts

Run tests:
```bash
cd smartcontract
npm test
```

Deploy to Somnia Testnet:
```bash
npm run deploy:somnia
```

### Building for Production

#### Frontend

```bash
cd frontend
npm run build
npm start
```

The production build will be optimized and ready for deployment.

## Smart Contracts

### DeviceRegistry Contract

The `DeviceRegistry` contract provides:

- **Device Registration**: Register devices with metadata
- **Device Updates**: Update device information (owner-only)
- **Device Discovery**: Query devices by owner or list all devices
- **Subscription Management**: Purchase device access, track expiry
- **Payment Processing**: Handle payments and track revenue

#### Contract Functions

```solidity
// Register a new device
function registerDevice(
    address deviceAddress,
    string calldata name,
    string calldata deviceType,
    string calldata location,
    uint256 pricePerDataPoint,
    uint256 subscriptionDuration,
    string calldata metadataURI
) external;

// Update device metadata (owner-only)
function updateDevice(
    address deviceAddress,
    string calldata name,
    string calldata deviceType,
    string calldata location,
    uint256 pricePerDataPoint,
    uint256 subscriptionDuration,
    string calldata metadataURI
) external;

// Toggle device availability
function setDeviceActive(address deviceAddress, bool isActive) external;

// Purchase subscription
function purchaseDeviceAccess(address deviceAddress) external payable;

// Check access expiry
function getAccessExpiry(address deviceAddress, address subscriber) 
    external view returns (uint256);
```

#### Deployment

```bash
cd smartcontract
npm run deploy:somnia
```

The contract address will be printed after deployment. Update `frontend/src/config/wagmi.ts` with the deployed address.

#### Testing

```bash
cd smartcontract
npm test
```

Tests cover:
- Device registration and retrieval
- Owner-only updates
- Device activation/deactivation
- Subscription purchases
- Access expiry tracking

## Frontend

### Pages Overview

- **`/`**: Landing page with features and use cases
- **`/marketplace`**: Browse all registered devices
- **`/dashboard`**: Device owner's dashboard (requires wallet)
- **`/register`**: Register a new IoT device
- **`/device/[id]`**: Device detail page with preview
- **`/device/[id]/settings`**: Device settings and data publishing
- **`/stream/[id]`**: Live data stream viewer
- **`/subscription`**: Manage subscriptions

### Key Services

#### Device Service (`src/services/deviceService.ts`)

High-level device operations:

```typescript
// Register device
await registerDevice(walletClient, name, type, location, price, owner, deviceAddress);

// Publish GPS data
await publishGPSData(walletClient, deviceAddress, {
  timestamp: BigInt(Date.now()),
  latitude: 37.7749,
  longitude: -122.4194,
  // ...
});

// Read device data
const data = await readDeviceData(publisherAddress, deviceAddress, deviceType);
```

#### Somnia SDK Service (`src/lib/somnia.ts`)

Core SDK wrapper for data operations:

```typescript
// Compute schema ID
const schemaId = await computeSchemaId(GPS_TRACKER_SCHEMA);

// Encode GPS data
const encoded = encodeGPSData({ latitude, longitude, ... });

// Publish data
await publishData(walletClient, dataId, schema, encodedData);

// Read data
const data = await readData(schema, publisherAddress, dataId);
```

### Wallet Connection

The app uses **AppKit (Reown)** for wallet connection:

1. Click "Connect Wallet" button
2. Select your wallet provider (MetaMask, WalletConnect, etc.)
3. Approve connection
4. Ensure wallet is connected to **Somnia Testnet**

**Somnia Testnet Details**:
- **Chain ID**: 50312
- **RPC URL**: https://dream-rpc.somnia.network
- **Explorer**: https://shannon-explorer.somnia.network

## Device Integration

IoT devices can integrate with IoT-Trade using multiple methods:

### Option 1: HTTP REST API (Recommended)

Publish data via REST API:

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

### Option 2: Python SDK

```python
from iot_trade_sdk import IoTTradeClient

client = IoTTradeClient(
    device_id="device-abc123",
    api_key="ak_your_api_key",
    rpc_url="https://dream-rpc.somnia.network"
)

client.publish_gps_data(
    latitude=37.7749,
    longitude=-122.4194,
    altitude=10,
    accuracy=5,
    speed=0,
    heading=0
)
```

### Option 3: Node.js SDK

```javascript
const { IoTTradeClient } = require('@iot-trade/sdk');

const client = new IoTTradeClient({
  deviceId: 'device-abc123',
  apiKey: 'ak_your_api_key',
  rpcUrl: 'https://dream-rpc.somnia.network'
});

await client.publishGPSData({
  latitude: 37.7749,
  longitude: -122.4194,
  // ...
});
```

### Option 4: Direct Somnia SDK Integration

For advanced users, integrate directly with Somnia Data Streams SDK:

```typescript
import { SDK, SchemaEncoder } from "@somnia-chain/streams";

const sdk = new SDK({
  public: publicClient,
  wallet: walletClient
});

const schemaId = await sdk.streams.computeSchemaId(GPS_SCHEMA);
const encoder = new SchemaEncoder(GPS_SCHEMA);
const encodedData = encoder.encodeData([...]);

await sdk.streams.set([{
  id: dataId,
  schemaId: schemaId,
  data: encodedData
}]);
```

### Device Verification

Devices can verify ownership during registration by:

1. **Blockchain Verification**: Read verification code from Somnia blockchain
2. **Display Code**: Show code on device screen
3. **User Input**: User enters code in web UI
4. **Registration**: Proceed with device registration

See `frontend/DEVICE_VERIFICATION.md` for detailed implementation.

### Supported Device Types

1. **GPS Tracker**
   - Schema: `uint64 timestamp, int32 latitude, int32 longitude, int32 altitude, uint32 accuracy, uint32 speed, uint32 heading, bytes32 entityId, uint256 nonce`
   - Use cases: Fleet tracking, asset monitoring

2. **Weather Station**
   - Schema: `uint64 timestamp, int32 temperature, uint32 humidity, uint32 pressure, uint32 windSpeed, uint32 windDirection, uint32 rainfall, bytes32 entityId, uint256 nonce`
   - Use cases: Environmental monitoring, agriculture

3. **Air Quality Monitor**
   - Schema: `uint64 timestamp, uint32 pm25, uint32 pm10, uint32 co2, uint32 no2, uint32 o3, uint32 aqi, bytes32 entityId, uint256 nonce`
   - Use cases: Pollution monitoring, health tracking




See `INTEGRATION_ROADMAP.md` for detailed implementation steps.

## Documentation

### Project Documentation

- **[INTEGRATION_ROADMAP.md](./INTEGRATION_ROADMAP.md)**: Feature roadmap and implementation plan
- **[DEVICE_INTEGRATION.md](./DEVICE_INTEGRATION.md)**: Guide for integrating IoT devices

### Frontend Documentation

- **[frontend/README.md](./frontend/README.md)**: Frontend-specific setup
- **[frontend/SOMNIA_INTEGRATION.md](./frontend/SOMNIA_INTEGRATION.md)**: Somnia SDK integration details
- **[frontend/SOMNIA_VERIFICATION.md](./frontend/SOMNIA_VERIFICATION.md)**: Integration verification checklist
- **[frontend/DEVICE_INTEGRATION.md](./frontend/DEVICE_INTEGRATION.md)**: Device integration guide
- **[frontend/DEVICE_VERIFICATION.md](./frontend/DEVICE_VERIFICATION.md)**: Device ownership verification
- **[frontend/WALLET_SETUP.md](./frontend/WALLET_SETUP.md)**: Wallet connection setup
- **[frontend/SDK_VS_SMART_CONTRACT.md](./frontend/SDK_VS_SMART_CONTRACT.md)**: When to use SDK vs contracts
- **[frontend/SMART_CONTRACT_REQUIREMENTS.md](./frontend/SMART_CONTRACT_REQUIREMENTS.md)**: Contract requirements guide

### Smart Contract Documentation

- **[smartcontract/README.md](./smartcontract/README.md)**: Smart contract setup and deployment

### External Resources

- [Somnia Data Streams Documentation](https://docs.somnia.network/somnia-data-streams)
- [Somnia Testnet Explorer](https://shannon-explorer.somnia.network)
- [AppKit (Reown) Documentation](https://docs.reown.com/appkit/react)
- [Wagmi Documentation](https://wagmi.sh)
- [Viem Documentation](https://viem.sh)

