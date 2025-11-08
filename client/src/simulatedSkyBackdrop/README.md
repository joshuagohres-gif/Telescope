# Simulated Sky Backdrop

A self-contained module for rendering astronomically accurate star positions in real-time using WebGL2.

## Features

- **Real Star Catalog**: 20 brightest stars (Sirius, Vega, Polaris, etc.)
- **Accurate Coordinate Transforms**:
  - Proper motion compensation (mas/yr)
  - Precession (IAU 2006, J2000 → current epoch)
  - Local Sidereal Time calculation
  - Alt/Az conversion for observer location
  - Atmospheric refraction (Saemundsson formula)
- **WebGL2 Rendering**:
  - GPU-accelerated star rendering
  - Magnitude-based sizing
  - B-V color index mapping
  - Gradient sky dome
- **Interactive Camera**: Pan and zoom the sky
- **Real-time Updates**: Auto-update star positions as time progresses

## Usage

### Basic Setup

```typescript
import { StarBackdrop } from './simulatedSkyBackdrop';

const container = document.getElementById('sky-container');

const backdrop = new StarBackdrop({
  container,
  latitude: 37.7749,    // Observer latitude (degrees, positive North)
  longitude: -122.4194, // Observer longitude (degrees, positive East)
  time: new Date(),     // Observation time
  autoUpdateTime: true  // Update positions in real-time
});
```

### Quick Demo

```typescript
import { createDemo } from './simulatedSkyBackdrop';

const container = document.getElementById('sky-container');
const backdrop = createDemo(container);
```

## API Reference

### `StarBackdrop`

Main class for managing the star backdrop.

#### Constructor

```typescript
new StarBackdrop(config: StarBackdropConfig)
```

**Config Options:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `container` | `HTMLElement` | required | Container to attach canvas to |
| `latitude` | `number` | required | Observer latitude (degrees, +N) |
| `longitude` | `number` | required | Observer longitude (degrees, +E) |
| `time` | `Date` | `new Date()` | Observation time |
| `width` | `number` | container width | Canvas width |
| `height` | `number` | container height | Canvas height |
| `antialias` | `boolean` | `true` | Enable antialiasing |
| `starScale` | `number` | `2.0` | Star point size scale |
| `applyRefraction` | `boolean` | `true` | Apply atmospheric refraction |
| `autoUpdateTime` | `boolean` | `false` | Auto-update time every second |
| `initialYaw` | `number` | `0` | Initial camera yaw (radians) |
| `initialPitch` | `number` | `π/4` | Initial camera pitch (radians) |

#### Methods

##### `setLocation(latitude: number, longitude: number): void`
Update observer location.

```typescript
backdrop.setLocation(40.7128, -74.0060); // Move to New York
```

##### `setTime(time: Date): void`
Update observation time.

```typescript
backdrop.setTime(new Date('2025-12-31T23:59:59Z'));
```

##### `setCameraOrientation(yaw: number, pitch: number): void`
Set camera orientation in radians.

- `yaw`: 0 = North, π/2 = East, π = South, 3π/2 = West
- `pitch`: 0 = horizon, π/2 = zenith, -π/2 = nadir

```typescript
backdrop.setCameraOrientation(Math.PI, Math.PI / 4); // Look South, 45° up
```

##### `pointAtAltAz(altitude: number, azimuth: number): void`
Point camera at specific Alt/Az coordinates (in degrees).

```typescript
backdrop.pointAtAltAz(45, 180); // 45° altitude, South
```

##### `setFieldOfView(fovDegrees: number): void`
Set camera field of view (10-120 degrees).

```typescript
backdrop.setFieldOfView(80); // Wide angle view
```

##### `setAutoUpdate(enabled: boolean): void`
Enable/disable automatic time updates.

```typescript
backdrop.setAutoUpdate(true); // Update star positions every second
```

##### `resize(width?: number, height?: number): void`
Resize canvas.

```typescript
backdrop.resize(1920, 1080);
```

##### `dispose(): void`
Cleanup resources and remove canvas.

```typescript
backdrop.dispose();
```

## Examples

### Point at a Specific Star

