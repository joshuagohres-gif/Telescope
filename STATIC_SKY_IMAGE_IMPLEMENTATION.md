# Static Sky Image Implementation

## Overview

The star map for telescope position now supports using a static sky image instead of computer-generated stars. Dynamic objects (planets, moon, sun) continue to be rendered programmatically and will overlay on top of the static sky image.

## Features

- **Static Sky Image Layer**: New `StaticSkyImageLayer` component that renders equirectangular sky images
- **Coordinate Transformation**: Automatically transforms the sky image based on observer location and time to show the correct sky orientation
- **Dynamic Objects Preserved**: Planets, moon, and sun continue to be rendered as separate dynamic layers
- **Fallback Support**: If no sky image is provided, falls back to a gradient (or can use computer-generated stars)

## Configuration

### Environment Variable

Set the `VITE_SKY_IMAGE_URL` environment variable in your `.env` file:

```bash
VITE_SKY_IMAGE_URL=https://example.com/path/to/sky-image.png
```

### Programmatic Configuration

You can also configure it when creating a `StarBackdrop` instance:

```typescript
const backdrop = new StarBackdrop({
  container: document.getElementById('sky-container'),
  latitude: 37.7749,
  longitude: -122.4194,
  useStaticSkyImage: true,  // Enable static sky image (default: true)
  skyImageUrl: 'https://example.com/sky.png',  // Optional: override env var
});
```

### Disable Static Sky Image

To use computer-generated stars instead:

```typescript
const backdrop = new StarBackdrop({
  // ... other config
  useStaticSkyImage: false,  // Use computer-generated stars
});
```

## Sky Image Requirements

The sky image must be in **equirectangular projection** format:
- **Longitude (0-360°)**: Maps to Right Ascension (RA)
- **Latitude (-90 to +90°)**: Maps to Declination (Dec)

Common sources for sky images:
- Stellarium Web API
- Aladin Sky Atlas
- Custom uploaded equirectangular sky images
- Public domain star charts

## How It Works

1. **Coordinate Transformation**: The shader converts the camera's view direction (in horizontal Alt/Az coordinates) to equatorial coordinates (RA/Dec) based on:
   - Observer's latitude and longitude
   - Local Sidereal Time (calculated from observer location and current time)

2. **Texture Mapping**: The RA/Dec coordinates are mapped to the equirectangular texture:
   - RA (0 to 2π) → texture U coordinate (0 to 1)
   - Dec (-π/2 to π/2) → texture V coordinate (1 to 0, inverted)

3. **Real-time Updates**: As the telescope position changes or time advances, the sky image automatically rotates to show the correct portion of the sky for the observer's location and perspective.

## Implementation Details

### Files Modified

- `client/src/simulatedSkyBackdrop/StarBackdrop.ts`: Updated to support static sky image option
- `client/src/simulatedSkyBackdrop/renderer/StaticSkyImageLayer.ts`: New layer for rendering static sky images
- `.env.example`: Added `VITE_SKY_IMAGE_URL` configuration option

### Key Components

- **StaticSkyImageLayer**: WebGL-based renderer that:
  - Loads equirectangular sky images as textures
  - Applies coordinate transformations in the fragment shader
  - Handles texture loading errors gracefully
  - Falls back to gradient if no image is provided

- **StarBackdrop**: Main controller that:
  - Supports both static sky images and computer-generated stars
  - Automatically updates sky orientation based on observer location/time
  - Maintains separate layers for dynamic objects (planets, moon, sun)

## Usage Example

```typescript
import { StarBackdrop } from '@/simulatedSkyBackdrop';

// Create backdrop with static sky image
const backdrop = new StarBackdrop({
  container: document.getElementById('telescope-viewport'),
  latitude: 40.7128,  // New York
  longitude: -74.0060,
  useStaticSkyImage: true,
  skyImageUrl: process.env.VITE_SKY_IMAGE_URL,  // From environment
  autoUpdateTime: true,
});

// Point telescope at a target
backdrop.updateTarget(45, 180);  // 45° altitude, South

// Update observer location
backdrop.setLocation(37.7749, -122.4194);  // San Francisco
```

## Notes

- The static sky image rotates automatically based on Local Sidereal Time, ensuring the correct stars are visible for the observer's location and time
- Dynamic objects (planets, moon, sun) are always rendered on top of the static sky image
- If the sky image fails to load or is not provided, the system gracefully falls back to a dark blue gradient
- The coordinate transformation accounts for the observer's latitude to correctly display the visible portion of the celestial sphere
