# Calibration Pack (B4, B5)

This document describes the Calibration Pack features for master frame matching and autofocus prediction.

## Features

- **B4**: Master flats finder - Find best matching master calibration frame
- **B5**: Autofocus predictor - Predict first focus position by filter vs. temperature

## Feature Flag

All Calibration Pack endpoints require the `ASTRO_CALIB_ENABLED` environment variable to be set to `"true"`:

```bash
export ASTRO_CALIB_ENABLED=true
```

## Database Schema

### calib.master_frame
- `id` (UUID PK) - Unique identifier
- `train_id` (UUID) - Foreign key to optical train
- `kind` (ENUM) - Frame type: 'dark', 'bias', 'flat', 'darkflat'
- `sensor_temp_c` (REAL) - Sensor temperature in Celsius
- `gain` (TEXT) - Gain setting
- `exposure_s` (REAL) - Exposure time in seconds
- `filter` (TEXT) - Filter name
- `hash` (TEXT UNIQUE) - Frame hash for deduplication
- `s3_url` (TEXT) - S3 storage URL
- `created_at` (TIMESTAMPTZ) - Creation timestamp

**Index:** `(train_id, kind, filter, sensor_temp_c, gain, exposure_s)`

### calib.focus_sample
- `id` (SERIAL PK)
- `train_id` (UUID) - Foreign key to optical train
- `ts` (TIMESTAMPTZ) - Timestamp
- `filter` (TEXT) - Filter name
- `temp_c` (REAL) - Temperature in Celsius
- `position` (INT) - Focuser position
- `hfr` (REAL) - Half-Flux Radius
- `exposure_s` (REAL) - Exposure time in seconds

### calib.focus_profile
- `id` (SERIAL PK)
- `train_id` (UUID) - Foreign key to optical train
- `filter` (TEXT) - Filter name
- `model` (JSONB) - Fitted model parameters
- `r2` (REAL) - R² goodness of fit
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

## Master Frame Matching

### Scoring Algorithm

The master frame finder uses a distance-based scoring system:

```
distance = wT * |Δtemp| + wE * |Δexp| + wG * gain_mismatch
```

Where:
- `wT` = Temperature weight (default: 1.0)
- `wE` = Exposure weight (default: 1.0)
- `wG` = Gain mismatch weight (default: 10.0)

**Matching Criteria:**
1. **Temperature**: Absolute difference in sensor temperature
2. **Exposure**: Absolute difference in exposure time
3. **Gain**: Exact match required (mismatch = full penalty)

The frame with the lowest total distance score is selected.

### Example Scoring

Given requested parameters:
- `temp_c = -10.0`
- `gain = "0"`
- `exposure_s = 2.5`

Candidate frames:
1. Frame A: temp=-10.0, gain="0", exp=2.5 → score = 0.0 (perfect match)
2. Frame B: temp=-12.0, gain="0", exp=2.5 → score = 2.0 (temp diff)
3. Frame C: temp=-10.0, gain="100", exp=2.5 → score = 10.0 (gain mismatch)
4. Frame D: temp=-12.0, gain="0", exp=3.0 → score = 2.0 + 0.5 = 2.5

Frame A would be selected.

## Focus Profile Model

### V-Curve Model

The focus profile uses a V-curve (quadratic) model:

```
hfr = a * (position - b)² + c
```

Where:
- `a` = Curvature coefficient (positive)
- `b` = Optimal focus position
- `c` = Minimum HFR at optimal position
- `type` = 'vcurve'

### Temperature Compensation

Focus position is adjusted for temperature:

```
estimated_position = optimal_position + (current_temp - reference_temp) * 1.0
```

Assumes 1 focuser tick per degree Celsius (typical for most focusers).

### Confidence Levels

- **High**: R² > 0.95
- **Medium**: R² > 0.85
- **Low**: R² ≤ 0.85

## API Endpoints

### GET /astrodb/v1/calib/masters

Find best matching master frame or list master frames.

**Query Parameters (for best match):**
- `train_id` (required) - Optical train UUID
- `kind` (required) - Frame kind: 'dark', 'bias', 'flat', 'darkflat'
- `filter` (optional) - Filter name
- `temp_c` (optional) - Sensor temperature in Celsius
- `gain` (optional) - Gain setting
- `exp_s` (optional) - Exposure time in seconds

**Query Parameters (for list):**
- `train_id` (optional) - Filter by train
- `kind` (optional) - Filter by kind
- `filter` (optional) - Filter by filter name
- `limit` (optional) - Result limit

**Response (best match):**
```json
{
  "data": {
    "frame": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "train_id": "...",
      "kind": "flat",
      "filter": "L",
      "sensor_temp_c": -10.0,
      "gain": "0",
      "exposure_s": 2.5,
      "hash": "abc123def456",
      "s3_url": "s3://calib/masters/flat_L_-10C_gain0_2.5s.fits"
    },
    "score_breakdown": {
      "tempScore": 0.0,
      "expScore": 0.0,
      "gainScore": 0.0,
      "totalScore": 0.0
    }
  },
  "version": "1.0.0",
  "generated_at": "2024-01-15T10:30:00Z"
}
```

