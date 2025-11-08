# Operations Pack (A1, A2, A3, D11)

This document describes the Operations Pack features for astronomical site management, including horizon masks, dew risk assessment, light pollution lookup, and user site registry.

## Features

- **A1**: Horizon upload + read API
- **A2**: Dew-risk badge API
- **A3**: Light-pollution lookup
- **D11**: User site registry

## Feature Flag

All Operations Pack endpoints require the `ASTRO_OPS_ENABLED` environment variable to be set to `"true"`:

```bash
export ASTRO_OPS_ENABLED=true
```

## Database Schema

### ops.horizon
- `site_id` (UUID) - Foreign key to ops.site
- `az_deg` (REAL) - Azimuth in degrees (0-359)
- `alt_limit_deg` (REAL) - Altitude limit in degrees (0-90)
- Primary key: `(site_id, az_deg)`

### ops.site_lp
- `site_id` (UUID) - Primary key, foreign key to ops.site
- `mpsas_est` (REAL) - Estimated sky brightness in mag/arcsec²
- `method` (TEXT) - Method used for estimation
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

### ops.meteo
- `site_id` (UUID) - Foreign key to ops.site
- `ts` (TIMESTAMPTZ) - Timestamp
- `temp_c` (REAL) - Temperature in Celsius
- `dewpoint_c` (REAL) - Dewpoint in Celsius
- `rh_pct` (REAL) - Relative humidity percentage
- `moon_alt_deg` (REAL) - Moon altitude in degrees
- Additional fields for weather forecasting

### planqa.site_profile
- `id` (UUID) - Primary key
- `name` (TEXT) - Site name
- `lat` (REAL) - Latitude
- `lon` (REAL) - Longitude
- `elev_m` (REAL) - Elevation in meters
- `tz` (TEXT) - Timezone

## Horizon Import

### CSV Format

The horizon CSV file should have the following format:

```csv
az_deg,alt_limit_deg
0,15.2
15,16.8
30,18.5
45,20.1
60,22.3
75,19.8
90,17.5
105,16.2
120,15.9
135,16.5
150,18.1
165,19.7
180,21.2
195,20.8
210,19.3
225,17.9
240,16.4
255,15.8
270,16.1
285,17.6
300,19.2
315,20.7
330,19.4
345,18.0
```

**Requirements:**
- Header row with `az_deg` and `alt_limit_deg` columns
- Azimuth values: 0-359 degrees
- Altitude limit values: 0-90 degrees
- Sparse data is acceptable; the API will interpolate missing values

### Import Script

```bash
tsx scripts/horizon_import.ts --site-id <uuid> --file horizon.csv
```

**Example:**
```bash
tsx scripts/horizon_import.ts --site-id 123e4567-e89b-12d3-a456-426614174000 --file data/horizon_mauna_kea.csv
```

## API Endpoints

### GET /astrodb/v1/ops/horizon

Get interpolated horizon data for a site (0-359 degrees).

**Query Parameters:**
- `site_id` (required) - Site UUID

**Response:**
```json
{
  "data": [
    { "az_deg": 0, "alt_limit_deg": 15.2 },
    { "az_deg": 1, "alt_limit_deg": 15.3 },
    ...
    { "az_deg": 359, "alt_limit_deg": 15.1 }
  ],
  "version": "1.0.0",
  "generated_at": "2024-01-15T10:30:00Z"
}
```

**Example:**
```bash
curl "http://localhost:5000/astrodb/v1/ops/horizon?site_id=123e4567-e89b-12d3-a456-426614174000"
```

### GET /astrodb/v1/ops/dew/risk

Calculate dew risk for a site at a specific time.

**Query Parameters:**
- `site_id` (required) - Site UUID
- `ts` (required) - ISO 8601 timestamp

**Response:**
```json
{
  "data": {
    "margin_c": 3.5,
    "risk": "MED"
  },
  "version": "1.0.0",
  "generated_at": "2024-01-15T10:30:00Z"
}
```

**Risk Levels:**
- `LOW`: margin_c > 4°C
- `MED`: margin_c 2-4°C
- `HIGH`: margin_c < 2°C

**Example:**
```bash
curl "http://localhost:5000/astrodb/v1/ops/dew/risk?site_id=123e4567-e89b-12d3-a456-426614174000&ts=2024-01-15T22:00:00Z"
```

### GET /astrodb/v1/ops/lightpollution

Look up light pollution estimate for a given latitude/longitude.

**Query Parameters:**
- `lat` (required) - Latitude in degrees
- `lon` (required) - Longitude in degrees

**Response:**
```json
{
  "data": {
    "mpsas_est": 20.5
  },
  "version": "1.0.0",
  "generated_at": "2024-01-15T10:30:00Z"
}
```

**Example:**
```bash
curl "http://localhost:5000/astrodb/v1/ops/lightpollution?lat=34.2242&lon=-118.0574"
```

### GET /astrodb/v1/user/sites

List all sites in the user site registry.

**Response:**
```json
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Mauna Kea Observatory",
      "lat": 19.8207,
      "lon": -155.4681,
      "elev_m": 4205,
      "tz": "Pacific/Honolulu"
    },
    ...
  ],
  "version": "1.0.0",
  "generated_at": "2024-01-15T10:30:00Z"
}
```

**Example:**
```bash
curl "http://localhost:5000/astrodb/v1/user/sites"
```

## Seeding Demo Data

The seed script creates:
- 3 demo sites (Mauna Kea, La Palma, Mount Wilson)
- 10 light pollution data points
- 24 hours of hourly meteo data for one site
- User site registry entries

**Run seeding:**
```bash
npm run ops:seed
```

## Acceptance Tests

### Horizon Test
1. Upload a CSV file with horizon data
2. Call `GET /astrodb/v1/ops/horizon?site_id=<id>`
3. Verify response contains 360 rows (0-359 degrees)
4. Verify altitude limits are in 0-90° range

### Dew Risk Test
1. Seed meteo data for a site
2. Call `GET /astrodb/v1/ops/dew/risk?site_id=<id>&ts=<iso>`
3. Verify response contains `margin_c` and `risk` fields
4. Verify risk tier matches calculated margin (LOW/MED/HIGH)

### Light Pollution Test
1. Seed LP data for multiple sites
2. Call `GET /astrodb/v1/ops/lightpollution?lat=<lat1>&lon=<lon1>`
3. Call with different coordinates `?lat=<lat2>&lon=<lon2>`
4. Verify responses return distinct `mpsas_est` values

### Sites Test
1. Seed user site registry
2. Call `GET /astrodb/v1/user/sites`
3. Verify response contains 3 demo sites

## Notes

- Horizon data is automatically interpolated to provide 360 points (one per degree)
- Dew risk calculation uses the closest meteo data within 1 hour of the requested time
- Light pollution lookup finds the nearest site with LP data using haversine distance
- All endpoints require `ASTRO_OPS_ENABLED=true` to be accessible
