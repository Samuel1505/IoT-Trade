# Wallet Connection Setup

This project uses AppKit (Reown) for wallet connection with Somnia Testnet.

## Setup Instructions

### 1. Get WalletConnect Project ID

1. Go to [https://cloud.reown.com](https://cloud.reown.com)
2. Sign up or log in
3. Create a new project
4. Copy your Project ID

### 2. Configure Environment Variables

1. Create a `.env.local` file in the frontend directory:
   ```bash
   cp .env.local.example .env.local
   ```

2. Add your Project ID:
   ```
   NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id_here
   ```

### 3. Run the Application

```bash
npm run dev
```

## Somnia Testnet Details

- **Chain ID**: 50311
- **Network Name**: Somnia Testnet
- **Currency**: STT (Somnia Test Token)
- **RPC URL**: https://dream-rpc.somnia.network
- **Block Explorer**: https://somnia-devnet.socialscan.io

## Features

- ✅ Connect wallet button in header
- ✅ Displays shortened address when connected
- ✅ Supports multiple wallet providers (MetaMask, WalletConnect, etc.)
- ✅ Configured for Somnia Testnet
- ✅ Responsive design (desktop and mobile)

## Changes Made

1. **Removed**: Sign In button from header
2. **Replaced**: Get Started button → Connect Wallet button
3. **Added**: Wallet connection functionality with AppKit
4. **Configured**: Somnia Testnet as the default network