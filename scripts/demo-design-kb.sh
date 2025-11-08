#!/bin/bash

# Design KB API Demo Script
# Demonstrates the telescope design knowledge base features

set -e

API_BASE="${API_BASE:-http://localhost:5000}"

echo "🔭 Telescope Design Knowledge Base API Demo"
echo "============================================"
echo ""
echo "Using API base: $API_BASE"
echo ""

# Health check
echo "1️⃣  Health Check"
echo "   GET $API_BASE/astrodb/v1/designs/health"
curl -s "$API_BASE/astrodb/v1/designs/health" | jq '.'
echo ""

# Concepts - Search for collimation
echo "2️⃣  Concepts: Search for collimation methods"
echo "   GET $API_BASE/astrodb/v1/designs/concepts?q=collimation&limit=3"
curl -s "$API_BASE/astrodb/v1/designs/concepts?q=collimation&limit=3" | jq '.data[0:2] | .[] | {title, category, difficulty}'
echo ""

# Concepts - Optics category
echo "3️⃣  Concepts: Optical design concepts"
echo "   GET $API_BASE/astrodb/v1/designs/concepts?category=optics&limit=3"
curl -s "$API_BASE/astrodb/v1/designs/concepts?category=optics&limit=3" | jq '.data[0:2] | .[] | {title, summary}'
echo ""

# Equations with tests
echo "4️⃣  Equations: List equations with unit tests"
echo "   GET $API_BASE/astrodb/v1/designs/equations?has_tests=true"
curl -s "$API_BASE/astrodb/v1/designs/equations?has_tests=true" | jq '.data[0:2] | .[] | {name, validationStatus}'
echo ""

# Specific equation
echo "5️⃣  Equation: Secondary mirror sizing formula"
echo "   GET $API_BASE/astrodb/v1/designs/equations/1"
curl -s "$API_BASE/astrodb/v1/designs/equations/1" | jq '{name: .data.name, latex: .data.latex, tests: .data.unitTests | length, status: .data.validationStatus}'
echo ""

# Examples - Newtonians
echo "6️⃣  Examples: List Newtonian telescope designs"
echo "   GET $API_BASE/astrodb/v1/designs/examples?type=newtonian"
curl -s "$API_BASE/astrodb/v1/designs/examples?type=newtonian" | jq '.data[0:3] | .[] | {title, apertureMm, focalRatio, obstructionPct}'
echo ""

# Examples - By aperture range
echo "7️⃣  Examples: Designs in 100-150mm aperture range"
echo "   GET $API_BASE/astrodb/v1/designs/examples?aperture_min=100&aperture_max=150"
curl -s "$API_BASE/astrodb/v1/designs/examples?aperture_min=100&aperture_max=150" | jq '.data[] | {title, apertureMm, focalLengthMm, totalMassKg}'
echo ""

# Specific example with details
echo "8️⃣  Example: Full details of 80mm f/5 design"
echo "   GET $API_BASE/astrodb/v1/designs/examples/1"
curl -s "$API_BASE/astrodb/v1/designs/examples/1" | jq '{
  title: .data.title,
  specs: {
    aperture: .data.apertureMm,
    focalRatio: .data.focalRatio,
    obstruction: .data.obstructionPct
  },
  bom_items: (.data.billOfMaterials | length),
  dimensions: (.data.dimensions | length),
  procedures: (.data.procedures | length),
  feasibility: .data.feasibilityChecks
}'
echo ""

# Procedures - Safety
echo "9️⃣  Procedures: Safety procedures"
echo "   GET $API_BASE/astrodb/v1/designs/procedures?type=safety"
curl -s "$API_BASE/astrodb/v1/designs/procedures?type=safety" | jq '.data[] | {title, type, estimatedTimeMin, steps: (.steps | length)}'
echo ""

# Export manifest
echo "🔟  Export Manifest: Training data information"
echo "   GET $API_BASE/astrodb/v1/designs/exports/manifest"
curl -s "$API_BASE/astrodb/v1/designs/exports/manifest" | jq '{
  version,
  coverage,
  splits: {
    train: .splits.train.count,
    val: .splits.val.count,
    test: .splits.test.count
  }
}'
echo ""

# Training export sample
echo "1️⃣1️⃣  Training Export: Sample from training set (first 2 lines)"
echo "   GET $API_BASE/astrodb/v1/designs/exports/training?format=ndjson&split=train"
curl -s "$API_BASE/astrodb/v1/designs/exports/training?format=ndjson&split=train" | head -n 2 | jq '{
  instruction,
  aperture: .input.constraints.aperture_mm,
  dimensions: (.output.major_dimensions | length),
  bom: (.output.bom | length),
  feasible: .output.feasibility.secondarySizeValid
}'
echo ""

echo "✅ Demo complete!"
echo ""
echo "📚 For full documentation, see:"
echo "   - README-design-kb.md"
echo "   - $API_BASE/astrodb/v1/designs/docs"
echo ""
echo "🚀 Try these commands:"
echo "   # Get 150mm class designs"
echo "   curl '$API_BASE/astrodb/v1/designs/examples?aperture_min=140&aperture_max=160'"
echo ""
echo "   # Search for secondary sizing concepts"
echo "   curl '$API_BASE/astrodb/v1/designs/concepts?q=secondary'"
echo ""
echo "   # Download training data"
echo "   curl '$API_BASE/astrodb/v1/designs/exports/training?split=train' -o train.ndjson"
