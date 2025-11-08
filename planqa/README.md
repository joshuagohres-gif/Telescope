# Plan & QA Pack (D9, D10)

This document describes the Plan & QA Pack features for rule-based exposure recipes and session quality assurance summaries.

## Features

- **D9**: Smart exposure recipe v0 (rule-based) - Rule-based exposure recommendations
- **D10**: Session QA summary - Quality metrics rollup from per-frame submetrics

## Feature Flag

All Plan & QA Pack endpoints require the `ASTRO_PLANQA_ENABLED` environment variable to be set to `"true"`:

```bash
export ASTRO_PLANQA_ENABLED=true
```

## Database Schema

### planqa.recipe
- `id` (SERIAL PK)
- `train_id` (UUID NULL) - Optional optical train reference
- `target_class` (TEXT) - Target class (dso, planetary, etc.)
- `sky_mpsas_bin` (TEXT) - Sky brightness bin (e.g., "20-21", "21-22")
- `filter` (TEXT) - Filter name
- `sub_exposure_s` (REAL) - Sub-exposure time in seconds
- `subs` (INT) - Number of sub-exposures
- `dither_pix` (REAL NULL) - Dither distance in pixels
- `bin` (INT NULL) - Binning (1, 2, etc.)
- `gain` (TEXT NULL) - Gain setting
- `iso` (TEXT NULL) - ISO setting (for DSLR)
- `rationale_md` (TEXT) - Markdown explanation of the recipe
- `created_at` (TIMESTAMPTZ) - Creation timestamp

### planqa.session
- `id` (UUID PK)
- `user_id` (UUID NULL) - Optional user reference
- `site_id` (UUID NULL) - Optional site reference
- `started_at` (TIMESTAMPTZ) - Session start time
- `ended_at` (TIMESTAMPTZ NULL) - Session end time
- `notes` (TEXT) - Session notes

### planqa.submetric
- `id` (SERIAL PK)
- `session_id` (UUID) - Foreign key to session
- `frame_no` (INT) - Frame number
- `ts` (TIMESTAMPTZ) - Timestamp
- `hfr` (REAL) - Half-Flux Radius
- `ecc` (REAL) - Eccentricity
- `sky_adu` (REAL) - Sky background in ADU
- `rms_ra` (REAL NULL) - Guiding RMS in RA (arcsec)
- `rms_dec` (REAL NULL) - Guiding RMS in Dec (arcsec)
- `reject` (BOOL) - Whether frame was rejected

## Sky Brightness Binning

Sky brightness is binned into ranges for recipe matching:

- `18-19`: Light polluted (urban/suburban)
- `19-20`: Moderate light pollution
- `20-21`: Dark skies (rural)
- `21-22`: Very dark skies (remote)
- `22+`: Extremely dark skies

**Binning Logic:**
```typescript
if (mpsas < 19) return "18-19";
if (mpsas < 20) return "19-20";
if (mpsas < 21) return "20-21";
if (mpsas < 22) return "21-22";
return "22+";
```

## API Endpoints

### GET /astrodb/v1/plan/recipe

Get rule-based exposure recipe for given conditions.

**Query Parameters:**
- `target_class` (required) - Target class (e.g., "dso", "planetary")
- `sky` (required) - Sky brightness in mpsas (e.g., 20.5)
- `filter` (required) - Filter name (e.g., "L", "R", "G", "B")
- `train_id` (optional) - Optical train UUID (for train-specific recipes)

**Response:**
```json
{
  "data": {
    "id": 1,
    "train_id": null,
    "target_class": "dso",
    "sky_mpsas_bin": "20-21",
    "filter": "L",
    "sub_exposure_s": 60.0,
    "subs": 30,
    "dither_pix": 5.0,
    "bin": 1,
    "gain": "0",
    "iso": null,
    "rationale_md": "For dark skies (20-21 mpsas), use 60s subs to capture faint DSOs. Luminance filter benefits from longer exposures."
  },
  "version": "1.0.0",
  "generated_at": "2024-01-15T10:30:00Z"
}
```

**Example:**
```bash
# Get recipe for DSO imaging with L filter at 20.5 mpsas sky
curl "http://localhost:5000/astrodb/v1/plan/recipe?target_class=dso&sky=20.5&filter=L"

# With train-specific recipe
curl "http://localhost:5000/astrodb/v1/plan/recipe?target_class=dso&sky=20.5&filter=L&train_id=123e4567-e89b-12d3-a456-426614174000"
```

**Notes:**
- Sky brightness is automatically binned (e.g., 20.5 → "20-21")
- Recipe selection prioritizes train-specific recipes if `train_id` provided
- Returns most recent recipe matching the criteria

### GET /astrodb/v1/qa/summary

Get quality assurance summary for a session.

**Query Parameters:**
- `session_id` (required) - Session UUID

