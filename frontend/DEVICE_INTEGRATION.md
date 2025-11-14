# Device Integration Guide - Blockchain-Based Verification

This guide explains how IoT devices should retrieve verification codes from Somnia blockchain during device registration.

## Overview

**NO BACKEND NEEDED!** Verification codes are published directly to Somnia blockchain. Devices read verification codes directly from the blockchain using the Somnia Data Streams SDK.

## Verification Flow

```
1. User enters serial number in web UI
   ↓
2. System generates verification code and publishes to Somnia blockchain
   ↓
3. Device reads verification code from blockchain using serial number
   ↓
4. Device displays code on screen
   ↓
5. User enters code from device into web UI
   ↓
6. System verifies code from blockchain and proceeds with registration
```

## Blockchain-Based Verification

### Schema

**Verification Code Schema:** `DEVICE_VERIFICATION_SCHEMA`
```
string serialNumber, string verificationCode, uint64 expiresAt, 
address ownerAddress, bytes32 entityId, uint256 nonce
```

### Data ID Generation

The verification code is stored with a deterministic data ID:
```
dataId = keccak256("verification_" + serialNumber)
```

### Publisher

The verification code is published by the device owner's wallet address (the address that starts registration).

## Reading Verification Code from Blockchain

Devices can read verification codes directly from Somnia blockchain using the Somnia Data Streams SDK:

### Required Information
- **Serial Number**: Device's serial number
- **Owner Address**: Wallet address that started registration (publisher)
- **RPC Endpoint**: `https://dream-rpc.somnia.network`
- **Chain ID**: `50312` (Somnia Testnet)

## Device Implementation

### Option 1: Reading from Blockchain (Recommended)

Your device should read the verification code from Somnia blockchain when it detects a registration attempt:

```python
# Install: pip install somnia-streams-sdk viem
from somnia_streams import SDK, SchemaEncoder
from viem import createPublicClient, http
import time

SERIAL_NUMBER = "SN-ABC123XYZ"
OWNER_ADDRESS = "0x..."  # Owner's wallet address (publisher)
RPC_URL = "https://dream-rpc.somnia.network"
CHAIN_ID = 50312

VERIFICATION_SCHEMA = "string serialNumber, string verificationCode, uint64 expiresAt, address ownerAddress, bytes32 entityId, uint256 nonce"

def read_verification_code_from_blockchain():
    """Read verification code from Somnia blockchain"""
    # Create public client (no wallet needed for reading)
    public_client = createPublicClient(
        chain={"id": CHAIN_ID},
        transport=http(RPC_URL)
    )
    
    # Initialize Somnia SDK
    sdk = SDK(public=public_client)
    
    # Generate data ID (same as used when publishing)
    from viem import keccak256, to_bytes
    data_id = keccak256(to_bytes(f"verification_{SERIAL_NUMBER}"))
    
    # Compute schema ID
    schema_id = await sdk.streams.computeSchemaId(VERIFICATION_SCHEMA)
    
    # Read verification code from blockchain
    encoded_data = await sdk.streams.getByKey(schema_id, OWNER_ADDRESS, data_id)
    
    if encoded_data:
        # Decode verification code
        encoder = SchemaEncoder(VERIFICATION_SCHEMA)
        decoded = encoder.decode(encoded_data)
        
        verification_code = decoded.verificationCode
        expires_at = decoded.expiresAt
        expires_in = (expires_at - int(time.time() * 1000)) // 1000
        
        # Display code on device screen
        display_verification_code(verification_code, expires_in)
        return verification_code
    
    return None

def poll_verification_code():
    """Poll blockchain for verification code"""
    POLL_INTERVAL = 5  # seconds
    
    while True:
        try:
            code = read_verification_code_from_blockchain()
            if code:
                break
            time.sleep(POLL_INTERVAL)
        except Exception as e:
            print(f"Error reading verification code: {e}")
            time.sleep(POLL_INTERVAL * 2)

def display_verification_code(code, expires_in):
    """Display verification code on device screen"""
    print(f"Verification Code: {code}")
    print(f"Expires in: {expires_in} seconds")
    # For devices with LCD/display, update the screen
    # lcd.clear()
    # lcd.write(f"Code: {code}")
```

