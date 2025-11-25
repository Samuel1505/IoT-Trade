/**
 * Subscription Service
 * 
 * Loads user subscriptions from the blockchain
 */

import type { Address } from 'viem';
import type { UserSubscription } from '@/lib/types';
import { DeviceStatus, SubscriptionStatus } from '@/lib/enums';
import { getAccessExpiry, fetchAllRegistryDevices } from './registryService';
import { discoverMarketplaceDevices } from './deviceRegistry';

/**
 * Load all active subscriptions for a user from the blockchain
 * Checks all marketplace devices to find which ones the user has access to
 */
export async function loadUserSubscriptions(
  userAddress: Address
): Promise<UserSubscription[]> {
  try {
    // Get all marketplace devices
    const marketplaceDevices = await discoverMarketplaceDevices(100); // Get more devices to check
    
    // Check access for each device
    const subscriptionPromises = marketplaceDevices.map(async (device) => {
      try {
        const deviceAddress = device.deviceAddress as Address;
        
        // Get access expiry from blockchain
        const expiryTimestamp = await getAccessExpiry(userAddress, deviceAddress);
        const now = Date.now();
        
        // If expiry is 0, user has no subscription. If expiry is in the future, user has an active subscription
        if (expiryTimestamp > 0 && expiryTimestamp > now) {
          const daysRemaining = Math.ceil((expiryTimestamp - now) / (1000 * 60 * 60 * 24));
          
          // Determine subscription status
          let status: SubscriptionStatus = SubscriptionStatus.ACTIVE;
          if (daysRemaining <= 0) {
            status = SubscriptionStatus.EXPIRED;
          }
          
          const subscription: UserSubscription = {
            id: `sub-${device.id}-${expiryTimestamp}`,
            deviceId: device.id,
            deviceName: device.name,
            deviceType: device.type,
            deviceOwner: device.owner,
            status,
            startDate: new Date(now), // We don't have start date from contract, use current time as estimate
            endDate: new Date(expiryTimestamp),
            daysRemaining,
            remainingBalance: device.pricePerDataPoint, // Store price for reference
            dataPointsConsumed: 0, // Would need to track this separately
            autoRenewal: false,
          };
          
          return subscription;
        }
        
        return null;
      } catch (error) {
        // Silently skip devices that fail (might not have access or error)
        console.debug(`Error checking access for device ${device.id}:`, error);
        return null;
      }
    });
    
    // Wait for all checks to complete
    const results = await Promise.allSettled(subscriptionPromises);
    const subscriptions = results
      .map((result) => result.status === 'fulfilled' ? result.value : null)
      .filter((sub): sub is UserSubscription => sub !== null);
    
    return subscriptions;
  } catch (error) {
    console.error('Error loading user subscriptions:', error);
    return [];
  }
}

/**
 * Check if user has active access to a specific device
 */
export async function hasActiveAccess(
  userAddress: Address,
  deviceAddress: Address
): Promise<boolean> {
  try {
    const expiryTimestamp = await getAccessExpiry(userAddress, deviceAddress);
    return expiryTimestamp > Date.now();
  } catch (error) {
    console.error('Error checking access:', error);
    return false;
  }
}
