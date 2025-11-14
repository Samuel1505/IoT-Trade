# SDK vs Smart Contract: When Do You Need Each?

## Quick Answer

**For basic data operations: NO contract needed** ✅  
**For business logic: YES, contract needed** ⚠️

## What Somnia Data Streams SDK Provides

The SDK uses a **pre-deployed `Streams` smart contract** that handles:

### ✅ What Works Without a Contract

1. **Data Publishing**
   - Publish structured data to blockchain
   - Data is stored on-chain with provenance
   - Associated with publisher address (`msg.sender`)

2. **Data Reading**
   - Query data by publisher, schema, and dataId
   - Read latest data point
   - Verify data provenance

3. **Schema Management**
   - Define data schemas
   - Encode/decode data
   - Compute schema IDs

### ❌ What Requires a Smart Contract

1. **Device Registry/Discovery**
   - List all devices
   - Filter devices by type/location
   - Track device status

2. **Subscription Management**
   - Create subscriptions
   - Track subscription status
   - Handle renewals/cancellations

3. **Payment Processing**
   - Process payments per data point
   - Handle refunds
   - Distribute revenue

4. **Access Control**
   - Restrict data access to subscribers
   - Verify subscription status
   - Enforce access permissions

## Current Architecture

### What We're Doing Now (SDK Only)

```
┌─────────────────┐
│   Device Owner  │
└────────┬────────┘
         │
         │ 1. Register Device
         ▼
┌─────────────────┐
│  Somnia SDK     │──┐
└────────┬────────┘  │
         │           │ 2. Publish to Streams Contract
         │           ▼
         │    ┌──────────────┐
         │    │   Streams    │
         │    │   Contract   │
         │    │  (Pre-deployed)│
         │    └──────────────┘
         │
         │ 3. Read Data
         ▼
┌─────────────────┐
│   Subscriber    │
└─────────────────┘
```

**Pros:**
- ✅ No contract deployment
- ✅ Fast to implement
- ✅ Data is on-chain
- ✅ Provenance is guaranteed

**Cons:**
- ❌ No device discovery
- ❌ No subscription management
- ❌ No payment processing
- ❌ No access control

## Alternative: SDK-Only Registry Pattern

You can create a simple registry using **just the SDK**:

### How It Works

1. **Define Registry Schema**
   ```typescript
   const REGISTRY_SCHEMA = "address deviceAddress, address ownerAddress, string deviceType, bool isActive";
   ```

2. **Publish to Registry**
   ```typescript
   // When device is registered, publish to registry
   await publishData(walletClient, REGISTRY_DATA_ID, REGISTRY_SCHEMA, encodedData);
   ```

3. **Query Registry**
   ```typescript
   // Query registry to discover devices
   const registryData = await readData(REGISTRY_SCHEMA, REGISTRY_OWNER_ADDRESS, REGISTRY_DATA_ID);
   ```

### Limitations

- ❌ Need to know registry owner address
- ❌ Can't easily list all devices
- ❌ No complex queries or filtering
- ❌ No automatic cleanup

## Recommended: Hybrid Approach

### Phase 1: SDK Only (Current)
- ✅ Device registration via SDK
- ✅ Data publishing via SDK
- ✅ Data reading via SDK
- ⚠️ Device discovery via localStorage
- ❌ No subscription management
- ❌ No payment processing

### Phase 2: SDK + Registry Contract
- ✅ Device registration via SDK
- ✅ Data publishing via SDK
- ✅ Device discovery via contract
- ✅ Marketplace browsing
- ❌ No subscription management
- ❌ No payment processing

### Phase 3: SDK + Full Contracts
- ✅ Device registration via SDK
- ✅ Data publishing via SDK
- ✅ Device discovery via contract
- ✅ Subscription management via contract
- ✅ Payment processing via contract
- ✅ Access control via contract

## Decision Matrix

| Feature | SDK Only | SDK + Registry Contract | SDK + Full Contracts |
|---------|----------|-------------------------|----------------------|
| Data Publishing | ✅ | ✅ | ✅ |
| Data Reading | ✅ | ✅ | ✅ |
| Device Discovery | ⚠️ (localStorage) | ✅ | ✅ |
| Subscription Management | ❌ | ❌ | ✅ |
| Payment Processing | ❌ | ❌ | ✅ |
| Access Control | ❌ | ❌ | ✅ |
| Complexity | Low | Medium | High |
| Cost | Low | Medium | High |
| Time to Market | Fast | Medium | Slow |

## Conclusion

### For MVP/Prototype
**Use SDK only** - Fast to implement, no contract deployment needed

### For Production
**Use SDK + Smart Contracts** - Full functionality, better UX, decentralized

### Best Practice
**Use SDK for data + Contracts for business logic**
- SDK: Data storage and reading (handled by pre-deployed contract)
- Contracts: Registry, subscriptions, payments, access control

## Next Steps

1. **Continue with SDK only** for MVP ✅
2. **Add registry contract** when you need device discovery
3. **Add subscription contract** when you need payments
4. **Add access control** when you need to restrict data access

The SDK handles the hard part (data storage), so you only need contracts for business logic!

