# Telescope Control Application

A modern web-based telescope control system with ASCOM Alpaca support and real-time star visualization.

## Features

- ASCOM Alpaca telescope, camera, and focuser control
- Real-time 3D star backdrop with 250 stars from the Yale Bright Star Catalog
- Time-optimal slewing animation with horizon safety constraints
- WebGL2-based sky visualization with accurate celestial coordinates
- Responsive React UI with live telescope status

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

# In another terminal, start the frontend
cd client && npm run dev
```

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
├── client/                # React frontend
│   └── src/
│       ├── components/    # UI components
│       ├── simulatedSkyBackdrop/  # WebGL star visualization
│       └── utils/         # Utilities
├── server/                # Express backend
│   ├── index.ts          # Server entry point
│   └── routes/           # API routes
├── scripts/              # Utility scripts
│   ├── loc_report.py    # LOC counting tool
│   └── fixtures/        # Test fixtures
└── package.json
```

## Technologies

- **Frontend**: React, TypeScript, WebGL2, Vite
- **Backend**: Express, TypeScript
- **Telescope Control**: ASCOM Alpaca REST API
- **Sky Visualization**: Custom WebGL shaders, astronomical coordinate transformations

## License

MIT

## Contributing

See test fixtures in `scripts/fixtures/` for validating the LOC counter.
