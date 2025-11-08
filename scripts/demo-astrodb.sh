#!/bin/bash

# AstroDB API Demo Script
# Demonstrates the "Definition of Done" requirements

set -e

API_BASE="${API_BASE:-http://localhost:8080}"

echo "🌌 AstroDB API Demo"
echo "==================="
echo ""
echo "Using API base: $API_BASE"
echo ""

# Health check
echo "1️⃣  Health Check"
echo "   GET $API_BASE/astrodb/v1/health"
curl -s "$API_BASE/astrodb/v1/health" | jq '.'
echo ""

# Equipment - Cameras
echo "2️⃣  Equipment: List cameras from ZWO"
echo "   GET $API_BASE/astrodb/v1/equipment/devices?category=camera&manufacturer=ZWO"
curl -s "$API_BASE/astrodb/v1/equipment/devices?category=camera&manufacturer=ZWO" | jq '.data[0:2]'
echo ""

# Equipment - Mounts with high payload
echo "3️⃣  Equipment: Mounts with high payload capacity"
echo "   GET $API_BASE/astrodb/v1/equipment/devices?category=mount"
curl -s "$API_BASE/astrodb/v1/equipment/devices?category=mount" | jq '.data[0:2]'
echo ""

# Catalog - Galaxies
echo "4️⃣  Catalog: Bright galaxies (mag <= 5)"
echo "   GET $API_BASE/astrodb/v1/catalog/objects?class=galaxy&mag_lte=5"
curl -s "$API_BASE/astrodb/v1/catalog/objects?class=galaxy&mag_lte=5" | jq '.data[0:2]'
echo ""

# Catalog - Cone search around M31
echo "5️⃣  Catalog: Objects near M31 (cone search within 3°)"
echo "   GET $API_BASE/astrodb/v1/catalog/objects?near_ra=10.6847&near_dec=41.2687&radius_deg=3"
curl -s "$API_BASE/astrodb/v1/catalog/objects?near_ra=10.6847&near_dec=41.2687&radius_deg=3" | jq '.data[0]'
echo ""

# Satellites
echo "6️⃣  Satellites: Brightest satellites"
echo "   GET $API_BASE/astrodb/v1/satobs/satellites?bright_first=true"
curl -s "$API_BASE/astrodb/v1/satobs/satellites?bright_first=true" | jq '.data[0:2]'
echo ""

# ISS Passes
echo "7️⃣  Satellites: ISS passes over Los Angeles"
echo "   GET $API_BASE/astrodb/v1/satobs/passes?norad_id=25544&lat=34.05&lon=-118.24&alt_m=100&from=2025-11-10T00:00:00Z&to=2025-11-11T00:00:00Z"
curl -s "$API_BASE/astrodb/v1/satobs/passes?norad_id=25544&lat=34.05&lon=-118.24&alt_m=100&from=2025-11-10T00:00:00Z&to=2025-11-11T00:00:00Z" | jq '.data.passes[0:2]'
echo ""

# Events
echo "8️⃣  Events: 2025-2026 events"
echo "   GET $API_BASE/astrodb/v1/events?from=2025-01-01&to=2026-12-31"
curl -s "$API_BASE/astrodb/v1/events?from=2025-01-01&to=2026-12-31" | jq '.data[0]'
echo ""

# Events filtered by country
echo "9️⃣  Events: Events visible in the US"
echo "   GET $API_BASE/astrodb/v1/events?country=US&from=2025-01-01&to=2026-12-31"
curl -s "$API_BASE/astrodb/v1/events?country=US&from=2025-01-01&to=2026-12-31" | jq '.data[0]'
echo ""

echo "✅ Demo complete!"
echo ""
echo "📚 See README-astrodb.md for full API documentation"
