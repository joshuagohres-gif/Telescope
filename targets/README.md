# Targets Pack (C6, C7, C8)

This document describes the Targets Pack features for fast target discovery: showpieces visible tonight, ISS pass finder, and lunar features nearby.

## Features

- **C6**: Tonight's showpieces - Objects visible tonight with hourly alt/az
- **C7**: ISS visible passes (12h) - ISS pass finder with visibility conditions
- **C8**: Lunar features radius search - Find lunar features within a radius

## Feature Flag

All Targets Pack endpoints require the `ASTRO_TARGETS_ENABLED` environment variable to be set to `"true"`:

```bash
export ASTRO_TARGETS_ENABLED=true
```

## Database Schema

### catalog.object
- `id` (SERIAL PK)
- `name` (TEXT) - Primary name
- `class` (TEXT) - Object class (nebula, galaxy, cluster, etc.)
- `ra_j2000_deg` (REAL) - Right Ascension in degrees (J2000)
- `dec_j2000_deg` (REAL) - Declination in degrees (J2000)
- `mag` (REAL) - Apparent magnitude

### satobs.satellite
- `norad_id` (INT PK) - NORAD catalog ID
- `name` (TEXT) - Satellite name

### satobs.tle
- `norad_id` (INT) - Foreign key to satellite
- `line1` (TEXT) - TLE line 1
- `line2` (TEXT) - TLE line 2
- `epoch` (TIMESTAMPTZ) - TLE epoch
- Primary key: `(norad_id, epoch)`

### targets.feature
- `id` (SERIAL PK)
- `body` (TEXT) - Celestial body (Moon, Mars, etc.)
- `name` (TEXT) - Feature name
- `lat_deg` (REAL) - Latitude in degrees
- `lon_deg` (REAL) - Longitude in degrees
- `diameter_km` (REAL) - Diameter in kilometers
- `type` (TEXT) - Feature type (crater, mare, mountain, etc.)

## Astronomical Utilities

### lib/astro/altaz.ts

Converts RA/Dec to Alt/Az for a given observer location and time.

**Key Functions:**
- `localSiderealTime(date, lon)` - Calculate Local Sidereal Time
- `raDecToAltAz(ra, dec, lat, lon, date)` - Convert RA/Dec to Alt/Az
- `hourlyAltAz(ra, dec, lat, lon, from, to, stepMinutes)` - Generate hourly positions
- `peakAltitude(ra, dec, lat, lon, from, to)` - Find peak altitude

**Mathematical Notes:**
- Uses standard coordinate transformation formulas
- Accounts for precession (J2000 coordinates)
- Handles hour angle calculation from LST
- Altitude: `sin(alt) = sin(lat) * sin(dec) + cos(lat) * cos(dec) * cos(HA)`
- Azimuth: calculated from altitude and hour angle

### lib/sat/propagate.ts

SGP4 wrapper for satellite orbit propagation and visibility calculations.

**Key Functions:**
- `propagateSGP4(tle, date, observer)` - Propagate satellite position
- `checkVisibility(observer, date, satPosition)` - Check visibility conditions
- `findVisiblePasses(tle, observer, from, to)` - Find visible passes