**Example:**
```bash
# Find best matching flat
curl "http://localhost:5000/astrodb/v1/calib/masters?train_id=123e4567-e89b-12d3-a456-426614174000&kind=flat&filter=L&temp_c=-10.0&gain=0&exp_s=2.5"

# List all flats for a train
curl "http://localhost:5000/astrodb/v1/calib/masters?train_id=123e4567-e89b-12d3-a456-426614174000&kind=flat"
```

### GET /astrodb/v1/equip/focus/estimate

Estimate focus position for a given filter and temperature.

**Query Parameters:**
- `train_id` (required) - Optical train UUID
- `filter` (required) - Filter name
- `temp_c` (required) - Current temperature in Celsius

**Response:**
```json
{
  "data": {
    "position": 15400,
    "confidence": "high",
    "r2": 0.97
  },
  "version": "1.0.0",
  "generated_at": "2024-01-15T10:30:00Z"
}
```

**Example:**
```bash
curl "http://localhost:5000/astrodb/v1/equip/focus/estimate?train_id=123e4567-e89b-12d3-a456-426614174000&filter=L&temp_c=15.0"
```

**Alternative endpoint:**
```bash
curl "http://localhost:5000/astrodb/v1/calib/focus/estimate/123e4567-e89b-12d3-a456-426614174000?filter=L&temp_c=15.0"
```

## Seeding Data

### Master Frames

```bash
tsx scripts/seed_masters.ts [path/to/masters_index.json]
```

Imports master frames from JSON. Default path: `server/seed/masters_index.json`

**JSON Format:**
```json
[
  {
    "train_id": "123e4567-e89b-12d3-a456-426614174000",
    "kind": "flat",
    "filter": "L",
    "sensor_temp_c": -10.0,
    "gain": "0",
    "exposure_s": 2.5,
    "hash": "abc123def456",
    "s3_url": "s3://calib/masters/flat_L_-10C_gain0_2.5s.fits"
  }
]
```

### Focus Samples and Profiles

```bash
tsx scripts/fit_focus.ts [path/to/focus_samples.csv]
```

Reads focus samples from CSV, fits V-curve models, and writes focus profiles. Default path: `server/seed/focus_samples.csv`

**CSV Format:**
```csv
train_id,ts,filter,temp_c,position,hfr,exposure_s
123e4567-e89b-12d3-a456-426614174000,2024-01-15T20:00:00Z,L,15.0,15000,2.8,5.0
123e4567-e89b-12d3-a456-426614174000,2024-01-15T20:05:00Z,L,15.0,15200,2.5,5.0
...
```

The script:
1. Imports samples into `calib.focus_sample`
2. Groups by `train_id` and `filter`
3. Fits V-curve model for each group
4. Writes profile to `calib.focus_profile`

## Acceptance Tests

### Master Frame Finder Test
1. Seed multiple master frames with varying parameters
2. Call `GET /astrodb/v1/calib/masters?train_id=...&kind=flat&filter=...&temp_c=...&gain=...&exp_s=...`
3. Verify endpoint selects the intended frame as inputs vary
4. Verify `score_breakdown` shows correct component scores
5. Test edge cases: missing parameters, no matches

### Focus Estimate Test
1. Seed focus samples and fit profiles
2. Call `GET /astrodb/v1/equip/focus/estimate?train_id=...&filter=...&temp_c=...`
3. Verify predicted position is within ±50 steps of expected
4. Verify response includes `r2` value
5. Verify confidence level matches R² value

## Mathematical Notes

### V-Curve Fitting

The V-curve is fitted using least squares:

Given samples `(x_i, y_i)` where `x = position`, `y = hfr`:

1. Find optimal position `b` (minimum HFR)
2. Fit quadratic: `y = a * (x - b)² + c`
3. Solve for `a` and `c` using normal equations

**R² Calculation:**
```
R² = 1 - (SS_res / SS_tot)
```

Where:
- `SS_res` = Sum of squared residuals
- `SS_tot` = Total sum of squares

### Temperature Compensation

Linear temperature compensation assumes:
- Focus position changes linearly with temperature
- Typical rate: 1 tick per degree Celsius
- Reference temperature: 15°C (default)

```
compensation = (current_temp - reference_temp) * rate
estimated_position = optimal_position + compensation
```

## Notes

- All endpoints require `ASTRO_CALIB_ENABLED=true`
- Master frame matching prioritizes exact gain match (high weight)
- Focus profiles should be updated regularly as more samples are collected
- V-curve model assumes symmetric focus curve (may not hold for all systems)
- Temperature compensation rate may vary by focuser model
