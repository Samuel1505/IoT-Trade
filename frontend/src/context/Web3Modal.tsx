'use client';

import { createAppKit } from '@reown/appkit/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { somniaTestnet, wagmiAdapter, projectId } from '@/config/wagmi';

// Set up queryClient
const queryClient = new QueryClient();

// Set up metadata
const metadata = {
  name: 'IoT Data Marketplace',
  description: 'Decentralized marketplace for IoT data streams on Somnia blockchain',
  url: 'https://iot-marketplace.somnia.network',
  icons: ['https://avatars.githubusercontent.com/u/37784886'],
};

// Create the modal
createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [somniaTestnet],
  defaultNetwork: somniaTestnet,
  metadata,
  features: {
    analytics: true,
  },
  themeMode: 'light',
  themeVariables: {
    '--w3m-accent': '#0066FF',
    '--w3m-border-radius-master': '8px',
  },
});

export function Web3Modal({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}