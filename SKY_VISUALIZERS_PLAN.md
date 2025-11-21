# Sky Visualizers Feature - Implementation Plan

## Overview
Build a comprehensive "Sky Visualizers" page that allows users to generate detailed visualizations of solar system object orbital trajectories (top-down system view) and sky path visualizations (from Earth's perspective) for planets, comets, asteroids, and other solar system bodies.

## Architecture

### Backend Components

#### 1. Database Schema (`shared/sky-visualizers-schema.ts`)
- **solar_system_object**: Metadata for planets, comets, asteroids
  - id, name, designation, type (planet/comet/asteroid/etc)
  - discovery info, physical properties
- **orbital_data**: Cached orbital elements and ephemeris
  - body_id, epoch, orbital elements (a, e, i, Ω, ω, M)
  - source, updated_at
- **trajectory_cache**: Pre-computed trajectory points
  - body_id, time_range, points (JSONB array of {t, x, y, z, ra, dec})
  - computed_at
- **sky_path_cache**: Pre-computed sky paths from Earth
  - body_id, observer_lat, observer_lon, time_range
  - path_points (JSONB array of {t, ra, dec, alt, az, magnitude})
- **visualization_assets**: High-quality graphics/textures
  - object_id, asset_type (texture, model, image)
  - url, metadata

#### 2. Data Scraper Worker (`worker/sky_visualizers_scraper.py`)
Scrape orbital data from 10+ sources:
1. **JPL Horizons** - High-precision ephemeris for all major bodies
2. **Minor Planet Center (MPC)** - Asteroid/comet orbital elements
3. **NASA Solar System Dynamics** - Planetary data
4. **JPL Small-Body Database** - Comets and asteroids
5. **IAU Minor Planet Center** - MPCORB.DAT format
6. **NASA Near Earth Object Program** - NEO data
7. **JPL Comet Ephemeris Service** - Comet predictions
8. **ESA Space Situational Awareness** - Space object data
9. **Lowell Observatory** - Asteroid/comet data
10. **AstDyS** - Asteroids Dynamic Site
11. **Additional sources**: Comet Observation Database, Asteroid Lightcurve Database

Features:
- Periodic scraping (daily/weekly)
- Rate limiting and respectful scraping
- Data validation and deduplication
- Error handling and retry logic

#### 3. Simulation Engine (`server/lib/astro/orbital-simulator.ts`)
- Keplerian orbit propagation
- N-body perturbations (for high accuracy)
- Coordinate transformations (heliocentric → geocentric → equatorial)
- Time range trajectory generation
- Sky path calculation from observer location
- Support for:
  - Planets (using existing planet.ts code)
  - Comets (parabolic/hyperbolic orbits)
  - Asteroids (elliptical orbits)
  - Moons (for major planets)

#### 4. API Routes (`server/sky-visualizers-routes.ts`)
- `GET /api/sky-visualizers/objects` - List all available objects
- `GET /api/sky-visualizers/objects/:id` - Get object details
- `GET /api/sky-visualizers/objects/:id/trajectory` - Get orbital trajectory
  - Query params: start_date, end_date, step_days, format
- `GET /api/sky-visualizers/objects/:id/sky-path` - Get sky path from Earth
  - Query params: lat, lon, start_date, end_date, step_hours
- `POST /api/sky-visualizers/compute` - Compute custom trajectory/path
- `GET /api/sky-visualizers/assets/:object_id` - Get visualization assets

### Frontend Components

#### 1. Main Page (`client/src/pages/sky-visualizers.tsx`)
- Layout with controls sidebar and visualization canvas
- Object selector
- Location/time controls
- Visualization mode toggle (trajectory vs sky path)

#### 2. Orbital Trajectory Visualizer (`client/src/sky-visualizers/OrbitalTrajectoryView.tsx`)
- 3D/2D top-down solar system view
- Interactive camera controls (zoom, pan, rotate)
- Multiple object display
- Time animation
- Orbital plane visualization
- Distance scales and labels
- Planet/object rendering with textures

#### 3. Sky Path Visualizer (`client/src/sky-visualizers/SkyPathView.tsx`)
- Celestial sphere projection (stereographic, azimuthal, etc.)
- Horizon overlay
- Constellation lines
- Time-lapse path visualization
- Altitude/azimuth grid
- Magnitude color coding
- Rise/set times display

#### 4. Controls Components
- **ObjectSelector** (`client/src/sky-visualizers/ObjectSelector.tsx`)
  - Search/filter by type, name
  - Favorites
  - Multi-select for comparison
- **LocationInput** (`client/src/sky-visualizers/LocationInput.tsx`)
  - Lat/lon input
  - Map picker
  - Location presets
- **TimeControls** (`client/src/sky-visualizers/TimeControls.tsx`)
  - Date/time picker
  - Time range selector
  - Animation controls (play/pause, speed)
  - Current time indicator

#### 5. Educational Features
- **OrbitalMechanicsPanel** - Explanations of orbital elements
- **InteractiveTutorials** - Step-by-step guides
- **InfoTooltips** - Contextual help
- **ComparisonMode** - Compare multiple objects side-by-side

#### 6. Visualization Libraries
- Use Three.js for 3D orbital view (already in dependencies)
- Use Canvas 2D or SVG for sky path view
- Consider D3.js for data visualization
- Recharts for charts/graphs (already available)

## Data Sources Details

### Primary Sources
1. **JPL Horizons** (https://ssd.jpl.nasa.gov/horizons/)
   - API for ephemeris generation
   - High precision for all major bodies
   - Format: CSV/JSON

2. **Minor Planet Center** (https://minorplanetcenter.net/)
   - MPCORB.DAT for asteroid elements
   - CometEls.txt for comet elements
   - Daily updates

3. **NASA Solar System Dynamics** (https://ssd.jpl.nasa.gov/)
   - Planetary data
   - Moon ephemeris
   - Physical parameters

4. **JPL Small-Body Database** (https://ssd.jpl.nasa.gov/sbdb.cgi)
   - Asteroid/comet search
   - Orbital elements
   - Physical properties

5. **NASA NEO Program** (https://cneos.jpl.nasa.gov/)
   - Near-Earth object data
   - Close approach predictions

6. **Comet Observation Database** (https://www.cometobservation.com/)
   - Visual magnitude estimates
   - Observation reports

7. **Asteroid Lightcurve Database** (http://alcdef.org/)
   - Rotation periods
   - Lightcurve data

8. **ESA Space Situational Awareness** (https://www.esa.int/)
   - Space object catalog
   - Orbital data

9. **Lowell Observatory** (https://www.lowell.edu/)
   - Asteroid data
   - Discovery information

10. **AstDyS** (https://newton.spacedys.com/astdys/)
    - Asteroid dynamics
    - Proper elements

### Graphical Assets Sources
- NASA Planetary Photojournal
- ESA Space Images
- JPL Image Gallery
- Hubble Space Telescope images
- Planetary textures from various sources
- 3D models from NASA 3D Resources

## Implementation Phases

### Phase 1: Foundation (Database & Backend)
1. Create database schema
2. Build basic scraper for 3-4 primary sources
3. Implement core simulation engine
4. Create API routes
5. Set up storage layer

### Phase 2: Core Visualizations
1. Build orbital trajectory visualizer (2D first, then 3D)
2. Build sky path visualizer
3. Create main page layout
4. Implement basic controls

### Phase 3: Enhanced Features
1. Expand scraper to all 10+ sources
2. Add graphical asset scraper
3. Implement time animation
4. Add educational features
5. Improve visual quality

### Phase 4: Polish & Optimization
1. Performance optimization
2. Caching strategies
3. Export features
4. Mobile responsiveness
5. Documentation

## Technical Considerations

### Performance
- Cache computed trajectories (avoid recomputation)
- Use Web Workers for heavy calculations
- Lazy load visualization components
- Progressive rendering for large datasets

### Accuracy
- Use JPL Horizons for high-precision needs
- Implement proper coordinate transformations
- Account for light-time correction
- Handle relativistic effects for extreme precision

### User Experience
- Smooth animations
- Responsive controls
- Clear visual feedback
- Educational tooltips
- Export capabilities

### Data Management
- Periodic updates (daily for comets/asteroids, weekly for planets)
- Version tracking for orbital elements
- Cleanup old cached data
- Handle data source failures gracefully

## Dependencies to Add

### Backend
- `axios` or `node-fetch` for HTTP requests
- `cheerio` or `jsdom` for HTML parsing (if needed)
- `csv-parse` for parsing MPCORB.DAT
- `node-cron` for scheduled scraping

### Frontend
- `@react-three/fiber` and `@react-three/drei` for 3D (if not using raw Three.js)
- `d3-geo` for sky projections (optional)
- `date-fns` (already available)

## File Structure

```
server/
  sky-visualizers-routes.ts
  sky-visualizers-storage.ts
  lib/
    astro/
      orbital-simulator.ts
      trajectory-calculator.ts
      sky-path-calculator.ts

client/src/
  pages/
    sky-visualizers.tsx
  sky-visualizers/
    OrbitalTrajectoryView.tsx
    SkyPathView.tsx
    ObjectSelector.tsx
    LocationInput.tsx
    TimeControls.tsx
    OrbitalMechanicsPanel.tsx
    components/
      PlanetRenderer.tsx
      OrbitPath.tsx
      SkyGrid.tsx

worker/
  sky_visualizers_scraper.py
  sky_visualizers_importer.py

shared/
  sky-visualizers-schema.ts
```

## Success Metrics
- Support for 1000+ solar system objects
- Real-time trajectory computation (< 1s for 1 year range)
- Accurate sky paths (< 1 arcminute error)
- Beautiful, educational visualizations
- Smooth 60fps animations
- Data from 10+ reliable sources
