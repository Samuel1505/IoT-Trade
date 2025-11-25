import { type Address, type Account, createPublicClient, http, type WalletClient } from 'viem';
import { deviceRegistryAbi } from '@/lib/abi/deviceRegistry';
import { somniaTestnet } from '@/config/wagmi';

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_DEVICE_REGISTRY_ADDRESS || '').toLowerCase() as Address;

function requireContractAddress() {
  if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '0x') {
    throw new Error('DeviceRegistry address missing. Set NEXT_PUBLIC_DEVICE_REGISTRY_ADDRESS.');
  }
  return CONTRACT_ADDRESS;
}

function getWalletAccount(walletClient: WalletClient): Address {
  const account = walletClient.account as Account | undefined;
  if (!account) {
    throw new Error('Wallet client missing account');
  }
  if (typeof account === 'string') {
    return account as Address;
  }
  return account.address as Address;
}

const publicClient = createPublicClient({
  chain: somniaTestnet,
  transport: http(somniaTestnet.rpcUrls.default.http[0]),
});

type ContractDevice = {
  owner: Address;
  name: string;
  deviceType: string;
  location: string;
  pricePerDataPoint: bigint;
  subscriptionDuration: bigint;
  metadataURI: string;
  isActive: boolean;
  registeredAt: bigint;
};

export type RegistryDevice = {
  address: Address;
  owner: Address;
  name: string;
  deviceType: string;
  location: string;
  pricePerDataPoint: number;
  subscriptionDuration: number;
  metadataURI: string;
  isActive: boolean;
  registeredAt: number;
};

function toRegistryDevice(address: Address, raw: ContractDevice): RegistryDevice {
  return {
    address,
    owner: raw.owner,
    name: raw.name,
    deviceType: raw.deviceType,
    location: raw.location,
    pricePerDataPoint: Number(raw.pricePerDataPoint) / 1e18,
    subscriptionDuration: Number(raw.subscriptionDuration),
    metadataURI: raw.metadataURI,
    isActive: raw.isActive,
    registeredAt: Number(raw.registeredAt) * 1000,
  };
}

export async function fetchAllRegistryDevices(): Promise<RegistryDevice[]> {
  try {
    const contractAddress = requireContractAddress();
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Registry fetch timeout')), 10000)
    );
    
    const addressesPromise = publicClient.readContract({
      address: contractAddress,
      abi: deviceRegistryAbi,
      functionName: 'getAllDevices',
    }) as Promise<Address[]>;
    
    const addresses = await Promise.race([addressesPromise, timeoutPromise]);

    // If no addresses, return empty array immediately
    if (!addresses || addresses.length === 0) {
      return [];
    }

    const devices = await Promise.allSettled(
      addresses.map(async (deviceAddress) => {
        try {
          const device = (await publicClient.readContract({
            address: contractAddress,
            abi: deviceRegistryAbi,
            functionName: 'getDevice',
            args: [deviceAddress],
          })) as ContractDevice;
          return toRegistryDevice(deviceAddress, device);
        } catch (error) {
          console.error(`Error fetching device ${deviceAddress}:`, error);
          return null;
        }
      }),
    );

    return devices
      .map((result) => result.status === 'fulfilled' ? result.value : null)
      .filter((device): device is RegistryDevice => device !== null);
  } catch (error) {
    // If contract address is missing or RPC call fails, return empty array
    console.error('Error fetching registry devices:', error);
    return [];
  }
}

export async function fetchDevicesByOwner(owner: Address): Promise<RegistryDevice[]> {
  try {
    const contractAddress = requireContractAddress();
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Fetch devices by owner timeout')), 10000)
    );
    
    const addressesPromise = publicClient.readContract({
      address: contractAddress,
      abi: deviceRegistryAbi,
      functionName: 'getDevicesByOwner',
      args: [owner],
    }) as Promise<Address[]>;
    
    const addresses = await Promise.race([addressesPromise, timeoutPromise]);

    // If no addresses, return empty array immediately
    if (!addresses || addresses.length === 0) {
      return [];
    }

    const devices = await Promise.allSettled(
      addresses.map(async (deviceAddress) => {
        try {
          const device = (await publicClient.readContract({
            address: contractAddress,
            abi: deviceRegistryAbi,
            functionName: 'getDevice',
            args: [deviceAddress],
          })) as ContractDevice;
          return toRegistryDevice(deviceAddress, device);
        } catch (error) {
          console.error(`Error fetching device ${deviceAddress}:`, error);
          return null;
        }
      }),
    );

    return devices
      .map((result) => result.status === 'fulfilled' ? result.value : null)
      .filter((device): device is RegistryDevice => device !== null);
  } catch (error) {
    // If contract address is missing or RPC call fails, return empty array
    console.error('Error fetching devices by owner:', error);
    return [];
  }
}