**Response:**
```json
{
  "data": {
    "frames": 15,
    "median_hfr": 2.6,
    "reject_rate": 0.133,
    "guiding_rms": {
      "ra": 0.33,
      "dec": 0.28
    },
    "notes": "M42 imaging session"
  },
  "version": "1.0.0",
  "generated_at": "2024-01-15T10:30:00Z"
}
```

**Example:**
```bash
curl "http://localhost:5000/astrodb/v1/qa/summary?session_id=123e4567-e89b-12d3-a456-426614174000"
```

**Notes:**
- `median_hfr`: Median Half-Flux Radius across all frames
- `reject_rate`: Fraction of frames marked as rejected (0.0 to 1.0)
- `guiding_rms`: Average guiding RMS in arcseconds (null if no guiding data)
- `notes`: Session notes from session record

## Seeding Data

### Recipes

```bash
tsx scripts/seed_recipes.ts [path/to/recipes.json]
```

Imports rule-based recipes from JSON. Default path: `server/seed/recipes.json`

**JSON Format:**
```json
[
  {
    "train_id": null,
    "target_class": "dso",
    "sky_mpsas_bin": "20-21",
    "filter": "L",
    "sub_exposure_s": 60.0,
    "subs": 30,
    "dither_pix": 5.0,
    "bin": 1,
    "gain": "0",
    "iso": null,
    "rationale_md": "For dark skies (20-21 mpsas), use 60s subs..."
  }
]
```

### Submetrics

```bash
tsx scripts/submetrics_import.ts --session-id <uuid> --file <csv-file>
```

Imports session submetrics from CSV. Default path: `server/seed/submetrics_demo.csv`

**CSV Format:**
```csv
session_id,frame_no,ts,hfr,ecc,sky_adu,rms_ra,rms_dec,reject
123e4567-e89b-12d3-a456-426614174000,1,2024-01-15T20:00:00Z,2.8,0.15,450.2,0.35,0.28,false
123e4567-e89b-12d3-a456-426614174000,2,2024-01-15T20:01:00Z,2.6,0.12,452.1,0.32,0.30,false
...
```

**Required Columns:**
- `frame_no` - Frame number
- `ts` - Timestamp (ISO 8601)
- `hfr` - Half-Flux Radius
- `ecc` - Eccentricity
- `sky_adu` - Sky background in ADU

**Optional Columns:**
- `rms_ra` - Guiding RMS in RA (arcsec)
- `rms_dec` - Guiding RMS in Dec (arcsec)
- `reject` - Boolean (true/false)

**Note:** The `session_id` column in CSV is ignored; use `--session-id` parameter.

## Acceptance Tests

### Recipe Matching Test
1. Seed recipes with different sky bins (e.g., 20-21, 21-22)
2. Call `GET /astrodb/v1/plan/recipe?target_class=dso&sky=20.5&filter=L`
3. Verify returns recipe with `sky_mpsas_bin="20-21"`
4. Call with `sky=21.3`
5. Verify returns recipe with `sky_mpsas_bin="21-22"`
6. Verify `sub_exposure_s` changes appropriately (longer for darker skies)
7. Verify `rationale_md` is included in response

### QA Summary Test
1. Seed a demo session with submetrics
2. Call `GET /astrodb/v1/qa/summary?session_id=<id>`
3. Verify response includes:
   - `frames`: Total frame count
   - `median_hfr`: Median HFR value
   - `reject_rate`: Fraction of rejected frames
   - `guiding_rms`: Average RA/Dec RMS (if available)
   - `notes`: Session notes
4. Verify median HFR matches calculated median
5. Verify reject rate matches (rejected frames / total frames)

## Mapping Rules

### Sky Brightness to Exposure Time

**DSO Imaging:**
- **18-19 mpsas**: 30-45s subs (light polluted, shorter to avoid saturation)
- **19-20 mpsas**: 45-60s subs (moderate LP)
- **20-21 mpsas**: 60-90s subs (dark skies)
- **21-22 mpsas**: 90-150s subs (very dark, maximize signal)
- **22+ mpsas**: 120-180s subs (extremely dark)

**Filter Considerations:**
- **Luminance (L)**: Longer exposures (captures all wavelengths)
- **Red (R)**: Medium-long exposures (H-alpha regions)
- **Green (G)**: Medium exposures
- **Blue (B)**: Medium-long exposures (lower QE compensation)

**Planetary Imaging:**
- Very short exposures (0.05-0.1s) regardless of sky brightness
- High frame counts (1000+)
- Binning typically 2x2 for speed

### Gain Selection

- **Dark skies (20+ mpsas)**: Low gain (0 or unity) for maximum dynamic range
- **Light polluted (18-19 mpsas)**: Higher gain (100+) to maintain reasonable exposure times

## Notes

- All endpoints require `ASTRO_PLANQA_ENABLED=true`
- Recipe matching is rule-based (no ML/AI)
- Sky brightness binning is automatic (no manual bin specification needed)
- QA summary aggregates per-frame metrics into session-level statistics
- Median HFR is more robust than mean for quality assessment
- Reject rate helps identify problematic sessions
