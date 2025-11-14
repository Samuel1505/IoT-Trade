# Device Ownership Verification

This document describes the device ownership verification system implemented to ensure that users can only register devices they actually own or have access to.

## Overview

The verification system uses a **challenge-response mechanism** to verify device ownership before allowing registration on the blockchain.

## How It Works

### Current Implementation (MVP)

1. **User enters serial number** → System generates device address
2. **System generates verification challenge** → Creates 6-digit code (expires in 10 minutes)
3. **Verification code displayed** → For demo, shown on web UI (in production, sent to device)
4. **User enters code** → Verifies ownership
5. **If verified** → Proceeds to device registration

### Production Implementation Options

The system is designed to support multiple verification methods:

#### Option 1: Device Display Screen
- Verification code is displayed on the physical device's screen
- User reads code from device and enters it on web UI
- **Pros**: Direct proof of physical access
- **Cons**: Requires device with display

#### Option 2: SMS/Email Notification
- Code is sent to device owner's registered phone/email
- User enters code from message
- **Pros**: Works for devices without display
- **Cons**: Requires phone/email registration

#### Option 3: Device API Response
- Web service sends challenge to device via API
- Device signs challenge with private key
- Device responds with signed challenge
- System verifies signature
- **Pros**: Fully automated, cryptographically secure
- **Cons**: Requires device API endpoint

#### Option 4: Mobile App/QR Code
- Device generates QR code with verification token
- User scans QR code with mobile app
- App sends verification to backend
- **Pros**: Convenient, secure
- **Cons**: Requires mobile app development

#### Option 5: Cryptographic Challenge-Response
- Device has embedded private key
- System sends cryptographic challenge
- Device signs challenge and returns signature
- System verifies signature matches device's public key
- **Pros**: Most secure, no manual entry
- **Cons**: Requires device firmware with crypto capabilities

## Verification Flow

```
┌─────────────────┐
│ Enter Serial #  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generate Device │
│    Address      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────┐
│ Generate 6-digit│ ────▶│ Store Challenge
│  Verification   │      │   (10 min)   │
│      Code       │      └──────────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Send Code to    │
│   Device (SMS/  │
│  Email/API/     │
│   Display)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ User Enters     │
│      Code       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Verify Code     │
│  (5 attempts)   │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Valid?  │
    └────┬────┘
         │
    ┌────┴────┐
    │    YES  │────▶ Proceed to Registration
    │    NO   │────▶ Show Error, Allow Retry
    └─────────┘
```

## Security Features

1. **Time-Limited Codes**: Verification codes expire after 10 minutes
2. **Attempt Limiting**: Maximum 5 verification attempts per challenge
3. **One-Time Use**: Once verified, challenge is deleted
4. **Challenge Expiration**: Expired challenges are automatically cleaned up

## Current Status

### ✅ Implemented
- Challenge generation with 6-digit codes
- Code expiration (10 minutes)
- Attempt limiting (5 attempts)
- Verification UI with countdown timer
- Code entry validation
- Challenge cleanup

### 🚧 TODO for Production
- [ ] Implement actual device API communication
- [ ] Add SMS/email sending via Twilio/SendGrid
- [ ] Implement cryptographic challenge-response for devices with private keys
- [ ] Add QR code generation/scanning flow
- [ ] Store challenges in Redis/database (currently in-memory)
- [ ] Add device registration endpoint in backend
- [ ] Implement device firmware SDK for verification

## API Structure (Future)

### Backend Endpoint: `/api/devices/verify`

```typescript
POST /api/devices/verify
Body: {
  deviceAddress: string;
  challenge: string;
  deviceType: DeviceType;
}

Response: {
  verified: boolean;
  signedChallenge?: string;
  error?: string;
}
```

### Device API Endpoint (on device or gateway)

```typescript
POST /device/verify
Headers: {
  Authorization: "Bearer <device-api-key>"
}
Body: {
  challenge: string;
  serialNumber: string;
}

Response: {
  verified: boolean;
  signature: string;
  timestamp: number;
}
```

## Usage Example

```typescript
// Generate verification challenge
const challenge = generateVerificationChallenge(serialNumber, deviceAddress);
// Returns: { challenge: "0x...", verificationCode: "123456", expiresIn: 600 }

// Send code to device
await sendVerificationCodeToDevice(serialNumber, challenge.verificationCode, deviceAddress);

// Verify code when user enters it
const result = verifyDeviceChallenge(serialNumber, userEnteredCode);
if (result.verified) {
  // Proceed with registration
  await registerDevice(...);
}
```

## Testing

For testing purposes, the verification code is currently displayed on the web UI. This allows:
- Quick testing of the verification flow
- Demonstration of the system
- Development without physical devices

In production, remove the code display and implement one of the verification methods above.

## Notes

- The current in-memory storage will not persist across server restarts
- For production, use Redis or a database to store challenges
- Consider implementing rate limiting to prevent abuse
- Add device fingerprinting for additional security
- Consider multi-factor authentication for high-value devices

