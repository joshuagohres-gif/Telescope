# Telescope Control Application

A modern web-based telescope control system with ASCOM Alpaca support and real-time star visualization.

## Features

### Core Telescope Control

- ASCOM Alpaca telescope, camera, and focuser control
- Real-time 3D star backdrop with 250 stars from the Yale Bright Star Catalog
- Time-optimal slewing animation with horizon safety constraints
- WebGL2-based sky visualization with accurate celestial coordinates
- Responsive React UI with live telescope status

### Astronomical Knowledge Base (AstroDB)

Four comprehensive read-only APIs providing access to:

- **Equipment Database**: 2,000+ astronomy devices (mounts, cameras, focusers) with detailed specs
- **Catalog**: Top 500 night-sky objects (galaxies, nebulae, clusters) with coordinates
- **Satellites**: ~50 brightest man-made objects with TLE data and pass predictions
- **Events**: 2025-2026 major astronomical events with visibility information

See [README-astrodb.md](./README-astrodb.md) for complete documentation.

### Telescope Design Knowledge Base

**NEW**: Comprehensive design methodology database for 3D-printable telescopes:

- **40+ Concepts**: Design patterns across optics, mechanics, testing, safety
- **25+ Equations**: Verified formulas with unit tests (secondary sizing, focal ratios, etc.)
- **18+ Dimensioned Examples**: Complete telescope designs (80-200mm apertures) with BoMs
- **Safety Procedures**: Critical protocols for solar observing and laser collimation
- **Training Export**: NDJSON format for generative design systems

See [README-design-kb.md](./README-design-kb.md) for complete documentation.

### Extended AstroDB: Operations, Calibration, Targeting & Planning

**NEW**: Four advanced knowledge backends for professional observatory operations:

1. **Operations & Environment** (`/astrodb/v1/ops/*`)
   - Weather/seeing forecasts (7Timer integration)
   - Horizon profiles & obstacle mapping
   - Dew risk calculation & heater control hints
   - Light pollution tiles (World Atlas 2015)

2. **Equipment & Calibration** (`/astrodb/v1/calib/*`)
   - Master calibration frame library
   - Autofocus curves with temperature compensation
   - Pointing models & PEC profiles
   - Filter transmission & sensor QE curves

3. **Targeting & Alerts** (`/astrodb/v1/targets/*`)
   - Transient alerts (TNS, GCN: supernovae, novae, GRBs)
   - Minor planet ephemerides (50+ tracked objects)
   - Lunar/planetary feature gazetteer (400+ features)
   - Star-hop waypoints for deep-sky navigation

4. **Planning, QA & Personalization** (`/astrodb/v1/planqa/*`)
   - Exposure recipe optimizer
   - SNR estimation models
   - Session telemetry & quality metrics
   - User site profiles & preferences

See [README-extended-astrodb.md](./README-extended-astrodb.md) for complete API documentation.

### Sky Visualizers

**NEW**: Professional-grade orbital mechanics and sky path visualization tools:

- **Orbital Trajectory View**: 3D interactive heliocentric view of solar system objects (planets, asteroids, comets). Supports multi-object selection, ecliptic grid, and smooth camera controls.
- **Sky Path View**: Accurate Alt/Az path projection for any location on Earth. Features stereographic projection, real star catalog (Bright Stars), and realistic planet positioning.
- **Solar System Map**: Top-down 2D view of the solar system state for any date range.
- **Advanced Controls**: 
  - Multi-object selection
  - JD (Julian Date) time input
  - Geolocation support

## Setup

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+ (for LOC reporting)
- ASCOM Alpaca server (optional, for real telescope hardware)

### Installation

```bash
npm install
```

### Development

```bash
# Start the backend server
npm run dev

# In another terminal, start the frontend (if needed)
cd client && npm run dev
```

### AstroDB Setup (Optional)

To enable the astronomical knowledge base APIs:

```bash
# 1. Set environment variable
export ASTRO_KB_ENABLED=true

# 2. Run setup script
./scripts/setup-astrodb.sh

# 3. Start with Docker Compose (recommended)
docker compose -f docker-compose.astrodb.yml up

# 4. Test the API
./scripts/demo-astrodb.sh
```

