# Extended AstroDB Knowledge Backends

This document describes the **four new read-only data services** added to the Telescope Control App, providing comprehensive support for operations, calibration, targeting, and personalized planning.

## Overview

The Extended AstroDB backends provide:

1. **Operations & Environment** (`/astrodb/v1/ops/*`)
   - Weather/seeing forecasts
   - Horizon & obstacle maps
   - Dew risk & heater profiles
   - Light pollution tiles

2. **Equipment & Calibration** (`/astrodb/v1/calib/*`)
   - Master calibration frames
   - Autofocus curves & backfocus offsets
   - Pointing models & PEC profiles
   - Filter & sensor spectral data

3. **Targeting & Alerts** (`/astrodb/v1/targets/*`)
   - Transient alerts (supernovae, novae, GRBs)
   - Minor planets & comets ephemerides
   - Lunar & planetary features
   - Star-hop waypoints

4. **Planning, QA & Personalization** (`/astrodb/v1/planqa/*`)
   - Exposure recipes & SNR models
   - Image quality metrics & session telemetry
   - User site profiles & settings

## Feature Flags

Each domain is controlled by an environment variable:

```bash
# .env
ASTRO_OPS_ENABLED=true
ASTRO_CALIB_ENABLED=true
ASTRO_TARGETS_ENABLED=true
ASTRO_PLANQA_ENABLED=true
```

## Quick Start

### 1. Database Setup

```bash
npm run db:push
```

### 2. Seed Data

Seed all domains at once:

```bash
npm run seed:all
```

Or seed individually:

```bash
npm run ops:seed
npm run calib:seed
npm run targets:seed
npm run planqa:seed
```

### 3. Start Workers (Optional)

The Python workers continuously fetch and process data:

```bash
cd worker
pip install -r requirements.txt

# Start individual workers
python ops_worker.py &
python calib_worker.py &
python targets_worker.py &
python planqa_worker.py &
```

## API Reference

### Operations & Environment

#### Get Sites

```http
GET /astrodb/v1/ops/sites?name=Mauna&lat=19.82&lon=-155.47&radius_km=50
```

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Mauna Kea Observatory",
      "lat": 19.8207,
      "lon": -155.4681,
      "elevM": 4205,
      "tz": "Pacific/Honolulu"
    }
  ],
  "version": "1.0.0",
  "generated_at": "2025-11-08T12:34:56Z"
}
```

#### Get Weather Forecast

```http
GET /astrodb/v1/ops/weather/:site_id?from=2025-11-08T00:00:00Z&to=2025-11-09T00:00:00Z
```

**Response:**

```json
{
  "data": [
    {
      "ts": "2025-11-08T20:00:00Z",
      "cloudPct": 15.5,
      "transparencyIdx": 0.85,
      "seeingArcsec": 1.8,
      "windMps": 4.2,
      "tempC": 12.5,
      "dewpointC": 7.2,
      "rhPct": 65,
      "moonIllum": 0.35,
      "source": "7timer"
    }
  ]
}
```

#### Get Horizon Profile

```http
GET /astrodb/v1/ops/horizon/:site_id
GET /astrodb/v1/ops/horizon/:site_id/interpolate?az_deg=135.0
```

#### Get Dew Risk

```http
GET /astrodb/v1/ops/dew/risk/:site_id?from=2025-11-08T00:00:00Z&min_risk=med
```

**Response:**

```json
{
  "data": [
    {
      "ts": "2025-11-08T22:00:00Z",
      "tempC": 8.5,
      "dewpointC": 6.2,
      "marginC": 2.3,
      "risk": "med"
    }
  ]
}
```

#### Get Light Pollution

```http
GET /astrodb/v1/ops/lightpollution/tiles?z=8&x_min=50&x_max=54&y_min=96&y_max=100
GET /astrodb/v1/ops/lightpollution/site/:site_id
```

### Equipment & Calibration

#### Get Optical Trains

```http
GET /astrodb/v1/calib/trains?name=EdgeHD
GET /astrodb/v1/calib/trains/:id
```

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "name": "EdgeHD 11 + ASI2600MM",
    "scopeModel": "Celestron EdgeHD 11",
    "cameraModel": "ZWO ASI2600MM Pro",
    "focalLengthMm": 1960,
    "apertureMm": 280,
    "pixelSizeUm": 3.76,
    "plateScaleArcsecPx": 0.396
  }
}
```

#### Get Master Frames

