import type { DeviceType, DeviceStatus, SubscriptionStatus } from './enums';

// User Device
export interface UserDevice {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  qualityScore: number;
  location: string;
  totalDataPoints: number;
  totalEarnings: number;
  totalEarningsUsd: number;
  activeSubscribers: number;
  deviceAddress: string; // Device identifier address (for dataId generation)
  ownerAddress: string; // Owner's wallet address (publisher address for Somnia streams)
  pricePerDataPoint: number;
  updateFrequency: string;
  uptime: number;
  lastPublished: Date;
}

// User Subscription
export interface UserSubscription {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  deviceOwner: string;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  daysRemaining: number;
  remainingBalance: number;
  dataPointsConsumed: number;
  autoRenewal: boolean;
}

// Marketplace Device
export interface MarketplaceDevice {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  qualityScore: number;
  location: string;
  pricePerDataPoint: number;
  subscriptionDuration?: number; // Duration in seconds
  subscribers: number;
  owner: string;
  // Added for Streams reads
  deviceAddress: string; // Device identifier address (for dataId generation)
  ownerAddress: string;  // Publisher address used to read streams (usually same as owner)
  updateFrequency: string;
  uptime: number;
}

// Data Point
export interface DataPoint {
  timestamp: Date;
  value: number;
  status: "verified" | "pending" | "failed";
  latitude?: number;
  longitude?: number;
}