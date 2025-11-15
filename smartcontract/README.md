# IoT-Trade Smart Contracts

This package contains the on-chain components for IoT-Trade. The first contract, `DeviceRegistry`, provides a Streamr-style registry where device owners can publish metadata (name, type, location, price, metadata URI) and toggle availability for the marketplace.

## Stack
- Hardhat 3 + `@nomicfoundation/hardhat-toolbox-viem`
- Node `node:test` runner with `viem` assertions
- Solidity `0.8.28`
- Deployment targets: Hardhat local network & Somnia Testnet (chain id `50312`)

## Getting Started

```bash
cd smartcontract
npm install
```

Copy the environment template and set credentials:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `SOMNIA_RPC_URL` | RPC endpoint (default: `https://dream-rpc.somnia.network`) |
| `SOMNIA_PRIVATE_KEY` | Wallet private key with STT for testnet gas |

## Scripts

```bash
npm run test                 # Run viem-powered Hardhat tests
npm run deploy:somnia        # Deploy DeviceRegistry to Somnia Testnet
npm run deploy:local         # Deploy via Ignition on local hardhat network
```

## Contract Overview

`contracts/DeviceRegistry.sol`
- `registerDevice` – store metadata for a device address; pushes into global index + owner list
- `updateDevice` – owner-only metadata updates
- `setDeviceActive` – toggle device availability
- `getDevice`, `getDevicesByOwner`, `getAllDevices`, `deviceExists`
- Emits `DeviceRegistered`, `DeviceUpdated`, `DeviceStatusChanged` for indexing

## Tests

`test/DeviceRegistry.ts` validates:
- Register & fetch metadata
- Only owner can update
- Active flag toggling and owner index maintenance

Run with:
```bash
npx hardhat test
```

## Deployment

### Hardhat Script
```bash
npm run deploy:somnia
# prints the on-chain address on Somnia Testnet
```

### Ignition Module

```bash
npx hardhat ignition deploy ignition/modules/DeviceRegistry.ts
npx hardhat ignition deploy --network somnia ignition/modules/DeviceRegistry.ts
```

After deployment, copy the contract address into the frontend configuration to load marketplace devices from on-chain metadata.