```http
GET /astrodb/v1/calib/masters?train_id=uuid&frame_type=flat&filter_name=Ha&limit=10
```

**Response:**

```json
{
  "data": [
    {
      "frameType": "flat",
      "filterName": "Ha",
      "binning": "1x1",
      "tempC": 15.0,
      "exposureSec": 3.5,
      "frameCount": 30,
      "capturedAt": "2024-11-05T12:00:00Z",
      "s3Key": "masters/edgehd11_asi2600_flat_Ha_1x1_20241105.fits",
      "statsJson": {
        "mean": 31800.0,
        "median": 31750.0,
        "stddev": 480.0
      }
    }
  ]
}
```

#### Get Focus Estimate

```http
GET /astrodb/v1/calib/focus/estimate/:train_id?filter_name=L&temp_c=8.5
```

**Response:**

```json
{
  "data": {
    "estimatedPos": 25205,
    "confidence": "high"
  }
}
```

#### Get Filters & Sensors

```http
GET /astrodb/v1/calib/filters?name=Astrodon
GET /astrodb/v1/calib/filters/:id/curve
GET /astrodb/v1/calib/sensors/:id/qe
```

### Targeting & Alerts

#### Get Transients

```http
GET /astrodb/v1/targets/transients?type=supernova&min_mag=15&since=2024-11-01
GET /astrodb/v1/targets/transients/:id
```

**Response:**

```json
{
  "data": [
    {
      "name": "SN 2024abc",
      "type": "supernova",
      "ra": 15.234,
      "dec": 42.567,
      "currentMag": 14.2,
      "classification": "Type Ia",
      "hostGalaxy": "NGC 1234",
      "discoveryDate": "2024-10-15T12:34:00Z"
    }
  ]
}
```

#### Get Minor Planets

```http
GET /astrodb/v1/targets/minorplanets?name=Ceres
GET /astrodb/v1/targets/minorplanets/:id/ephemeris?from=2025-11-08&to=2025-12-08
GET /astrodb/v1/targets/minorplanets/:id/orbit
```

**Response:**

```json
{
  "data": [
    {
      "ts": "2025-11-08T00:00:00Z",
      "ra": 150.5,
      "dec": 20.1,
      "vmag": 8.2,
      "delta": 2.45,
      "rHelio": 2.78,
      "elongation": 95.5
    }
  ]
}
```

#### Get Planetary Features

```http
GET /astrodb/v1/targets/features?body=moon&feature_type=crater&name=Tycho
```

**Response:**

```json
{
  "data": [
    {
      "body": "moon",
      "name": "Tycho",
      "featureType": "crater",
      "lat": -43.3,
      "lon": -11.2,
      "diameter": 85.0,
      "description": "Prominent crater with extensive ray system",
      "observabilityNotes": "Best at full moon, rays visible in small telescopes",
      "aliases": []
    }
  ]
}
```

#### Get Star Hops

```http
GET /astrodb/v1/targets/hops/M57
GET /astrodb/v1/targets/hops?q=M31&limit=20
```

**Response:**

```json
{
  "data": [
    {
      "waypointIdx": 0,
      "waypointName": "Vega",
      "waypointRa": 279.234,
      "waypointDec": 38.783,
      "waypointMag": 0.03,
      "bearingDeg": 120.0,
      "distanceDeg": 8.5,
      "notes": "Start at Vega (brightest star in Lyra)"
    },
    {
      "waypointIdx": 1,
      "waypointName": "Sheliak (Beta Lyrae)",
      "waypointRa": 282.52,
      "waypointDec": 33.363,
      "waypointMag": 3.52,
      "bearingDeg": 88.0,
      "distanceDeg": 1.2,
      "notes": "Move to Sheliak, halfway between Vega and Gamma Lyrae"
    }
  ]
}
```

### Planning, QA & Personalization

#### Get Recipes

```http
GET /astrodb/v1/planqa/recipes?target_type=dso&filter_name=Ha
GET /astrodb/v1/planqa/recipes/:id
```

**Response:**

```json
{
  "data": [
    {
      "name": "Ha Narrowband - Extended",
      "targetType": "dso",
      "filterName": "Ha",
      "exposureSec": 600.0,
      "frameCount": 30,
      "totalExpMin": 300.0,
      "binning": "1x1",
      "gain": 100,
      "notes": "Deep Ha for emission nebulae, 30x 10min"
    }
  ]
}
```

#### Estimate SNR