export async function registerDeviceOnChain(
  walletClient: WalletClient,
  params: {
    deviceAddress: Address;
    name: string;
    deviceType: string;
    location: string;
    pricePerDataPoint: bigint;
    subscriptionDuration: bigint;
    metadataURI: string;
  },
): Promise<Address> {
  const contractAddress = requireContractAddress();
  const account = getWalletAccount(walletClient);

  // Check if device is already registered (gracefully handle errors)
  try {
    const isRegistered = await isDeviceRegistered(params.deviceAddress);
    if (isRegistered) {
      throw new Error('Device is already registered on the blockchain');
    }
  } catch (error: any) {
    // If checking fails for reasons other than already registered, log but continue
    if (error.message?.includes('already registered')) {
      throw error;
    }
    console.warn('Could not check device registration status:', error);
  }

  // Try to estimate gas, but use a safe default if it fails
  let gasLimit: bigint | undefined;
  try {
    const gasEstimate = await publicClient.estimateContractGas({
      address: contractAddress,
      abi: deviceRegistryAbi,
      functionName: 'registerDevice',
      args: [
        params.deviceAddress,
        params.name,
        params.deviceType,
        params.location,
        params.pricePerDataPoint,
        params.subscriptionDuration,
        params.metadataURI,
      ],
      account,
    });

    // Add 30% buffer to gas estimate to ensure transaction goes through
    gasLimit = (gasEstimate * BigInt(130)) / BigInt(100);
    
    // Ensure minimum gas limit
    if (gasLimit < BigInt(100000)) {
      gasLimit = BigInt(200000); // Safe default for device registration
    }
  } catch (error: any) {
    // Gas estimation failed - use a safe default
    console.warn('Gas estimation failed, using default gas limit:', error);
    gasLimit = BigInt(300000); // Default gas limit for device registration
  }

  const args: [`0x${string}`, string, string, string, bigint, bigint, string] = [
    params.deviceAddress,
    params.name,
    params.deviceType,
    params.location,
    params.pricePerDataPoint,
    params.subscriptionDuration,
    params.metadataURI,
  ];

  // Add gas limit if we have it
  if (gasLimit) {
    return walletClient.writeContract({
      address: contractAddress,
      abi: deviceRegistryAbi,
      functionName: 'registerDevice',
      args,
      account,
      chain: walletClient.chain,
      gas: gasLimit,
    });
  }

  // Fallback: let wallet estimate
  return walletClient.writeContract({
    address: contractAddress,
    abi: deviceRegistryAbi,
    functionName: 'registerDevice',
    args,
    account,
    chain: walletClient.chain,
  });
}

export async function updateDeviceOnChain(
  walletClient: WalletClient,
  params: {
    deviceAddress: Address;
    name: string;
    deviceType: string;
    location: string;
    pricePerDataPoint: bigint;
    subscriptionDuration: bigint;
    metadataURI: string;
  },
): Promise<Address> {
  const contractAddress = requireContractAddress();
  return walletClient.writeContract({
    address: contractAddress,
    abi: deviceRegistryAbi,
    functionName: 'updateDevice',
    args: [
      params.deviceAddress,
      params.name,
      params.deviceType,
      params.location,
      params.pricePerDataPoint,
      params.subscriptionDuration,
      params.metadataURI,
    ],
    account: getWalletAccount(walletClient),
    chain: walletClient.chain,
  });
}

export async function setDeviceActiveOnChain(
  walletClient: WalletClient,
  deviceAddress: Address,
  isActive: boolean,
): Promise<Address> {
  const contractAddress = requireContractAddress();
  return walletClient.writeContract({
    address: contractAddress,
    abi: deviceRegistryAbi,
    functionName: 'setDeviceActive',
    args: [deviceAddress, isActive],
    account: getWalletAccount(walletClient),
    chain: walletClient.chain,
  });
}

export async function purchaseDeviceAccess(
  walletClient: WalletClient,
  deviceAddress: Address,
  value: bigint,
): Promise<Address> {
  const contractAddress = requireContractAddress();
  return walletClient.writeContract({
    address: contractAddress,
    abi: deviceRegistryAbi,
    functionName: 'purchaseAccess',
    args: [deviceAddress],
    account: getWalletAccount(walletClient),
    chain: walletClient.chain,
    value,
  });
}

export async function getAccessExpiry(subscriber: Address, deviceAddress: Address): Promise<number> {
  const contractAddress = requireContractAddress();
  const expiry = (await publicClient.readContract({
    address: contractAddress,
    abi: deviceRegistryAbi,
    functionName: 'getAccessExpiry',
    args: [subscriber, deviceAddress],
  })) as bigint;
  return Number(expiry) * 1000;
}

export async function isDeviceRegistered(deviceAddress: Address): Promise<boolean> {
  const contractAddress = requireContractAddress();
  return (await publicClient.readContract({
    address: contractAddress,
    abi: deviceRegistryAbi,
    functionName: 'deviceExists',
    args: [deviceAddress],
  })) as boolean;
}

export async function getDeviceInfo(deviceAddress: Address): Promise<RegistryDevice | null> {
  try {
    const contractAddress = requireContractAddress();
    const device = (await publicClient.readContract({
      address: contractAddress,
      abi: deviceRegistryAbi,
      functionName: 'getDevice',
      args: [deviceAddress],
    })) as ContractDevice;
    
    return toRegistryDevice(deviceAddress, device);
  } catch (error) {
    console.error('Error fetching device info:', error);
    return null;
  }
}
