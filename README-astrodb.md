# Astronomical Knowledge Base (AstroDB)

A comprehensive read-only API providing access to four astronomical data domains: equipment catalogs, celestial objects, satellites, and astronomical events.

## Features

- **Equipment Database**: 2,000+ astronomy devices with detailed specifications
- **Top 500 Night-Sky Objects**: Curated catalog of showpiece deep-sky objects
- **Satellite Tracking**: ~50 brightest man-made objects with TLE data and pass predictions
- **2025-2026 Events**: Major astronomical events with visibility information

## Architecture

```
┌─────────────────┐
│   Client App    │
└────────┬────────┘
         │
         │ HTTP/REST
         ▼
┌─────────────────┐      ┌──────────────┐
│  AstroDB API    │◄────►│  PostgreSQL  │
│  (Node/TS)      │      │   Database   │
└─────────────────┘      └──────────────┘
         ▲                      ▲
         │                      │
         │                      │
┌─────────────────┐             │
│  Python Worker  │─────────────┘
│  (Scrapers/ETL) │
└─────────────────┘
```

## Setup

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)
- Python 3.11+ (for worker development)

### Quick Start

1. **Enable the feature**:
   ```bash
   export ASTRO_KB_ENABLED=true
   ```

2. **Start all services**:
   ```bash
   docker compose -f docker-compose.astrodb.yml up --build
   ```

3. **Run database migrations**:
   ```bash
   npm run db:push
   ```

4. **Seed the database**:
   ```bash
   npm run astrodb:seed
   ```

5. **Access the API**:
   - Health check: http://localhost:8080/astrodb/v1/health
   - API docs: http://localhost:8080/docs

## API Reference

All endpoints are mounted under `/astrodb/v1` and require the `ASTRO_KB_ENABLED=true` environment variable.

### Common Response Format

All responses include source attribution:

```json
{
  "data": [...],
  "sources": [
    {
      "name": "Source Name",
      "url": "https://...",
      "license": "License Type"
    }
  ],
  "version": "1.0.0",
  "generatedAt": "2025-11-08T12:00:00Z"
}
```

### Equipment API

#### List Devices

```bash
GET /astrodb/v1/equipment/devices?category=camera&manufacturer=ZWO&page=1&pageSize=20
```

**Query Parameters**:
- `category`: Device category (mount, camera, focuser, filter_wheel, ota, accessory, controller)
- `interface`: Interface type (ASCOM, INDI, Alpaca, USB, Serial, Other)
- `manufacturer`: Manufacturer name
- `q`: Search query (searches model and manufacturer)
- `page`: Page number (default: 1)
- `pageSize`: Results per page (default: 20, max: 100)

**Example Response**:
```json
{
  "data": [
    {
      "id": 1,
      "model": "ASI294MC Pro",
      "category": "camera",
      "interface": "ASCOM",
      "manufacturer": {
        "name": "ZWO",
        "website": "https://www.zwoastro.com"
      },
      "specs": [
        { "key": "sensor_size", "value": "19.1x13.0", "unit": "mm" },
        { "key": "pixel_um", "value": "4.63", "unit": "µm" }
      ],
      "capabilities": [
        { "name": "cooling" },
        { "name": "usb3" }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "pages": 8
  }
}
```

#### Get Device by ID

```bash
GET /astrodb/v1/equipment/devices/:id
```

### Catalog API

#### List Objects

```bash
GET /astrodb/v1/catalog/objects?class=galaxy&mag_lte=8&page=1
```

**Query Parameters**:
- `class`: Object class (open_cluster, globular, nebula, planetary_nebula, galaxy, double_star, star, asterism, other)
- `constellation`: Constellation name
- `mag_lte`: Maximum magnitude (brighter objects)
- `q`: Search query (searches primary name and alternate names)
- `near_ra`: Right ascension for cone search (degrees)
- `near_dec`: Declination for cone search (degrees)
- `radius_deg`: Search radius (degrees)
- `page`: Page number
- `pageSize`: Results per page

