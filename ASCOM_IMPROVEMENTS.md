# ASCOM Compatibility Improvements

## Overview
This document describes the comprehensive improvements made to the ASCOM (Astronomy Common Object Model) Alpaca compatibility layer, enabling the application to control real telescopes, cameras, and focusers following the ASCOM Alpaca REST API v1 specification.

## Key Improvements

### 1. Enhanced Telescope Client (`AscomTelescopeClient`)

#### Capability Checking
Added methods to query device capabilities before attempting operations:
- `canPark()` / `canUnpark()` - Check if telescope supports parking
- `canFindHome()` - Check if telescope can find home position
- `canSetTracking()` - Check if tracking can be controlled
- `canSlew()` / `canSlewAsync()` - Check slewing capabilities
- `canSlewAltAz()` / `canSlewAltAzAsync()` - Check Alt/Az slewing support
- `canMoveAxis(axis)` - Check if directional axis movement is supported
- `canPulseGuide()` - Check if pulse guiding is available

#### Extended Telescope Control
- **Multiple slewing modes**: Synchronous and asynchronous slewing for both equatorial (RA/Dec) and horizontal (Alt/Az) coordinate systems
- **Axis movement**: Direct control of primary (RA/Az) and secondary (Dec/Alt) axes for manual slewing
- **Pulse guiding**: Support for autoguiding corrections via `pulseGuide(direction, duration)`
- **Target tracking**: Get/set target coordinates and current slew destination
- **Pier side control**: Query and set pier side for German Equatorial Mounts
- **Tracking rates**: Support for different tracking rates (sidereal, lunar, solar, king)
- **Synchronization**: Sync telescope position to known coordinates for alignment
- **Parking operations**: Both park and unpark with `setpark()` to define parking position
- **Device information**: Query device name, description, driver info, and version

### 2. New Camera Client (`AscomCameraClient`)

Full ASCOM camera support including:

#### Camera Capabilities
- `canAbortExposure()` / `canStopExposure()` - Check exposure control capabilities
- `canSetCCDTemperature()` - Check if temperature control is available

#### Camera Operations
- **Exposure control**: Start, stop, and abort exposures with progress tracking
- **Cooling system**: Control cooler on/off, set target temperature, monitor cooler power
- **Gain and offset**: Full control of camera gain and offset parameters with min/max queries
- **Binning**: Independent X and Y binning control
- **Status monitoring**: Camera state, temperature, exposure progress, image ready status
- **Image metadata**: Last exposure duration and completion percentage

### 3. New Focuser Client (`AscomFocuserClient`)

Complete ASCOM focuser support including:

#### Focuser Capabilities
- `isAbsolute()` - Check if focuser supports absolute positioning
- `canHalt()` - Check if focuser can be halted mid-movement
- `hasTempComp()` / `setTempComp()` - Temperature compensation support

#### Focuser Operations
- **Position control**: Absolute position movement with position queries
- **Movement monitoring**: Check if focuser is currently moving
- **Limits**: Query max step and max increment values
- **Temperature**: Monitor focuser temperature for compensation
- **Emergency halt**: Stop focuser movement immediately

### 4. Device Discovery (`AscomDiscovery`)

Network device discovery features:
- `discoverDevices()` - Discover all ASCOM Alpaca devices on the network
- `getServerInfo()` - Get ASCOM Alpaca server information and API versions

### 5. Improved Routes and Error Handling

#### Status Broadcasting
- Real-time status updates for ASCOM devices via WebSocket
- Automatic polling and broadcasting of telescope, camera, and focuser states
- Graceful error handling with fallback values

#### Smart Operation Execution
All telescope operations now check capabilities before execution:
- Goto operations check `canSlew` or `canSlewAsync` before attempting
- Alt/Az operations verify `canSlewAltAz` support
- Tracking operations check `canSetTracking` capability
- Parking operations verify `canPark` / `canUnpark` support
- Axis movement validates `canMoveAxis` for each axis