See [README-astrodb.md](./README-astrodb.md) for detailed setup and API documentation.

### Production Build

```bash
npm run build
npm start
```

## LOC Report

This repository includes a zero-dependency LOC/SLOC counting script for tracking code metrics.

### Running the LOC Report

```bash
# Count whole repository
python scripts/loc_report.py

# Only src and app folders
python scripts/loc_report.py --path client/src

# Include test files
python scripts/loc_report.py --include-tests

# Custom extensions only
python scripts/loc_report.py --extensions ".ts,.tsx,.py"

# Follow symlinks, raise size limit
python scripts/loc_report.py --follow-symlinks --max-bytes 20000000
```

### Example Output

```
Language     Files     LOC      SLOC
-----------  -------   -------  -------
TypeScript   184       54,321   38,905
Python       63        12,004   8,110
Markdown     41        5,772    —
YAML         23        1,209    1,044
TOTAL        311       73,306   48,059

Wrote loc-report.json
```

### Options

- `--path <dir>`: Root directory to scan (default: current directory)
- `--include-tests`: Include test files (default: excluded)
- `--include-generated`: Include generated files (default: excluded)
- `--extensions ".ext1,.ext2,..."`: Comma-separated list of extensions to count
- `--follow-symlinks`: Follow symbolic links (default: don't follow)
- `--max-bytes N`: Skip files larger than N bytes (default: 5MB)

The script outputs both a human-readable table and a machine-readable `loc-report.json` file.

### Default Exclusions

The following directories and patterns are excluded by default:
- `node_modules`, `.git`, `dist`, `build`, `out`, `.next`, `.cache`
- `coverage`, `__pycache__`, `venv`, `.venv`
- `generated`, `proto`, `migrations`
- `*.min.*`, `*.lock`, `*.bundle.*`
- Test directories (`test`, `tests`, `__tests__`) unless `--include-tests` is used

### Supported Languages

- **TypeScript/JavaScript**: `.ts`, `.tsx`, `.js`, `.jsx`
- **Python**: `.py`
- **Go**: `.go`
- **C/C++**: `.c`, `.h`, `.cpp`, `.hpp`
- **Rust**: `.rs`
- **Java/Kotlin**: `.java`, `.kt`
- **Shell**: `.sh`
- **YAML/JSON**: `.yml`, `.yaml`, `.json`
- **Markdown**: `.md` (docs only, LOC counted but not SLOC)

## Project Structure

```
telescope/
├── client/                    # React frontend
│   └── src/
│       ├── components/        # UI components
│       ├── simulatedSkyBackdrop/  # WebGL star visualization
│       └── utils/             # Utilities
├── server/                    # Express backend
│   ├── index.ts              # Server entry point
│   ├── routes.ts             # API routes
│   ├── astrodb-routes.ts     # AstroDB API routes
│   ├── astrodb-storage.ts    # AstroDB data access
│   └── services/             # Business logic
├── worker/                    # Python ETL worker
│   ├── main.py               # Data scrapers
│   └── importer.py           # NDJSON importer
├── shared/                    # Shared TypeScript types
│   ├── schema.ts             # Main DB schema
│   └── astrodb-schema.ts     # AstroDB schemas
├── scripts/                   # Utility scripts
│   ├── setup-astrodb.sh      # AstroDB setup
│   ├── demo-astrodb.sh       # API demo
│   └── loc_report.py         # LOC counting tool
├── docker-compose.astrodb.yml # Full stack Docker setup
└── package.json
```

## Technologies

- **Frontend**: React, TypeScript, WebGL2, Vite
- **Backend**: Express, TypeScript, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **ETL Worker**: Python 3.11+ with httpx, APScheduler
- **Telescope Control**: ASCOM Alpaca REST API
- **Sky Visualization**: Custom WebGL shaders, astronomical coordinate transformations
- **Containerization**: Docker & Docker Compose

## License

MIT

## Contributing

See test fixtures in `scripts/fixtures/` for validating the LOC counter.