```typescript
import { StarBackdrop, equatorialToHorizontal } from './simulatedSkyBackdrop';

const backdrop = new StarBackdrop({
  container: document.getElementById('sky'),
  latitude: 37.7749,
  longitude: -122.4194,
});

// Point at Polaris (RA: 2h 31m, Dec: +89° 15')
const polaris = {
  ra: (2 + 31/60) * 15 * Math.PI / 180,  // Convert hours to radians
  dec: 89.264 * Math.PI / 180
};

const { altitude, azimuth } = equatorialToHorizontal(
  polaris.ra,
  polaris.dec,
  new Date(),
  37.7749,
  -122.4194
);

backdrop.pointAtAltAz(
  altitude * 180 / Math.PI,
  azimuth * 180 / Math.PI
);
```

### Sync with Telescope Pointing

```typescript
// Assuming telescope provides RA/Dec coordinates
function syncBackdropWithTelescope(telescope, backdrop) {
  const { ra, dec } = telescope.getCurrentPosition();

  const { altitude, azimuth } = equatorialToHorizontal(
    ra,
    dec,
    new Date(),
    telescope.latitude,
    telescope.longitude
  );

  backdrop.pointAtAltAz(
    altitude * 180 / Math.PI,
    azimuth * 180 / Math.PI
  );
}
```

## Technical Details

### Coordinate Transform Pipeline

The module implements the complete astronomical coordinate transform chain:

1. **Proper Motion**: Compensates for star movement since J2000 epoch
   - Uses proper motion in RA/Dec (milliarcseconds/year)
   - pmRA already includes cos(dec) factor from catalog

2. **Precession**: Converts J2000 coordinates to current epoch
   - IAU 2006 precession model
   - Accurate to ~1 arcsec over ±200 years from J2000

3. **Local Sidereal Time**: Converts UT to observer's local sky rotation
   - IAU 1982 GMST formula
   - Accurate to ~0.1 seconds

4. **Alt/Az Conversion**: Transforms to observer's horizon coordinates
   - Uses spherical trigonometry
   - Accounts for observer latitude/longitude

5. **Atmospheric Refraction**: Corrects for atmospheric bending
   - Saemundsson formula (1986)
   - Accurate to ~0.1' for altitude > 15°
   - Temperature/pressure corrections available

### Star Catalog

The demo uses 20 brightest stars from the Hipparcos/Yale Bright Star Catalog:

| Star | V mag | Spectral Type |
|------|-------|---------------|
| Sirius | -1.46 | A1V |
| Canopus | -0.72 | F0Ib |
| Arcturus | -0.04 | K1.5III |
| Vega | 0.03 | A0V |
| ... | ... | ... |

Each star includes:
- J2000 RA/Dec coordinates
- Proper motion (pmRA, pmDec)
- Visual magnitude
- B-V color index for realistic coloring

### WebGL Rendering

**Sky Dome**: Inverted sphere with gradient shader
- Horizon: darker blue (#1a264d)
- Zenith: nearly black (#000008)

**Star Points**: GPU-accelerated point primitives
- Size: `brightness × scale`, where brightness = 2.512^(-magnitude)
- Color: B-V index mapped to RGB (blue → white → yellow → red)
- Blending: Additive (GL_SRC_ALPHA, GL_ONE) for realistic glow
- Soft edges: Fragment shader with radial falloff

## Architecture

```
simulatedSkyBackdrop/
├── StarBackdrop.ts       # Main controller class
├── index.ts              # Public API exports
├── math/                 # Astronomical calculations
│   ├── sidereal.ts       # LST, Julian Date
│   ├── precession.ts     # Precession, proper motion
│   ├── refraction.ts     # Atmospheric refraction
│   └── altaz.ts          # Equatorial → Horizontal
├── renderer/             # WebGL2 rendering
│   ├── SceneHost.ts      # WebGL context, render loop
│   ├── SkyDome.ts        # Sky background
│   └── StarLayer.ts      # Star rendering
└── data/
    └── brightStars.ts    # Star catalog

```

## Future Enhancements

Potential additions (not implemented):

- Full star catalogs (BSC ~9k, Hipparcos ~118k)
- Milky Way panorama texture
- Deep sky objects (M31, M42, etc.)
- Constellation lines
- Grid overlays (RA/Dec, Alt/Az)
- Solar system objects (Sun, Moon, planets)
- Light pollution modeling
- Time controls (fast-forward, rewind)

## Browser Requirements

- WebGL2 support (Chrome 56+, Firefox 51+, Safari 15+)
- ES2015+ JavaScript
