import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-verify";
import { defineConfig } from "hardhat/config";
import "dotenv/config";

const {
  SEPOLIA_RPC_URL,
  SEPOLIA_PRIVATE_KEY,
  SOMNIA_RPC_URL,
  SOMNIA_PRIVATE_KEY,
} = process.env;

const networks: Record<string, any> = {
  hardhatMainnet: {
    type: "edr-simulated",
    chainType: "l1",
  },
  hardhatOp: {
    type: "edr-simulated",
    chainType: "op",
  },
  somnia: {
    type: "http",
    chainType: "l1",
    url: SOMNIA_RPC_URL || "",
    accounts: SOMNIA_PRIVATE_KEY ? [SOMNIA_PRIVATE_KEY] : [],
    chainId: 50312,
  },
};

if (SEPOLIA_RPC_URL) {
  networks.sepolia = {
    type: "http",
    chainType: "l1",
    url: SEPOLIA_RPC_URL,
    accounts: SEPOLIA_PRIVATE_KEY ? [SEPOLIA_PRIVATE_KEY] : [],
  };
}

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks,
  verify: {
    apiKey: {
      somnia: "empty",
    },
    customChains: [
      {
        network: "somnia",
        chainId: 50312,
        urls: {
          apiURL: "https://shannon-explorer.somnia.network/api",
          browserURL: "https://shannon-explorer.somnia.network",
        },
      },
    ],
    blockscout: {
      enabled: false,
    },
    sourcify: {
      enabled: false,
    },
  },
});
