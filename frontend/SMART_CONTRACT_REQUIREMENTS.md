# Smart Contract Requirements for IoT-Trade

## Do You Need a Smart Contract?

### Short Answer
**For basic data streaming: NO** ✅  
**For advanced features: YES** ⚠️

## What Somnia Data Streams SDK Provides (No Contract Needed)

The Somnia Data Streams SDK uses a **pre-deployed `Streams` smart contract** that handles:

1. **Data Publishing** - Store structured data on-chain
2. **Data Reading** - Query data by publisher, schema, and dataId
3. **Data Provenance** - Data is associated with publisher address (`msg.sender`)
4. **Schema Management** - Define and use data schemas

### What This Means
- ✅ You can publish device data without deploying a contract
- ✅ You can read device data without deploying a contract
- ✅ Data is stored on-chain with provenance
- ✅ No Solidity knowledge required

## What You Still Need a Smart Contract For

### 1. Device Registry/Discovery
**Problem**: How do you discover all devices in the marketplace?

**Current Solution**: localStorage (not ideal)
- Devices are stored in localStorage per user
- Can't discover devices from other users
- Not decentralized

**Smart Contract Solution**:
```solidity
contract DeviceRegistry {
    struct Device {
        address deviceAddress;
        address owner;
        string deviceType;
        bool isActive;
    }
    
    mapping(address => Device) public devices;
    address[] public deviceList;
    
    function registerDevice(address deviceAddress, string memory deviceType) external;
    function getDevices() external view returns (Device[] memory);
}
```

**Alternative (SDK-Only)**: Create a registry using the SDK
- Define a registry schema
- Publish device addresses to a known registry address
- Query the registry to discover devices
- Still requires knowing the registry address(es)

### 2. Subscription Management
**Problem**: How do you handle subscriptions and payments?

**Current Solution**: None (manual)
- No way to enforce subscriptions
- No payment processing
- No access control

**Smart Contract Solution**:
```solidity
contract SubscriptionManager {
    struct Subscription {
        address subscriber;
        address deviceOwner;
        address deviceAddress;
        uint256 startTime;
        uint256 endTime;
        uint256 balance;
        bool isActive;
    }
    
    mapping(address => mapping(address => Subscription)) public subscriptions;
    
    function subscribe(address deviceOwner, address deviceAddress, uint256 duration) external payable;
    function cancelSubscription(address deviceOwner, address deviceAddress) external;
    function checkAccess(address subscriber, address deviceOwner, address deviceAddress) external view returns (bool);
}
```

### 3. Payment Processing
**Problem**: How do you handle payments per data point?

**Current Solution**: None
- No automatic payments
- No payment verification
- No revenue distribution

**Smart Contract Solution**:
```solidity
contract PaymentProcessor {
    function payForData(
        address deviceOwner,
        address deviceAddress,
        uint256 dataPointId
    ) external payable {
        // Transfer payment to device owner
        // Track payments
        // Handle refunds
    }
}
```

### 4. Access Control
**Problem**: How do you restrict data access to subscribers only?

**Current Solution**: Public (anyone can read)
- All data is publicly readable
- No subscription enforcement
- No access control

**Smart Contract Solution**:
- Store subscriptions on-chain
- Check subscription status before allowing access
- Or encrypt data and provide keys to subscribers

## Recommended Architecture

### Phase 1: SDK Only (Current)
- ✅ Device registration via SDK
- ✅ Data publishing via SDK
- ✅ Data reading via SDK
- ✅ Device discovery via localStorage
- ⚠️ No subscription management
- ⚠️ No payment processing
- ⚠️ No access control

### Phase 2: SDK + Registry Contract
- ✅ Device registration via SDK
- ✅ Data publishing via SDK
- ✅ Device discovery via registry contract
- ✅ Marketplace browsing
- ⚠️ No subscription management
- ⚠️ No payment processing
- ⚠️ No access control

### Phase 3: SDK + Full Contracts
- ✅ Device registration via SDK
- ✅ Data publishing via SDK
- ✅ Device discovery via registry contract
- ✅ Subscription management via contract
- ✅ Payment processing via contract
- ✅ Access control via contract

## Alternative: SDK-Only Registry Pattern

You can create a simple registry using just the SDK:

### 1. Create a Registry Schema
```typescript
const REGISTRY_SCHEMA = "address deviceAddress, address ownerAddress, string deviceType, bool isActive, bytes32 entityId, uint256 nonce";
```

### 2. Publish to Registry
```typescript
// When device is registered, also publish to registry
const registryDataId = keccak256(toBytes("iot-trade-registry"));
await publishData(walletClient, registryDataId, REGISTRY_SCHEMA, encodedRegistryData);
```

### 3. Query Registry
```typescript
// Query registry to discover devices
const registryData = await readData(REGISTRY_SCHEMA, registryOwnerAddress, registryDataId);
```

### Limitations
- Still need to know registry address(es)
- Can't easily query all devices
- No pagination or filtering
- No complex queries

## Conclusion

### For MVP/Prototype
**Use SDK only** - Fast to implement, no contract deployment needed

### For Production
**Use SDK + Smart Contracts** - Full functionality, better UX, decentralized

### Hybrid Approach
**Use SDK for data + Contracts for business logic**
- SDK: Data storage and reading
- Contracts: Registry, subscriptions, payments, access control

## Next Steps

1. **Start with SDK only** (current state) ✅
2. **Add registry contract** when you need device discovery
3. **Add subscription contract** when you need payments
4. **Add access control** when you need to restrict data access

The SDK handles the hard part (data storage), so you only need contracts for business logic!

