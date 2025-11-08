# Targets Pack UI Components

This directory contains the UI components for the Targets Pack feature (items 5-7 from the feature list).

## Components

### 1. Tonight's Targets (`tonights-targets.tsx`)

Interactive list of visible celestial objects for tonight with:
- Hourly alt/az positions
- Peak altitude times
- Filters: object class, minimum altitude
- Real-time updates (refreshes every 5 minutes)

**API Endpoint:** `GET /astrodb/v1/targets/tonight?lat=X&lon=Y&from=ISO&to=ISO&step=60m`

**Features:**
- Displays showpieces visible tonight (6 PM to 6 AM local time)
- Shows hourly positions for each object
- Filters by object class (star, galaxy, nebula, cluster, planet, etc.)
- Filters by minimum altitude
- Sorted by peak altitude (highest first)

### 2. ISS Pass Tracker (`iss-pass-tracker.tsx`)

Timeline view of upcoming ISS passes with:
- Next 12 hours of passes
- Visibility badges (sunlit, elevation, twilight conditions)
- Rise/set times, max elevation, duration
- Countdown timer to next pass
- Real-time updates (refreshes every 5 minutes)

**API Endpoint:** `GET /astrodb/v1/targets/passes?norad_id=25544&lat=X&lon=Y&alt_m=0&from=ISO&to=ISO`

**Features:**
- Shows all ISS passes in the next 12 hours
- Highlights the next upcoming pass with countdown
- Displays visibility conditions (daylight, twilight, dark)
- Shows rise, peak, and set times with azimuths
- Indicates which pass is currently active

### 3. Lunar Atlas (`lunar-atlas.tsx`)

Searchable map/list of lunar surface features with:
- Radius search (find features within X km of lat/lon)
- Name search
- Feature type filters (crater, mare, mountain, etc.)
- Display feature details: name, type, diameter, coordinates

**API Endpoint:** `GET /astrodb/v1/targets/features?body=Moon&near=lat,lon&radius_km=Z` or `GET /astrodb/v1/targets/features?body=Moon&name=NAME`

**Features:**
- Two search modes: radius search and name search
- Radius search finds features within specified distance of coordinates
- Name search finds features by partial name match
- Filter by feature type (crater, mare, mountain, ridge, valley, rille, dome)
- Displays feature coordinates, diameter, and type

## Integration

All components are integrated into the main dashboard at `/pages/dashboard.tsx` in a new "Targets Pack" section with tabs for each component.

## Feature Flag

All components check for the `ASTRO_TARGETS_ENABLED` environment variable. If not enabled, they display an alert message instead of attempting to fetch data.

## Location Service

All components use the `locationService` from `@/utils/locationService` to get the observer's location. If location is unavailable, they fall back to a default location (San Francisco).

## Real-time Updates

- **Tonight's Targets**: Refreshes every 5 minutes
- **ISS Pass Tracker**: Refreshes every 5 minutes, countdown updates every second
- **Lunar Atlas**: Manual refresh only (search-based)

## Styling

Components follow the existing design system:
- Use shadcn/ui components (Card, Badge, Button, etc.)
- Follow the same color scheme and spacing as other telescope components
- Responsive design for mobile and desktop
- Loading states with skeletons
- Error states with alerts

## API Response Format

All endpoints return data in the following format:

```json
{
  "data": [...],
  "version": "1.0.0",
  "generated_at": "2024-01-15T10:30:00Z"
}
```

Components extract the `data` field from the response.
