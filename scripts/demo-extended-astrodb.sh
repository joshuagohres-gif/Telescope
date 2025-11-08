#!/bin/bash
# Demo script for Extended AstroDB APIs

set -e

BASE_URL="${BASE_URL:-http://localhost:5000}"

echo "==================================="
echo "Extended AstroDB API Demo"
echo "==================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ===== OPERATIONS & ENVIRONMENT =====

echo -e "${BLUE}===== Operations & Environment =====${NC}"
echo ""

echo -e "${GREEN}1. Get Sites${NC}"
curl -s "$BASE_URL/astrodb/v1/ops/sites?name=Mauna" | jq '.'
echo ""

echo -e "${GREEN}2. Get Weather Forecast${NC}"
SITE_ID=$(curl -s "$BASE_URL/astrodb/v1/ops/sites" | jq -r '.data[0].id')
curl -s "$BASE_URL/astrodb/v1/ops/weather/$SITE_ID" | jq '.data[0:3]'
echo ""

echo -e "${GREEN}3. Get Horizon Profile${NC}"
curl -s "$BASE_URL/astrodb/v1/ops/horizon/$SITE_ID" | jq '.data[0:5]'
echo ""

echo -e "${GREEN}4. Interpolate Horizon Altitude${NC}"
curl -s "$BASE_URL/astrodb/v1/ops/horizon/$SITE_ID/interpolate?az_deg=135" | jq '.'
echo ""

echo -e "${GREEN}5. Get Dew Risk${NC}"
curl -s "$BASE_URL/astrodb/v1/ops/dew/risk/$SITE_ID" | jq '.data[0:3]'
echo ""

echo -e "${GREEN}6. Get Light Pollution for Site${NC}"
curl -s "$BASE_URL/astrodb/v1/ops/lightpollution/site/$SITE_ID" | jq '.'
echo ""

# ===== CALIBRATION =====

echo -e "${BLUE}===== Equipment & Calibration =====${NC}"
echo ""

echo -e "${GREEN}7. Get Optical Trains${NC}"
curl -s "$BASE_URL/astrodb/v1/calib/trains" | jq '.data[0]'
echo ""

echo -e "${GREEN}8. Get Master Frames${NC}"
TRAIN_ID=$(curl -s "$BASE_URL/astrodb/v1/calib/trains" | jq -r '.data[0].id')
curl -s "$BASE_URL/astrodb/v1/calib/masters?train_id=$TRAIN_ID&frame_type=flat" | jq '.data[0]'
echo ""

echo -e "${GREEN}9. Get Focus Profiles${NC}"
curl -s "$BASE_URL/astrodb/v1/calib/focus/profiles?train_id=$TRAIN_ID" | jq '.data[0]'
echo ""

echo -e "${GREEN}10. Estimate Focus Position${NC}"
curl -s "$BASE_URL/astrodb/v1/calib/focus/estimate/$TRAIN_ID?filter_name=L&temp_c=8.5" | jq '.'
echo ""

echo -e "${GREEN}11. Get Backfocus Offsets${NC}"
curl -s "$BASE_URL/astrodb/v1/calib/backfocus/$TRAIN_ID" | jq '.data[0:3]'
echo ""

echo -e "${GREEN}12. Get Filters${NC}"
curl -s "$BASE_URL/astrodb/v1/calib/filters" | jq '.data[0]'
echo ""

echo -e "${GREEN}13. Get Filter Transmission Curve${NC}"
FILTER_ID=$(curl -s "$BASE_URL/astrodb/v1/calib/filters" | jq -r '.data[0].id')
curl -s "$BASE_URL/astrodb/v1/calib/filters/$FILTER_ID/curve" | jq '.data.curve[0:5]'
echo ""

echo -e "${GREEN}14. Get Sensors${NC}"
curl -s "$BASE_URL/astrodb/v1/calib/sensors" | jq '.data[0]'
echo ""

# ===== TARGETS & ALERTS =====

echo -e "${BLUE}===== Targeting & Alerts =====${NC}"
echo ""

echo -e "${GREEN}15. Get Transients${NC}"
curl -s "$BASE_URL/astrodb/v1/targets/transients?type=supernova" | jq '.data[0]'
echo ""

echo -e "${GREEN}16. Get Notices${NC}"
curl -s "$BASE_URL/astrodb/v1/targets/notices?source=TNS" | jq '.data[0]'
echo ""

echo -e "${GREEN}17. Get Minor Planets${NC}"
curl -s "$BASE_URL/astrodb/v1/targets/minorplanets?name=Ceres" | jq '.data[0]'
echo ""

echo -e "${GREEN}18. Get Minor Planet Ephemeris${NC}"
MP_ID=$(curl -s "$BASE_URL/astrodb/v1/targets/minorplanets?name=Ceres" | jq -r '.data[0].id')
curl -s "$BASE_URL/astrodb/v1/targets/minorplanets/$MP_ID/ephemeris" | jq '.data[0:3]'
echo ""

echo -e "${GREEN}19. Get Planetary Features${NC}"
curl -s "$BASE_URL/astrodb/v1/targets/features?body=moon&feature_type=crater" | jq '.data[0]'
echo ""

echo -e "${GREEN}20. Get Star Hop for M57${NC}"
curl -s "$BASE_URL/astrodb/v1/targets/hops/M57" | jq '.data[0:2]'
echo ""

# ===== PLANNING, QA & PERSONALIZATION =====

echo -e "${BLUE}===== Planning, QA & Personalization =====${NC}"
echo ""

echo -e "${GREEN}21. Get Exposure Recipes${NC}"
curl -s "$BASE_URL/astrodb/v1/planqa/recipes?target_type=dso" | jq '.data[0]'
echo ""

echo -e "${GREEN}22. Estimate SNR${NC}"
curl -s "$BASE_URL/astrodb/v1/planqa/snr/estimate?train_id=$TRAIN_ID&filter_name=L&target_type=dso&exposure_sec=300&sky_mpsas=21.0" | jq '.'
echo ""

echo -e "${GREEN}23. Get SNR Models${NC}"
curl -s "$BASE_URL/astrodb/v1/planqa/snr/models?train_id=$TRAIN_ID" | jq '.data[0]'
echo ""

echo -e "${GREEN}24. Get Imaging Sessions${NC}"
curl -s "$BASE_URL/astrodb/v1/planqa/sessions?train_id=$TRAIN_ID" | jq '.data[0]'
echo ""

echo -e "${GREEN}25. Get Session QA Summary${NC}"
SESSION_ID=$(curl -s "$BASE_URL/astrodb/v1/planqa/sessions?train_id=$TRAIN_ID" | jq -r '.data[0].id')
curl -s "$BASE_URL/astrodb/v1/planqa/sessions/$SESSION_ID/qa" | jq '.data.metrics | keys'
echo ""

echo -e "${GREEN}26. Get User Site Profiles${NC}"
curl -s "$BASE_URL/astrodb/v1/planqa/profiles/user_001/sites" | jq '.data[0]'
echo ""

echo ""
echo -e "${GREEN}==================================="
echo "Demo Complete!"
echo "===================================${NC}"
