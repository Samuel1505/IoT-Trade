import type { DeviceType, DeviceStatus, SubscriptionStatus, SubscriptionDuration } from './enums';

// Format Ethereum address
export const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Format token amount with symbol (STT for Somnia)
export const formatEthAmount = (amount: number): string => {
  return `${amount.toFixed(6)} STT`;
};

// Format USD amount
export const formatUsdAmount = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

// Format percentage
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// Format date and time
export const formatDateTime = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

// Format relative time (e.g., "2 seconds ago")
export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
};

// Format device type
export const formatDeviceType = (type: DeviceType): string => {
  return type;
};

// Format device status
export const formatDeviceStatus = (status: DeviceStatus): string => {
  return status;
};

// Format subscription status
export const formatSubscriptionStatus = (status: SubscriptionStatus): string => {
  return status;
};

// Format subscription duration
export const formatSubscriptionDuration = (duration: SubscriptionDuration): string => {
  return duration;
};

// Format count with k/M suffix
export const formatCount = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
};

// Format days remaining
export const formatDaysRemaining = (days: number): string => {
  return `${days} ${days === 1 ? 'day' : 'days'}`;
};