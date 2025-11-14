/**
 * Device Verification Service
 * 
 * Implements device ownership verification using blockchain-based verification codes.
 * Verification codes are published to Somnia blockchain, and devices read them directly.
 * NO BACKEND NEEDED - Blockchain is the backend!
 * 
 * Verification Flow:
 * 1. User enters serial number
 * 2. System generates verification code and publishes to blockchain
 * 3. Device reads verification code from blockchain using serial number
 * 4. Device displays code on screen
 * 5. User enters code from device into web UI
 * 6. System verifies code from blockchain
 * 7. Only verified devices can be registered
 */

import { type Address, type Hex } from 'viem';
import { SchemaEncoder, zeroBytes32 } from '@somnia-chain/streams';
import { 
  publishData, 
  readData, 
  generateDataId
} from '@/lib/somnia';
import { DEVICE_VERIFICATION_SCHEMA } from '@/lib/schemas';
import type { DeviceType } from '@/lib/enums';
import { JsonRpcSigner } from 'ethers';

// Track verification attempts to prevent brute force (in-memory, optional)
const verificationAttempts = new Map<string, number>();

/**
 * Generate and publish verification code to blockchain
 * @param signer - Ethers signer for signing the transaction
 * @param serialNumber - Device serial number
 * @param deviceAddress - Generated device address
 * @param ownerAddress - Owner's wallet address (publisher)
 * @returns Verification code and transaction hash
 */