#### Enhanced Endpoints

**New endpoints:**
- `POST /api/telescope/unpark` - Unpark telescope
- `POST /api/camera/cooler` - Control camera cooling system
- `POST /api/focuser/halt` - Emergency halt focuser
- `GET /api/ascom/discover` - Discover ASCOM devices on network
- `GET /api/ascom/server-info` - Get ASCOM server information

**Improved endpoints:**
- `POST /api/telescope/goto` - Now supports both RA/Dec and Alt/Az with capability checking
- `POST /api/telescope/slew` - Directional slewing using axis movement
- `POST /api/camera/capture` - Full gain and binning control
- `POST /api/camera/abort` - Tries abort first, falls back to stop if needed
- `POST /api/focuser/move` - Supports both absolute and relative positioning

#### Natural Language Command Execution
Enhanced NLP command execution with full ASCOM support:
- All telescope commands check capabilities before execution
- Camera commands set gain/binning before exposure
- Focuser commands handle absolute positioning correctly
- Graceful degradation when features aren't supported

### 6. Better Error Handling and Type Safety

- **TypeScript generic types**: All ASCOM responses properly typed with `AscomResponse<T>`
- **Comprehensive error messages**: Include HTTP status codes and ASCOM error numbers
- **Graceful fallbacks**: Operations catch errors and provide meaningful feedback
- **Capability validation**: Returns clear error messages when operations aren't supported
- **Network error handling**: Distinguishes between network failures and ASCOM errors

## Technical Details

### ASCOM Response Format
All responses follow the ASCOM Alpaca standard:
```typescript
interface AscomResponse<T> {
  Value: T;
  ErrorNumber: number;
  ErrorMessage: string;
  ClientTransactionID: number;
  ServerTransactionID: number;
}
```

### Client Transaction IDs
Each client maintains a unique client ID and generates transaction IDs for request tracking and debugging.

### Content-Type
All PUT requests use `application/x-www-form-urlencoded` as required by ASCOM Alpaca specification.

### Connection Management
- Multiple device connections supported simultaneously (telescope, camera, focuser)
- `Promise.allSettled()` used for parallel connection/disconnection
- Individual device failures don't affect other devices

## Usage Examples

### Connecting to ASCOM Devices
```javascript
// Connect to ASCOM (all available devices)
POST /api/telescope/connect
{
  "type": "ascom"
}
```

### Slewing with Capability Checking
The system automatically:
1. Checks if async slewing is supported
2. Falls back to sync slewing if needed
3. Checks Alt/Az support for altitude/azimuth coordinates
4. Returns appropriate error if operation not supported

### Real-time Status
Status broadcasting includes:
- Telescope position (RA/Dec and Alt/Az)
- Slewing and tracking states
- Camera exposure progress and temperature
- Focuser position and movement state
- All data refreshed every 500ms

## Backward Compatibility

The improvements maintain full backward compatibility:
- Legacy `ascomClient` export still available (references `ascomTelescope`)
- Mock simulator continues to work as before
- All existing API endpoints remain functional

## Testing Recommendations

To test ASCOM compatibility:
1. Install an ASCOM Alpaca Remote Server (typically runs on port 11111)
2. Connect real or simulated devices (telescope, camera, focuser)
3. Use device discovery endpoint to verify devices are detected
4. Connect using "ascom" type
5. Test operations specific to your device capabilities

## Future Enhancements

Potential areas for future improvement:
- Rotator support (ASCOM Alpaca rotator device)
- Filter wheel support
- Switch support for auxiliary equipment
- Dome/cover control
- Weather station integration
- Advanced plate solving integration
- Multi-server support (different devices on different servers)

## ASCOM Alpaca Resources

- Official specification: https://ascom-standards.org/api/
- Device simulator: ASCOM Platform with Alpaca Remote Server
- Testing tools: ASCOM Conform Universal
