import { DeviceType, DeviceStatus, SubscriptionStatus, SubscriptionDuration } from './enums';

// Mock store data (using React Context/useState)
export const mockStore = {
  // User's wallet connection state
  walletConnected: true,
  walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1" as const,
  
  // User's registered devices
  userDevices: [
    {
      id: "device-1" as const,
      name: "Downtown GPS Tracker" as const,
      type: DeviceType.GPS_TRACKER,
      status: DeviceStatus.ONLINE,
      qualityScore: 98.5,
      location: "San Francisco, CA" as const,
      totalDataPoints: 125430,
      totalEarnings: 2.45,
      totalEarningsUsd: 4890.50,
      activeSubscribers: 12,
      deviceAddress: "0x1234567890abcdef1234567890abcdef12345678" as const,
      ownerAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1" as const,
      pricePerDataPoint: 0.00001,
      updateFrequency: "Every 30 seconds" as const,
      uptime: 99.8,
      lastPublished: new Date(Date.now() - 30000)
    },
    // ... existing code ...
    {
      id: "device-2" as const,
      name: "Weather Station Alpha" as const,
      type: DeviceType.WEATHER_STATION,
      status: DeviceStatus.ONLINE,
      qualityScore: 99.2,
      location: "Seattle, WA" as const,
      totalDataPoints: 89234,
      totalEarnings: 1.78,
      totalEarningsUsd: 3560.00,
      activeSubscribers: 8,
      deviceAddress: "0xabcdef1234567890abcdef1234567890abcdef12" as const,
      ownerAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1" as const,
      pricePerDataPoint: 0.00002,
      updateFrequency: "Every 1 minute" as const,
      uptime: 99.5,
      lastPublished: new Date(Date.now() - 60000)
    },
    {
      id: "device-3" as const,
      name: "Air Quality Monitor" as const,
      type: DeviceType.AIR_QUALITY_MONITOR,
      status: DeviceStatus.OFFLINE,
      qualityScore: 95.3,
      location: "Los Angeles, CA" as const,
      totalDataPoints: 45678,
      totalEarnings: 0.91,
      totalEarningsUsd: 1820.00,
      activeSubscribers: 5,
      deviceAddress: "0x567890abcdef1234567890abcdef1234567890ab" as const,
      ownerAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1" as const,
      pricePerDataPoint: 0.00002,
      updateFrequency: "Every 5 minutes" as const,
      uptime: 97.2,
      lastPublished: new Date(Date.now() - 3600000)
    }
  ],
  
  // User's subscriptions
  userSubscriptions: [
    {
      id: "sub-1" as const,
      deviceId: "device-market-1" as const,
      deviceName: "Harbor GPS Tracker" as const,
      deviceType: DeviceType.GPS_TRACKER,
      deviceOwner: "0x9876543210fedcba9876543210fedcba98765432" as const,
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      daysRemaining: 2,
      remainingBalance: 0.05,
      dataPointsConsumed: 12450,
      autoRenewal: true
    },
    // ... existing code ...
    {
      id: "sub-2" as const,
      deviceId: "device-market-2" as const,
      deviceName: "Mountain Weather Station" as const,
      deviceType: DeviceType.WEATHER_STATION,
      deviceOwner: "0xfedcba9876543210fedcba9876543210fedcba98" as const,
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      daysRemaining: 20,
      remainingBalance: 0.15,
      dataPointsConsumed: 28900,
      autoRenewal: false
    },
    {
      id: "sub-3" as const,
      deviceId: "device-market-3" as const,
      deviceName: "City Air Monitor" as const,
      deviceType: DeviceType.AIR_QUALITY_MONITOR,
      deviceOwner: "0x1111222233334444555566667777888899990000" as const,
      status: SubscriptionStatus.EXPIRED,
      startDate: new Date(Date.now() - 37 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      daysRemaining: 0,
      remainingBalance: 0,
      dataPointsConsumed: 43200,
      autoRenewal: false
    }
  ],
  
  // Marketplace devices
  marketplaceDevices: [
    {
      id: "device-market-1" as const,
      name: "Harbor GPS Tracker" as const,
      type: DeviceType.GPS_TRACKER,
      status: DeviceStatus.ONLINE,
      qualityScore: 99.8,
      location: "Boston, MA" as const,
      pricePerDataPoint: 0.000015,
      subscribers: 45,
      owner: "0x9876543210fedcba9876543210fedcba98765432" as const,
      updateFrequency: "Every 15 seconds" as const,
      uptime: 99.9
    },
    // ... existing code ...
    {
      id: "device-market-2" as const,
      name: "Mountain Weather Station" as const,
      type: DeviceType.WEATHER_STATION,
      status: DeviceStatus.ONLINE,
      qualityScore: 98.5,
      location: "Denver, CO" as const,
      pricePerDataPoint: 0.00001,
      subscribers: 32,
      owner: "0xfedcba9876543210fedcba9876543210fedcba98" as const,
      updateFrequency: "Every 2 minutes" as const,
      uptime: 99.5
    },
    {
      id: "device-market-3" as const,
      name: "City Air Monitor" as const,
      type: DeviceType.AIR_QUALITY_MONITOR,
      status: DeviceStatus.ONLINE,
      qualityScore: 97.2,
      location: "Portland, OR" as const,
      pricePerDataPoint: 0.00002,
      subscribers: 28,
      owner: "0x1111222233334444555566667777888899990000" as const,
      updateFrequency: "Every 5 minutes" as const,
      uptime: 98.8
    },
    {
      id: "device-market-4" as const,
      name: "Highway GPS Tracker" as const,
      type: DeviceType.GPS_TRACKER,
      status: DeviceStatus.ONLINE,
      qualityScore: 99.1,
      location: "Austin, TX" as const,
      pricePerDataPoint: 0.000012,
      subscribers: 38,
      owner: "0x2222333344445555666677778888999900001111" as const,
      updateFrequency: "Every 20 seconds" as const,
      uptime: 99.7
    }
  ],
  
  // Live data points for streaming
  liveDataPoints: [
    {
      timestamp: new Date(Date.now() - 30000),
      value: 45.2,
      status: "verified" as const,
      latitude: 37.7749,
      longitude: -122.4194
    },
    // ... existing code ...
    {
      timestamp: new Date(Date.now() - 60000),
      value: 44.8,
      status: "verified" as const,
      latitude: 37.7750,
      longitude: -122.4195
    },
    {
      timestamp: new Date(Date.now() - 90000),
      value: 45.5,
      status: "verified" as const,
      latitude: 37.7751,
      longitude: -122.4196
    }
  ]
};

// Mock query data (API responses)
export const mockQuery = {
  // Device preview data (last 10 points)
  devicePreviewData: [
    { timestamp: new Date(Date.now() - 300000), value: 42.1, status: "verified" as const },
    { timestamp: new Date(Date.now() - 270000), value: 43.5, status: "verified" as const },
    { timestamp: new Date(Date.now() - 240000), value: 44.2, status: "verified" as const },
    { timestamp: new Date(Date.now() - 210000), value: 43.8, status: "verified" as const },
    { timestamp: new Date(Date.now() - 180000), value: 45.1, status: "verified" as const },
    { timestamp: new Date(Date.now() - 150000), value: 44.7, status: "verified" as const },
    { timestamp: new Date(Date.now() - 120000), value: 45.3, status: "verified" as const },
    { timestamp: new Date(Date.now() - 90000), value: 45.5, status: "verified" as const },
    { timestamp: new Date(Date.now() - 60000), value: 44.8, status: "verified" as const },
    { timestamp: new Date(Date.now() - 30000), value: 45.2, status: "verified" as const }
  ],
  
  // Subscription pricing
  subscriptionPricing: {
    oneDay: { duration: SubscriptionDuration.ONE_DAY, estimatedDataPoints: 2880, priceEth: 0.043, priceUsd: 86.00 },
    sevenDays: { duration: SubscriptionDuration.SEVEN_DAYS, estimatedDataPoints: 20160, priceEth: 0.28, priceUsd: 560.00 },
    thirtyDays: { duration: SubscriptionDuration.THIRTY_DAYS, estimatedDataPoints: 86400, priceEth: 1.08, priceUsd: 2160.00 }
  }
};