export async function generateAndPublishVerificationCode(
  signer: JsonRpcSigner,
  serialNumber: string,
  deviceAddress: Address,
  ownerAddress: Address
): Promise<{ verificationCode: string; expiresIn: number; txHash: Hex }> {
  // Generate a unique 6-digit verification code
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Calculate expiration time (10 minutes from now)
  const expiresAt = BigInt(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  // Generate data ID from serial number (deterministic)
  const dataId = generateDataId(`verification_${serialNumber}`);
  
  // Encode verification code data
  const encoder = new SchemaEncoder(DEVICE_VERIFICATION_SCHEMA);
  const encodedData = encoder.encodeData([
    { name: "serialNumber", value: serialNumber, type: "string" },
    { name: "verificationCode", value: verificationCode, type: "string" },
    { name: "expiresAt", value: expiresAt.toString(), type: "uint64" },
    { name: "ownerAddress", value: ownerAddress, type: "address" },
    { name: "entityId", value: zeroBytes32, type: "bytes32" },
    { name: "nonce", value: Date.now().toString(), type: "uint256" },
  ]);
  
  // Publish verification code to blockchain
  const txHash = await publishData(signer, dataId, DEVICE_VERIFICATION_SCHEMA, encodedData);
  
  // Reset attempts for this serial number
  verificationAttempts.set(serialNumber, 0);
  
  return {
    verificationCode,
    expiresIn: 10 * 60, // 10 minutes in seconds
    txHash,
  };
}

/**
 * Read verification code from blockchain
 * Device can call this to get its verification code
 * @param serialNumber - Device serial number
 * @param ownerAddress - Owner's wallet address (publisher)
 * @returns Verification code data or null
 */
export async function readVerificationCodeFromBlockchain(
  serialNumber: string,
  ownerAddress: Address
): Promise<{ verificationCode: string; expiresAt: bigint; ownerAddress: Address } | null> {
  try {
    // Generate same data ID used when publishing
    const dataId = generateDataId(`verification_${serialNumber}`);
    
    // Read verification code from blockchain
    const encodedData = await readData(DEVICE_VERIFICATION_SCHEMA, ownerAddress, dataId);
    
    if (!encodedData) {
      return null;
    }
    
    // Decode verification code data
    const encoder = new SchemaEncoder(DEVICE_VERIFICATION_SCHEMA);
    const decoded = (encoder as any).decode(encodedData);
    
    return {
      verificationCode: decoded.verificationCode,
      expiresAt: BigInt(decoded.expiresAt),
      ownerAddress: decoded.ownerAddress as Address,
    };
  } catch (error) {
    console.error('Error reading verification code from blockchain:', error);
    return null;
  }
}

/**
 * Verify a device's verification code from blockchain
 * @param serialNumber - Device serial number
 * @param verificationCode - Code provided by device/user
 * @param ownerAddress - Owner's wallet address (publisher)
 * @returns true if verification succeeds
 */
export async function verifyDeviceChallenge(
  serialNumber: string,
  verificationCode: string,
  ownerAddress: Address
): Promise<{ verified: boolean; error?: string }> {
  // Check attempts (prevent brute force)
  const attempts = verificationAttempts.get(serialNumber) || 0;
  if (attempts >= 5) {
    return {
      verified: false,
      error: 'Too many verification attempts. Please generate a new verification code.',
    };
  }
  
  verificationAttempts.set(serialNumber, attempts + 1);
  
  // Read verification code from blockchain
  const codeData = await readVerificationCodeFromBlockchain(serialNumber, ownerAddress);
  
  if (!codeData) {
    return {
      verified: false,
      error: 'Verification code not found. Please start registration and generate a new code.',
    };
  }
  
  // Check if code has expired
  if (Date.now() > Number(codeData.expiresAt)) {
    return {
      verified: false,
      error: 'Verification code has expired. Please generate a new one.',
    };
  }
  
  // Verify the code matches
  if (codeData.verificationCode !== verificationCode) {
    return {
      verified: false,
      error: 'Invalid verification code. Please try again.',
    };
  }
  
  // Verification successful - clear attempts
  verificationAttempts.delete(serialNumber);
  
  return {
    verified: true,
  };
}

/**
 * Check if a verification code exists and is valid on blockchain
 */
export async function hasValidVerificationCode(
  serialNumber: string,
  ownerAddress: Address
): Promise<boolean> {
  const codeData = await readVerificationCodeFromBlockchain(serialNumber, ownerAddress);
  if (!codeData) return false;
  if (Date.now() > Number(codeData.expiresAt)) {
    return false;
  }
  return true;
}

/**
 * Get remaining time for verification code (in seconds)
 */
export async function getVerificationCodeRemainingTime(
  serialNumber: string,
  ownerAddress: Address
): Promise<number> {
  const codeData = await readVerificationCodeFromBlockchain(serialNumber, ownerAddress);
  if (!codeData) return 0;
  const remaining = Math.max(0, Number(codeData.expiresAt) - Date.now());
  return Math.floor(remaining / 1000);
}

/**
 * Device verification via API
 * In production, this would call your backend API that communicates with the device
 */
export async function verifyDeviceViaAPI(
  deviceAddress: Address,
  challenge: string,
  deviceType: DeviceType
): Promise<{ verified: boolean; error?: string }> {
  try {
    // In production, this would be an actual API call to your backend
    // which communicates with the physical device
    
    // For now, simulate device verification
    // The actual implementation would:
    // 1. Send challenge to device via API endpoint
    // 2. Device signs challenge with its private key
    // 3. Device returns signed challenge
    // 4. Verify the signature
    
    // Example API call structure:
    /*
    const response = await fetch('/api/devices/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceAddress,
        challenge,
        deviceType,
      }),
    });
    
    const data = await response.json();
    return { verified: data.verified, error: data.error };
    */
    
    // For MVP/demo: return pending status
    // In production, implement actual device communication
    return {
      verified: false,
      error: 'Device API verification not yet implemented. Use manual code entry.',
    };
  } catch (error) {
    console.error('Error verifying device via API:', error);
    return {
      verified: false,
      error: 'Failed to communicate with device. Please try manual verification.',
    };
  }
}

/**
 * Send verification code to device (published to blockchain)
 * The code is published to Somnia blockchain and device reads it directly.
 * NO BACKEND NEEDED - Blockchain is the backend!
 */
export async function sendVerificationCodeToDevice(
  serialNumber: string,
  verificationCode: string,
  deviceAddress: Address
): Promise<{ sent: boolean; method?: string; error?: string }> {
  try {
    // Code is already published to blockchain in generateAndPublishVerificationCode()
    // Device reads directly from blockchain using serial number
    // NO BACKEND NEEDED!
    
    return {
      sent: true,
      method: 'blockchain', // Device reads from blockchain directly
    };
  } catch (error) {
    console.error('Error sending verification code:', error);
    return {
      sent: false,
      error: 'Failed to publish verification code to blockchain. Please try again.',
    };
  }
}