**Visibility Conditions:**
1. Observer sun altitude < -6° (astronomical twilight)
2. Satellite is sunlit (above Earth's shadow)
3. Maximum elevation >= 20°

**Mathematical Notes:**
- Uses SGP4 propagation (simplified implementation)
- Checks if satellite is in Earth's shadow cone
- Calculates topocentric coordinates from geocentric
- For production use, install `satellite.js` library for accurate SGP4

## API Endpoints

### GET /astrodb/v1/targets/tonight

Get showpieces visible tonight with hourly alt/az positions.

**Query Parameters:**
- `lat` (required) - Observer latitude in degrees
- `lon` (required) - Observer longitude in degrees
- `from` (required) - Start time (ISO 8601)
- `to` (required) - End time (ISO 8601)
- `step` (optional) - Step size, e.g., "60m" or "1h" (default: "60m")

**Response:**
```json
{
  "data": [
    {
      "name": "Orion Nebula",
      "class": "nebula",
      "ra": 83.8221,
      "dec": -5.3911,
      "mag": 4.0,
      "hourly": [
        {
          "time": "2024-01-15T20:00:00Z",
          "alt": 45.2,
          "az": 135.8
        },
        ...
      ],
      "peak_alt_deg": 67.5
    },
    ...
  ],
  "version": "1.0.0",
  "generated_at": "2024-01-15T10:30:00Z"
}
```

**Example:**
```bash
curl "http://localhost:5000/astrodb/v1/targets/tonight?lat=34.2242&lon=-118.0574&from=2024-01-15T20:00:00Z&to=2024-01-16T06:00:00Z&step=60m"
```

**Notes:**
- Results are sorted by `peak_alt_deg` (descending)
- Only objects that rise above horizon are included
- Hourly samples are generated for the specified time window

### GET /astrodb/v1/targets/passes

Find visible satellite passes (e.g., ISS).

**Query Parameters:**
- `norad_id` (required) - NORAD catalog ID (25544 for ISS)
- `lat` (required) - Observer latitude in degrees
- `lon` (required) - Observer longitude in degrees
- `alt_m` (optional) - Observer altitude in meters (default: 0)
- `from` (required) - Start time (ISO 8601)
- `to` (required) - End time (ISO 8601)

**Response:**
```json
{
  "data": [
    {
      "start": "2024-01-15T20:15:00Z",
      "peak": "2024-01-15T20:18:30Z",
      "end": "2024-01-15T20:22:00Z",
      "max_el_deg": 67.3,
      "az_start": 225.5,
      "az_peak": 180.2
    },
    ...
  ],
  "version": "1.0.0",
  "generated_at": "2024-01-15T10:30:00Z"
}
```

**Example:**
```bash
curl "http://localhost:5000/astrodb/v1/targets/passes?norad_id=25544&lat=34.2242&lon=-118.0574&alt_m=0&from=2024-01-15T20:00:00Z&to=2024-01-16T08:00:00Z"
```

**Notes:**
- Returns 0-3 passes typically for a 12-hour window
- Passes are filtered by visibility conditions (dark sky, sunlit satellite, max el >= 20°)
- Times are in UTC

### GET /astrodb/v1/targets/features

Search for lunar/planetary features within a radius.

**Query Parameters:**
- `body` (optional) - Celestial body (default: "Moon")
- `near` (required for radius search) - "lat,lon" format
- `radius_km` (required for radius search) - Search radius in kilometers
- `feature_type` (optional) - Filter by feature type
- `name` (optional) - Filter by name (partial match)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "body": "moon",
      "name": "Plato",
      "featureType": "crater",
      "lat": 51.6,
      "lon": -9.4,
      "diameter": 101,
      "description": "Source: IAU Gazetteer"
    },
    ...
  ],
  "version": "1.0.0",
  "generated_at": "2024-01-15T10:30:00Z"
}
```

**Example:**
```bash
# Search near Plato crater (51.6°N, 9.4°W) within 200km
curl "http://localhost:5000/astrodb/v1/targets/features?body=Moon&near=51.6,-9.4&radius_km=200"
```

**Notes:**
- Uses haversine formula for distance calculation
- Returns features sorted by distance (nearest first)
- Can be used for any celestial body with feature data

## Seeding Data

### Catalog Showpieces

```bash
tsx scripts/seed_showpieces.ts [path/to/catalog_showpieces.json]
```

Imports showpiece objects from JSON. Default path: `server/seed/catalog_showpieces.json`

### ISS TLE

```bash
tsx scripts/seed_iss_tle.ts [path/to/iss_tle.txt]
```

Imports ISS TLE data. Default path: `server/seed/iss_tle.txt`

**TLE Format:**
```
ISS (ZARYA)
1 25544U 98067A   24123.45678901  .00001234  00000+0  12345-4 0  9999
2 25544  51.6436 123.4567 0001234 234.5678 345.6789 15.12345678901234
```

### Moon Features

```bash
tsx scripts/seed_moon_features.ts [path/to/moon_features.json]
```

Imports lunar features from JSON. Default path: `server/seed/moon_features.json`

## Acceptance Tests

### Tonight's Showpieces Test
1. Seed catalog showpieces
2. Call `GET /astrodb/v1/targets/tonight?lat=...&lon=...&from=...&to=...`
3. Verify response contains sorted list by `peak_alt_deg`
4. Verify each object has hourly samples in the time window
5. Verify all objects have `peak_alt_deg > 0`

### Satellite Passes Test
1. Seed ISS TLE data
2. Call `GET /astrodb/v1/targets/passes?norad_id=25544&lat=...&lon=...&from=...&to=...`
3. For a major city, verify returns 0-3 passes
4. Verify pass times are plausible (within time window)
5. Verify each pass has `max_el_deg >= 20`

### Features Radius Search Test
1. Seed moon features
2. Query near Plato: `?body=Moon&near=51.6,-9.4&radius_km=200`
3. Verify response includes Plato
4. Verify response includes neighbors within 200km radius
5. Verify all returned features are within the radius

## Mathematical Notes

### Coordinate Transformations

**RA/Dec to Alt/Az:**
1. Calculate Local Sidereal Time (LST) from UTC and longitude
2. Convert RA to Hour Angle: `HA = LST - RA`
3. Calculate altitude: `sin(alt) = sin(lat) * sin(dec) + cos(lat) * cos(dec) * cos(HA)`
4. Calculate azimuth from altitude and hour angle

**Haversine Distance:**
```
a = sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlon/2)
c = 2 * atan2(√a, √(1-a))
distance = R * c
```
Where R = 6371 km (Earth radius)

### Satellite Visibility

**Sun Altitude:**
- Astronomical twilight: sun altitude < -6°
- Used to determine if sky is dark enough

**Satellite Sunlight:**
- Satellite must be above Earth's shadow cone
- Simplified check: altitude > 200km and sun is up
- Production should use proper shadow cone calculation

**Elevation Threshold:**
- Minimum elevation of 20° for visibility
- Accounts for atmospheric extinction and horizon obstruction

## Notes

- All endpoints require `ASTRO_TARGETS_ENABLED=true`
- Time inputs should be in ISO 8601 format (UTC)
- Latitude/longitude in decimal degrees
- For production SGP4 propagation, install `satellite.js` library
- TLE data should be updated regularly (daily for ISS)
