// Device types enum
export enum DeviceType {
  GPS_TRACKER = "GPS Tracker",
  WEATHER_STATION = "Weather Station",
  AIR_QUALITY_MONITOR = "Air Quality Monitor"
}

// Device status enum
export enum DeviceStatus {
  ONLINE = "ONLINE",
  OFFLINE = "OFFLINE"
}

// Subscription status enum
export enum SubscriptionStatus {
  ACTIVE = "Active",
  EXPIRED = "Expired"
}

// Subscription duration enum
export enum SubscriptionDuration {
  ONE_DAY = "1 Day",
  SEVEN_DAYS = "7 Days",
  THIRTY_DAYS = "30 Days"
}

// View mode for live dashboard
export enum ViewMode {
  MAP = "Map View",
  CHART = "Chart View",
  TABLE = "Table View"
}

// Time range for charts
export enum TimeRange {
  ONE_HOUR = "1h",
  SIX_HOURS = "6h",
  TWENTY_FOUR_HOURS = "24h",
  SEVEN_DAYS = "7d"
}

// Registration steps
export enum RegistrationStep {
  ENTER_SERIAL = 1,
  VERIFY_DEVICE = 2,
  FILL_DETAILS = 3,
  SUCCESS = 4
}

// Sort options for marketplace
export enum SortOption {
  QUALITY_SCORE = "Quality Score",
  PRICE = "Price",
  SUBSCRIBERS = "Subscribers",
  NEWEST = "Newest"
}

// Export format
export enum ExportFormat {
  CSV = "CSV",
  JSON = "JSON"
}