```http
GET /astrodb/v1/planqa/snr/estimate?train_id=uuid&filter_name=L&target_type=dso&exposure_sec=300&sky_mpsas=21.0
```

**Response:**

```json
{
  "data": {
    "snr": 125.3,
    "model": "SNR = 12.50 * sqrt(t) * (1 - 0.080 * (21 - SQM)) + -2.00"
  }
}
```

#### Get Sessions

```http
GET /astrodb/v1/planqa/sessions?train_id=uuid&from=2025-11-01
GET /astrodb/v1/planqa/sessions/:id
GET /astrodb/v1/planqa/sessions/:id/qa
```

**QA Summary Response:**

```json
{
  "data": {
    "session": {...},
    "metrics": {
      "hfr": {
        "avg": 2.15,
        "min": 1.85,
        "max": 2.65,
        "unit": "arcsec"
      },
      "guide_rms": {
        "avg": 0.52,
        "min": 0.38,
        "max": 0.71,
        "unit": "arcsec"
      },
      "sky_adu": {
        "avg": 925.0,
        "min": 810.0,
        "max": 1050.0,
        "unit": "ADU"
      }
    }
  }
}
```

#### User Profiles

```http
GET /astrodb/v1/planqa/profiles/:user_id/sites
GET /astrodb/v1/planqa/profiles/:user_id/settings
```

## Python Workers

Each domain has a corresponding Python worker for ETL:

### Operations Worker (`ops_worker.py`)

- Fetches weather/seeing from **7Timer** and **ClearOutside** APIs
- Computes dew risk from meteo data
- Imports horizon profiles from external files
- Processes light pollution tiles

**Schedule:**
- Weather: Every 1 hour
- Horizon: On-demand
- LP Tiles: Monthly

### Calibration Worker (`calib_worker.py`)

- Catalogs master calibration frames from S3/local storage
- Fits focus curves (hyperbolic & quadratic)
- Prunes old frames (>90 days)

**Schedule:**
- Focus curve fitting: Every 5 minutes (when new data available)
- Frame cataloging: Continuous

### Targets Worker (`targets_worker.py`)

- Scrapes **TNS** (Transient Name Server) for supernovae/novae
- Fetches **GCN** (Gamma-ray Coordinates Network) notices
- Computes minor planet ephemerides using orbital elements

**Schedule:**
- Transients: Every 4 hours
- Ephemeris: Daily

### Planning/QA Worker (`planqa_worker.py`)

- Processes session telemetry (HFR, guide RMS, sky ADU, star count)
- Builds SNR models from exposure data
- Generates QA summaries with flags (poor seeing, poor guiding, variable sky)

**Schedule:**
- Telemetry processing: Every 10 minutes
- SNR model building: Weekly

## Architecture

```
┌─────────────────┐
│  Telescope App  │
│   (Node.js)     │
└────────┬────────┘
         │
         ├─ /astrodb/v1/ops/*      (OPS_ENABLED)
         ├─ /astrodb/v1/calib/*    (CALIB_ENABLED)
         ├─ /astrodb/v1/targets/*  (TARGETS_ENABLED)
         └─ /astrodb/v1/planqa/*   (PLANQA_ENABLED)
         │
         ▼
┌─────────────────┐
│   PostgreSQL    │
│   (+ PostGIS)   │
└────────┬────────┘
         ▲
         │
┌────────┴─────────────────────────────────┐
│         Python Workers (ETL)             │
├──────────────────────────────────────────┤
│  • ops_worker.py                         │
│  • calib_worker.py                       │
│  • targets_worker.py                     │
│  • planqa_worker.py                      │
└──────────────────────────────────────────┘
         ▲
         │
    External APIs
    (7Timer, TNS, GCN, etc.)
```

## Data Quality

- **Provenance**: All data includes `source` and `updatedAt` timestamps
- **Staging**: Workers write to NDJSON staging files before upserts
- **Idempotency**: Upsert operations use unique constraints for deterministic updates
- **Validation**: Pydantic models validate all data before insertion
- **Observability**: Structured logging with metrics counters

## Testing

Run the demo script to verify all endpoints:

```bash
./scripts/demo-extended-astrodb.sh
```

## License & Attribution

All data sources are attributed in the `source` field of responses. Workers respect `robots.txt` and implement rate limiting.

- **7Timer**: CC BY-NC 4.0
- **TNS**: Public use with attribution
- **GCN**: NASA public data
- **World Atlas 2015**: Open data

## Support

For issues or feature requests, please file an issue in the repository.