**Example Response**:
```json
{
  "data": [
    {
      "id": 1,
      "primaryName": "M31",
      "catalogIds": {
        "messier": "M31",
        "ngc": "NGC 224"
      },
      "class": "galaxy",
      "constellation": "Andromeda",
      "raJ2000Deg": 10.6847,
      "decJ2000Deg": 41.2687,
      "mag": 3.4,
      "majorArcmin": 178.0,
      "minorArcmin": 63.0,
      "alternateNames": ["Andromeda Galaxy", "NGC 224"]
    }
  ]
}
```

#### Cone Search Example

Find objects within 3° of M31:
```bash
curl 'http://localhost:8080/astrodb/v1/catalog/objects?near_ra=10.6847&near_dec=41.2687&radius_deg=3'
```

### Satellite API

#### List Satellites

```bash
GET /astrodb/v1/satobs/satellites?bright_first=true&page=1&pageSize=50
```

**Query Parameters**:
- `bright_first`: Sort by brightness (brightest first)
- `page`: Page number
- `pageSize`: Results per page

**Example Response**:
```json
{
  "data": [
    {
      "id": 1,
      "noradId": 25544,
      "name": "ISS (ZARYA)",
      "operator": "International",
      "category": "station",
      "visualMagEst": -2.0,
      "latestTLE": {
        "line1": "1 25544U 98067A   23365.50000000 ...",
        "line2": "2 25544  51.6400 ...",
        "epoch": "2023-12-31T12:00:00Z"
      }
    }
  ]
}
```

#### Get Satellite Passes

Predict when a satellite will be visible from your location:

```bash
GET /astrodb/v1/satobs/passes?norad_id=25544&lat=34.05&lon=-118.24&alt_m=100&from=2025-11-10T00:00:00Z&to=2025-11-11T00:00:00Z
```

**Query Parameters** (all required):
- `norad_id`: NORAD catalog number
- `lat`: Observer latitude (degrees)
- `lon`: Observer longitude (degrees)
- `alt_m`: Observer altitude (meters)
- `from`: Start time (ISO 8601)
- `to`: End time (ISO 8601)

**Example Response**:
```json
{
  "data": {
    "satellite": {
      "noradId": 25544,
      "name": "ISS (ZARYA)"
    },
    "passes": [
      {
        "riseTime": "2025-11-10T05:30:00Z",
        "setTime": "2025-11-10T05:36:00Z",
        "maxElevation": 45.5,
        "maxElevationTime": "2025-11-10T05:33:00Z",
        "duration": 360,
        "visible": true
      }
    ],
    "observer": {
      "latitude": 34.05,
      "longitude": -118.24,
      "altitude": 100
    }
  }
}
```

### Events API

#### List Events

```bash
GET /astrodb/v1/events?type=meteor_shower_peak&from=2025-01-01&to=2026-12-31&country=US
```

**Query Parameters**:
- `type`: Event type (solar_eclipse, lunar_eclipse, meteor_shower_peak, planetary_conjunction, planetary_opposition, occultation, comet_perihelion, supermoon, other)
- `from`: Start date (ISO 8601)
- `to`: End date (ISO 8601)
- `country`: ISO 3166-1 alpha-2 country code
- `continent`: Continent code (NA, SA, EU, AF, AS, OC, AN)
- `page`: Page number
- `pageSize`: Results per page

**Example Response**:
```json
{
  "data": [
    {
      "id": 1,
      "title": "Perseid Meteor Shower Peak 2025",
      "type": "meteor_shower_peak",
      "startUtc": "2025-08-12T00:00:00Z",
      "endUtc": "2025-08-13T23:59:59Z",
      "summary250": "The annual Perseid meteor shower reaches its peak...",
      "url": "https://www.amsmeteors.org/",
      "visibility": [
        {
          "scope": "global",
          "continentCode": null,
          "countryIso2": null,
          "regionName": null
        }
      ],
      "tags": ["naked-eye", "meteor-shower"]
    }
  ]
}
```

## Data Sources & Licensing

All data includes source attribution. Common sources:

- **Equipment**: Manufacturer websites, ASCOM/INDI device catalogs
- **Catalog**: OpenNGC, SIMBAD, Messier/Caldwell/NGC catalogs
- **Satellites**: CelesTrak (public TLE data)
- **Events**: NASA eclipse bulletins, IAU meteor shower calendars

