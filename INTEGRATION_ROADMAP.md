# IoT-Trade Integration Roadmap

## ✅ Completed Integrations

### Phase 1: Core Infrastructure ✅
- ✅ Device registration via Somnia Data Streams SDK
- ✅ Device registration via Smart Contract (DeviceRegistry)
- ✅ Data publishing (GPS, Weather, Air Quality) via SDK
- ✅ Data reading from Somnia streams
- ✅ Device discovery from on-chain registry
- ✅ Marketplace browsing
- ✅ Dashboard for device owners
- ✅ Device pause/play functionality
- ✅ Device settings page
- ✅ Stream viewer with charts/table/map views

## 🚧 Next Priority Integrations

### Phase 2: Subscription & Payment System (HIGH PRIORITY)

#### 1. **Real Subscription Purchases** ⚠️
**Current State:** Subscribe button creates mock subscription locally  
**Needed:** Connect to blockchain `purchaseDeviceAccess` function

**What to implement:**
- Update `handleSubscribe` in device preview page to call `purchaseDeviceAccess`
- Calculate payment amount based on subscription duration
- Send transaction with proper ETH value
- Wait for transaction confirmation
- Update subscription state with real expiry from blockchain

**Files to modify:**
- `frontend/src/app/device/[id]/page.tsx` - `handleSubscribe` function
- Connect to `purchaseDeviceAccess` in `registryService.ts`

#### 2. **Load Subscriptions from Blockchain** ⚠️
**Current State:** Subscriptions stored only in local state  
**Needed:** Load actual subscriptions from `getAccessExpiry` contract call

**What to implement:**
- Create `loadUserSubscriptions` function that queries blockchain
- Check access expiry for all subscribed devices
- Update subscription status (Active/Expired) based on expiry
- Refresh subscriptions page to show real data

**Files to create/modify:**
- New service function in `deviceRegistry.ts` or `registryService.ts`
- Update `AppContext.tsx` to load subscriptions on mount
- Update subscription page to use real data

#### 3. **Access Control** ⚠️
**Current State:** Anyone can read any device's data  
**Needed:** Check subscription status before allowing access

**What to implement:**
- Add `checkAccess` function that verifies subscription expiry
- Check access in stream page before showing data
- Show "Subscribe to Access" message if no valid subscription
- Allow preview of limited data (last 3 points) without subscription

**Files to modify:**
- `frontend/src/app/stream/[id]/page.tsx` - Add access check
- `frontend/src/services/registryService.ts` - Add checkAccess function

### Phase 3: Revenue & Analytics (MEDIUM PRIORITY)

#### 4. **Revenue Tracking for Device Owners** 📊
**Current State:** No revenue tracking  
**Needed:** Show earnings from subscriptions

**What to implement:**
- Query `totalPaid` mapping in contract for each device
- Display total earnings per device in dashboard
- Show earnings breakdown (by subscriber, by time period)
- Track and display payments received

**Files to modify:**
- `frontend/src/services/registryService.ts` - Add `getTotalRevenue` function
- `frontend/src/app/dashboard/page.tsx` - Display earnings
- Update `UserDevice` type to include earnings data

#### 5. **Historical Data Tracking** 📈
**Current State:** Only latest data point available  
**Needed:** Track and display historical data

**What to implement:**
- Store data points in local state/cache
- Use event logs to track all published data points
- Or implement off-chain storage with on-chain references
- Add historical data chart view

**Files to create/modify:**
- New service for historical data storage/retrieval
- Update stream page to show historical charts

### Phase 4: Advanced Features (LOW PRIORITY)

#### 6. **Subscription Renewal** 🔄
**Current State:** Manual renewal needed  
**Needed:** Auto-renewal functionality

**What to implement:**
- Check subscription expiry periodically
- Auto-renew if enabled and sufficient balance
- Notify user before auto-renewal

#### 7. **Subscription Cancellation with Refunds** 💰
**Current State:** Cancellation just removes from local state  
**Needed:** On-chain cancellation and refund calculation

**What to implement:**
- Calculate unused subscription value
- Implement refund logic (may need contract modification)
- Cancel subscription on-chain

#### 8. **Data Access Logs** 📝
**Current State:** No tracking of who accessed data  
**Needed:** Track data access events

**What to implement:**
- Log when subscribers access device data
- Show access analytics to device owners
- Track popular devices/data points

## Recommended Next Steps (Priority Order)

### 🎯 **Immediate (Next 1-2 days):**
1. **Real Subscription Purchases** - Make the subscribe button actually work on-chain
2. **Load Subscriptions from Blockchain** - Sync subscriptions with blockchain state

### 📅 **Short-term (Next week):**
3. **Access Control** - Prevent unauthorized data access
4. **Revenue Tracking** - Show earnings to device owners

### 🔮 **Medium-term (Next 2 weeks):**
5. **Historical Data Tracking** - Better data visualization
6. **Subscription Renewal** - Better UX for renewals

## Implementation Notes

### Subscription Purchase Flow:
```typescript
// 1. User selects subscription duration
// 2. Calculate total payment = pricePerDataPoint * duration
// 3. Call purchaseDeviceAccess(deviceAddress, value)
// 4. Transaction sends ETH to contract
// 5. Contract updates accessExpiry mapping
// 6. Contract forwards payment to device owner
// 7. Update UI with new subscription
```

### Access Check Flow:
```typescript
// 1. User tries to access device stream
// 2. Check getAccessExpiry(userAddress, deviceAddress)
// 3. Compare expiry with current timestamp
// 4. If valid: Show full data access
// 5. If invalid: Show preview only + subscribe prompt
```

### Revenue Tracking Flow:
```typescript
// 1. Query totalPaid mapping for each device owner
// 2. Aggregate payments by device
// 3. Display in dashboard
// 4. Show breakdown by subscriber (optional)
```