### Option 2: Push Notification (For Connected Devices)

If your device supports push notifications or webhooks, you can implement:

```python
# When device receives notification about registration
def on_registration_notification():
    serial_number = get_serial_number()
    verification_code = fetch_verification_code(serial_number)
    display_verification_code(verification_code)
```

### Option 3: Manual Check (For Devices with Limited Network Access)

For devices that can't automatically poll, provide a button/command to check:

```python
def check_verification_code():
    """Manually check for verification code"""
    serial_number = get_serial_number()
    code = fetch_verification_code(serial_number)
    
    if code:
        display_verification_code(code)
    else:
        display_message("No verification code found. Please start registration on web UI.")
```

## Implementation Examples

### Arduino/ESP32 Example (C++)

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* apiUrl = "https://your-domain.com/api/devices/verify/SN-ABC123XYZ";

void setup() {
  Serial.begin(115200);
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  
  Serial.println("WiFi connected!");
}

void loop() {
  pollVerificationCode();
  delay(5000); // Poll every 5 seconds
}

void pollVerificationCode() {
  HTTPClient http;
  http.begin(apiUrl);
  
  int httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    
    // Parse JSON (use ArduinoJson library)
    // Extract verificationCode from response
    // Display on LCD or Serial
    
    Serial.println("Verification Code Retrieved!");
    Serial.println(payload);
  }
  
  http.end();
}
```

### Raspberry Pi Example (Python)

```python
#!/usr/bin/env python3
import requests
import time
from RPi import GPIO
from lcd import LCD  # Assuming you have an LCD library

LCD_PIN_RS = 21
LCD_PIN_E = 20
LCD_PINS_D = [16, 12, 25, 24]

lcd = LCD(LCD_PIN_RS, LCD_PIN_E, LCD_PINS_D)

def poll_and_display_code():
    serial_number = "SN-ABC123XYZ"
    api_url = f"https://your-domain.com/api/devices/verify/{serial_number}"
    
    while True:
        try:
            response = requests.get(api_url, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                
                if "verificationCode" in data:
                    code = data["verificationCode"]
                    expires_in = data["expiresIn"]
                    
                    # Display on LCD
                    lcd.clear()
                    lcd.write("Verify Code:", row=0)
                    lcd.write(code, row=1)
                    lcd.write(f"Expires: {expires_in}s", row=2)
                    
                    return code
                    
        except requests.RequestException as e:
            print(f"Error: {e}")
            
        time.sleep(5)

if __name__ == "__main__":
    poll_and_display_code()
```

## Best Practices

1. **Polling Interval**: Poll every 5-10 seconds to balance responsiveness and server load
2. **Timeout**: Set request timeouts (e.g., 5 seconds) to prevent hanging
3. **Error Handling**: Handle network errors gracefully and retry with exponential backoff
4. **Display Format**: Display code clearly with large, readable font
5. **Expiration Warning**: Show time remaining if possible
6. **Stop Polling**: Once code is displayed, stop polling to reduce server load

## Security Considerations

1. **Rate Limiting**: API endpoint may have rate limiting - respect this
2. **Serial Number**: Only devices with the correct serial number can retrieve their code
3. **Code Expiration**: Codes expire after 10 minutes for security
4. **One-Time Use**: Once verified, the code is deleted and cannot be reused

## Testing

For testing, you can manually test the API endpoint:

```bash
# Get verification code
curl https://your-domain.com/api/devices/verify/SN-ABC123XYZ

# Expected response:
# {
#   "serialNumber": "SN-ABC123XYZ",
#   "verificationCode": "123456",
#   "expiresAt": 1234567890000,
#   "expiresIn": 600
# }
```

## Troubleshooting

### Code Not Found
- Ensure registration process has started on web UI
- Verify serial number matches exactly (case-sensitive)
- Check that code hasn't expired (10-minute limit)

### Network Errors
- Check device's internet connectivity
- Verify API endpoint URL is correct
- Check firewall/network restrictions

### Code Expired
- Generate new code by starting registration process again
- Ensure device checks code within 10 minutes

## Support

For device integration support, contact your development team or refer to the main documentation.