Each record includes:
- `source_name`: Data source name
- `source_url`: Original data URL
- `license`: License type (Public Domain, CC-BY, etc.)

## Development

### Project Structure

```
/workspace
├── server/
│   ├── astrodb-routes.ts       # API route handlers
│   ├── astrodb-storage.ts      # Database access layer
│   ├── astrodb-seed.ts         # Seed data script
│   └── services/
│       └── satellite-passes.ts  # Pass prediction
├── worker/
│   ├── main.py                 # Scraper/scheduler
│   ├── importer.py             # NDJSON importer
│   ├── requirements.txt        # Python dependencies
│   └── Dockerfile              # Worker container
├── shared/
│   └── astrodb-schema.ts       # Drizzle schemas
└── data/
    └── staging/                # NDJSON staging files
```

### Running Locally

1. **Start PostgreSQL**:
   ```bash
   docker run -d -p 5432:5432 \
     -e POSTGRES_PASSWORD=postgres \
     postgres:15-alpine
   ```

2. **Set environment variables**:
   ```bash
   export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
   export ASTRO_KB_ENABLED=true
   ```

3. **Run migrations**:
   ```bash
   npm run db:push
   ```

4. **Seed database**:
   ```bash
   tsx server/astrodb-seed.ts
   ```

5. **Start API server**:
   ```bash
   npm run dev
   ```

6. **Start worker** (optional):
   ```bash
   cd worker
   pip install -r requirements.txt
   python main.py
   ```

### Adding New Data Sources

1. Create scraper in `worker/main.py`
2. Add parser in `worker/importer.py`
3. Update schemas in `shared/astrodb-schema.ts`
4. Run migrations: `npm run db:push`

## Scheduled Data Updates

The worker runs on the following schedule:

- **Equipment**: Weekly (Sunday 3:00 AM UTC)
- **Catalog**: Monthly (1st of month, 2:00 AM UTC)
- **TLEs**: Hourly
- **Events**: Monthly (1st of month, 4:00 AM UTC)

## Rate Limiting

All scrapers respect:
- Default: 2 requests/second per host
- Exponential backoff on errors
- robots.txt compliance
- User-Agent identification

## Monitoring

### Import Run History

```bash
GET /astrodb/v1/admin/import-runs?domain=equipment
```

Returns history of data imports with metrics:
- Records fetched
- Records inserted/updated
- Duration
- Errors

### Health Check

```bash
GET /astrodb/v1/health
```

Returns service status and feature flag state.

## Testing

### Example Queries

```bash
# List all cameras from ZWO
curl 'http://localhost:8080/astrodb/v1/equipment/devices?category=camera&manufacturer=ZWO'

# Find galaxies brighter than magnitude 8
curl 'http://localhost:8080/astrodb/v1/catalog/objects?class=galaxy&mag_lte=8'

# Get ISS passes for Los Angeles
curl 'http://localhost:8080/astrodb/v1/satobs/passes?norad_id=25544&lat=34.05&lon=-118.24&alt_m=100&from=2025-11-10T00:00:00Z&to=2025-11-11T00:00:00Z'

# Find events visible in the US during 2025
curl 'http://localhost:8080/astrodb/v1/events?country=US&from=2025-01-01&to=2025-12-31'
```

## Production Deployment

### Environment Variables

Required:
- `DATABASE_URL`: PostgreSQL connection string
- `ASTRO_KB_ENABLED`: Set to `"true"` to enable API

Optional:
- `PORT`: API server port (default: 5000)
- `NODE_ENV`: Environment (production/development)

### Security

- All public routes are GET-only
- Admin routes require authentication (implement as needed)
- CORS restricted to app origin
- Rate limiting: 60 requests/minute per IP (recommended)

### Backup Strategy

1. **Database**: Daily PostgreSQL backups
2. **Staging data**: Archive processed NDJSON files
3. **TLE history**: Retain last 30 days of TLEs

## Support & Contributing

For issues or feature requests, please see the main project README.

## License

This astronomical knowledge base aggregates data from multiple sources with varying licenses. Each record includes source attribution and license information. Please respect the terms of each data source.
