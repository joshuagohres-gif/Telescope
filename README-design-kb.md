# Telescope Design Knowledge Base

A comprehensive knowledge base for small telescope design methodology, providing curated design patterns, verified equations, dimensioned examples, and training data for parametric synthesis.

## Overview

The Design KB provides:
- **40+ Concepts**: Design methodologies across optics, mechanics, testing, and safety
- **25+ Equations**: Verified optical and mechanical formulas with unit tests
- **18+ Dimensioned Examples**: Fully specified telescope designs (60-300mm aperture)
- **Safety Procedures**: Critical safety protocols for solar observing and laser use
- **Training Export**: NDJSON format for generative design systems

## Features

### Knowledge Domains

1. **Optics**: Focal ratios, illumination, aberrations, diffraction limits
2. **Mechanics**: Mirror cells, tube design, focusers, spiders
3. **Mount**: Dobsonian friction balance, bearing design
4. **Assembly**: Print orientation, fasteners, adhesives
5. **Collimation**: Star test, laser safety, Cheshire procedures
6. **Testing**: Foucault, Ronchi, tolerance budgeting
7. **Safety**: Solar observing, laser collimation, electrical safety
8. **Printing**: Material selection, post-processing, settings by part role

### Validated Equations

All equations include:
- LaTeX notation
- Variable definitions with SI units
- Unit tests with expected outputs and tolerances
- Domain of validity and assumptions
- References to authoritative sources

Example equations:
- Secondary mirror sizing for Newtonians
- Focal ratio calculations
- Diffraction limits (Dawes, Rayleigh)
- Exit pupil and magnification
- True field of view
- Obstruction percentages
- Coma-free field diameter

### Dimensioned Examples

Each example includes:
- Complete bill of materials with vendors and costs
- 3D print settings (layer height, infill, material)
- Dimension table with tolerances
- Part files (STL, STEP) with licensing
- Assembly and collimation procedures
- Feasibility checks (for Newtonians)

**Newtonian Examples:**
- 80mm f/5 Budget Newtonian (~$75 total)
- 114mm f/4.5 Wide-Field
- 130mm f/5 All-Rounder
- 150mm f/4 Fast Astrograph
- 150mm f/5 Classic
- 200mm f/5 Premium

**Refractors:**
- 60mm f/10 Simple Achromat
- 80mm f/7 Short Tube

**Mounts:**
- Tabletop Dobsonian
- Full-Size Dob Base
- Alt-Az Yoke

## API Reference

All endpoints require `ASTRO_DESIGN_KB_ENABLED=true` environment variable.

### Base URL

```
/astrodb/v1/designs
```

### Concepts

```bash
# List concepts
GET /astrodb/v1/designs/concepts
  ?q=<search>
  &category=<optics|mechanics|mount|assembly|collimation|testing|safety|printing|materials|fasteners>
  &difficulty=<intro|intermediate|advanced>
  &tag=<tag>
  &limit=<20>
  &offset=<0>

# Get specific concept
GET /astrodb/v1/designs/concepts/:id
```

**Example Response:**
```json
{
  "data": {
    "id": 1,
    "title": "Secondary Mirror Sizing for Newtonians",
    "summary": "How to calculate the correct secondary mirror size",
    "body_md": "Secondary mirror size balances...",
    "tags": ["optics", "secondary", "newtonian"],
    "difficulty": "advanced",
    "category": "optics",
    "relatedEquations": [1, 2],
    "relatedExamples": [3, 5, 7]
  }
}
```

### Equations

```bash
# List equations
GET /astrodb/v1/designs/equations
  ?name=<search>
  &has_tests=<true|false>
  &limit=<20>
  &offset=<0>

# Get specific equation
GET /astrodb/v1/designs/equations/:id
```

**Example Response:**
```json
{
  "data": {
    "id": 1,
    "name": "Secondary Minor Axis for Newtonian",
    "latex": "m = \\frac{F \\cdot d_i + D \\cdot (b + t)}{F - (b + t)}",
    "description": "Calculates required secondary mirror size...",
    "variables": [
      {
        "symbol": "m",
        "name": "Secondary minor axis",
        "unit_si": "mm",
        "description": "The short axis of the elliptical secondary",
        "typical_range": null
      }
    ],
    "unitTests": [
      {
        "name": "150mm f/5 with 20mm field",
        "inputs": { "F": 750, "d_i": 20, "D": 150, "b": 100, "t": 25 },
        "expected_output": 35.0,
        "tolerance": 2.0
      }
    ],
    "validationStatus": {
      "totalTests": 2,
      "passed": 2,
      "failed": 0
    }
  }
}
```

### Examples

```bash
# List dimensioned examples
GET /astrodb/v1/designs/examples
  ?type=<newtonian|dobsonian|refractor|sct|maksutov|other>
  &aperture_min=<mm>
  &aperture_max=<mm>
  &f_ratio_min=<number>
  &f_ratio_max=<number>
  &limit=<20>
  &offset=<0>

# Get specific example with full details
GET /astrodb/v1/designs/examples/:id
```

**Example Response:**
```json
{
  "data": {
    "id": 1,
    "title": "80mm f/5 Budget Newtonian",
    "telescopeType": "newtonian",
    "apertureMm": 80,
    "focalRatio": 5.0,
    "focalLengthMm": 400,
    "obstructionPct": 22.0,
    "illuminatedFieldMm": 15.0,
    "focuserType": "printed_helical",
    "printVolumeMm": { "x": 220, "y": 220, "z": 250 },
    "totalMassKg": 1.2,
    "billOfMaterials": [
      {
        "part": "80mm First Surface Mirror",
        "qty": 1,
        "material": "Glass",
        "vendor": "AliExpress",
        "unit_cost": 25
      }
    ],
    "printSettings": {
      "nozzle_mm": 0.4,
      "layer_mm": 0.2,
      "walls": 4,
      "infill_pct": 40,
      "material": "PETG"
    },
    "dimensions": [
      {
        "name": "secondary_minor_axis_mm",
        "value": 18,
        "unitSi": "mm",
        "toleranceMm": 1.0,
        "computedFromEquationId": 1
      }
    ],
    "partFiles": [
      {
        "role": "cell",
        "format": "stl",
        "url": "https://example.com/cell.stl",
        "license": "CC-BY-4.0"
      }
    ],
    "procedures": [
      {
        "title": "Assembly Instructions",
        "type": "assembly",
        "estimatedTimeMin": 90
      }
    ],
    "feasibilityChecks": {
      "secondarySizeValid": true,
      "focuserTravelValid": true,
      "obstructionValid": true,
      "notes": [
        "Secondary size 18.0 mm is reasonable (recommended ~19.2 mm)",
        "Obstruction 22.0% is acceptable"
      ]
    }
  }
}
```

### Procedures

```bash
# List procedures
GET /astrodb/v1/designs/procedures
  ?type=<assembly|collimation|test|maintenance|safety>
  &example_id=<number>
  &limit=<20>
  &offset=<0>
```

### Rules of Thumb

```bash
# List rules of thumb
GET /astrodb/v1/designs/rules
  ?tag=<tag>
  &limit=<20>
  &offset=<0>
```

### Training Data Export

Export training-ready data for generative design systems:

```bash
# Export training split
GET /astrodb/v1/designs/exports/training
  ?format=ndjson
  &split=<train|val|test>
  &seed=<optional>

# Get export manifest
GET /astrodb/v1/designs/exports/manifest
```

**Training Data Format:**

Each NDJSON line contains an instruction-output pair:

```json
{
  "instruction": "Design a 130 mm f/5 newtonian telescope that fully illuminates a 12 mm field with a helical focuser.",
  "input": {
    "constraints": {
      "aperture_mm": 130,
      "f_ratio": 5.0,
      "illuminated_field_mm": 12,
      "focuser_type": "helical",
      "print_volume_mm": {"x": 220, "y": 220, "z": 250}
    }
  },
  "output": {
    "major_dimensions": [
      {"name": "tube_inner_d_mm", "value": 160, "unit": "mm"},
      {"name": "secondary_minor_axis_mm", "value": 30, "unit": "mm"},
      {"name": "focuser_travel_mm", "value": 25, "unit": "mm"}
    ],
    "bom": [
      {"part": "M3 heat-set insert", "qty": 12}
    ],
    "print_settings": {
      "nozzle_mm": 0.4,
      "layer_mm": 0.2,
      "walls": 4,
      "infill_pct": 40,
      "material": "PETG"
    },
    "reasoning_md": "We choose a 30 mm secondary to maintain ≥100% illumination over 12 mm field...",
    "feasibility": {
      "secondarySizeValid": true,
      "focuserTravelValid": true,
      "obstructionValid": true,
      "notes": ["Design validated for feasibility"]
    }
  },
  "provenance": {
    "example_id": 3,
    "title": "130mm f/5 All-Rounder Newtonian"
  }
}
```

**Manifest Response:**

```json
{
  "version": "1.0.0",
  "generatedAt": "2025-11-08T12:00:00Z",
  "schemaVersion": "design-kb-v1",
  "coverage": {
    "concepts": 43,
    "equations": 25,
    "examples": 18,
    "procedures": 12
  },
  "splits": {
    "train": { "count": 12, "percentage": 70 },
    "val": { "count": 3, "percentage": 15 },
    "test": { "count": 3, "percentage": 15 }
  },
  "exports": {
    "train": "/astrodb/v1/designs/exports/training?format=ndjson&split=train",
    "val": "/astrodb/v1/designs/exports/training?format=ndjson&split=val",
    "test": "/astrodb/v1/designs/exports/training?format=ndjson&split=test"
  }
}
```

## Setup

### Prerequisites

- PostgreSQL 15+
- Node.js 20+
- Python 3.11+ (for worker)
- Feature flag: `ASTRO_DESIGN_KB_ENABLED=true`

### Quick Start

```bash
# 1. Set environment variable
export ASTRO_DESIGN_KB_ENABLED=true

# 2. Run migrations
npm run db:push

# 3. Seed database
npm run design:seed

# 4. Start API
npm run dev

# 5. Test endpoints
curl http://localhost:5000/astrodb/v1/designs/health
curl http://localhost:5000/astrodb/v1/designs/concepts
curl http://localhost:5000/astrodb/v1/designs/examples?type=newtonian
```

### Docker Deployment

The design KB is included in the main AstroDB Docker Compose setup:

```bash
docker compose -f docker-compose.astrodb.yml up --build
```

## Example Queries

### Find fast Newtonians suitable for astrophotography

```bash
curl 'http://localhost:5000/astrodb/v1/designs/examples?type=newtonian&f_ratio_max=5&aperture_min=130'
```

### Search for concepts about collimation

```bash
curl 'http://localhost:5000/astrodb/v1/designs/concepts?q=collimation&category=collimation'
```

### Get equations related to secondary sizing

```bash
curl 'http://localhost:5000/astrodb/v1/designs/equations?name=secondary'
```

### Download training data

```bash
# Get training set
curl 'http://localhost:5000/astrodb/v1/designs/exports/training?format=ndjson&split=train' -o designs-train.ndjson

# Get validation set
curl 'http://localhost:5000/astrodb/v1/designs/exports/training?format=ndjson&split=val' -o designs-val.ndjson

# Get manifest
curl 'http://localhost:5000/astrodb/v1/designs/exports/manifest' | jq '.'
```

## Data Quality & Validation

### Equation Validation

All equations include unit tests that verify:
- Correct formula implementation
- Expected outputs within tolerance
- Edge case handling

Example validation:
```typescript
{
  name: "150mm f/5 with 20mm field",
  inputs: { F: 750, d_i: 20, D: 150, b: 100, t: 25 },
  expected_output: 35.0,  // mm
  tolerance: 2.0           // ±2mm acceptable
}
```

### Newtonian Feasibility Checks

For Newtonian designs, the system automatically validates:

1. **Secondary Size**: Checks if secondary is appropriate for aperture (15-35% linear obstruction)
2. **Focuser Travel**: Verifies ≥20mm travel for eyepiece/camera compatibility
3. **Obstruction**: Ensures obstruction ≤40% (preferably ≤25%)
4. **Tube Clearance**: Validates ≥10mm clearance per side

Example check output:
```json
{
  "secondarySizeValid": true,
  "focuserTravelValid": true,
  "obstructionValid": true,
  "notes": [
    "Secondary size 35.0 mm is reasonable (recommended ~36.5 mm)",
    "Obstruction 23.3% is acceptable",
    "Focuser travel 25 mm meets minimum requirements"
  ]
}
```

### Tolerance Budgeting

Critical dimensions include tolerances:
```json
{
  "name": "secondary_minor_axis_mm",
  "value": 35.0,
  "toleranceMm": 1.0,  // ±1mm acceptable
  "notes": "Affects illumination uniformity"
}
```

## Safety Features

### Solar Observing Warnings

**⚠️ CRITICAL:** All solar-related procedures include prominent safety warnings:

```markdown
**WARNING:** NEVER observe the Sun through ANY optical instrument 
without proper certified solar filtration. Doing so WILL cause 
immediate and permanent blindness.
```

Solar safety procedures include:
- ISO-certified filter requirements
- Safe projection methods
- Emergency procedures
- What NOT to use (eyepiece filters, sunglasses, etc.)

### Laser Collimation Safety

Laser procedures include:
- Class ratings and safety requirements
- Proper usage guidelines (≤1mW recommended)
- Alternative methods (Cheshire, star collimation)
- Laser safety glasses recommendations

### Electrical Safety

Electrical procedures cover:
- GFCI protection requirements
- Proper grounding
- Wire sizing
- Connector standards (Anderson Powerpoles)
- Fusing requirements

## Licensing & Attribution

All content includes source attribution:
- Source name, URL, and license per record
- Only permissively licensed content included
- Public domain, CC-BY, MIT, Apache 2.0 accepted
- NO restrictive or no-redistribution licenses

Example sources:
- Amateur Telescope Making Books (Public Domain)
- Stellafane ATM Resources (CC-BY-SA)
- Open hardware projects (MIT, CC-BY)
- Wikipedia optical formulas (Public Domain)

## API Documentation

Access interactive API documentation:

```bash
curl http://localhost:5000/astrodb/v1/designs/docs
```

## Development

### Adding New Concepts

1. Add to `design-seed.ts` concepts array
2. Include: title, summary, body_md, tags, difficulty, category
3. Run `npm run design:seed`

### Adding New Equations

1. Add to `design-seed-data.ts` seedEquations array
2. Include LaTeX, variables with units, and unit tests
3. Verify tests pass: Check `validationStatus` in API response

### Adding New Examples

1. Add to `design-seed-data.ts` seedDimensionedExamples array
2. Include complete BoM, print settings, and notes
3. Add dimensions and part files
4. Run feasibility checks

### Worker Development

Python worker for scraping external sources:

```bash
cd worker
pip install -r requirements.txt
python design_scraper.py
```

## Troubleshooting

### API returns 404

- Verify `ASTRO_DESIGN_KB_ENABLED=true` is set
- Check logs for route registration

### Equation validation fails

- Check unit test inputs match variable symbols
- Verify expected_output and tolerance are reasonable
- Review equation LaTeX for typos

### Feasibility checks show warnings

- Review Newtonian design parameters
- Check secondary size against aperture
- Verify focuser travel meets requirements
- Ensure obstruction percentage is reasonable

## Performance

### Query Optimization

- Concepts: Indexed on title, category, tags (GIN index)
- Equations: Indexed on name
- Examples: Indexed on type, aperture, focal ratio
- Full-text search on notes_md fields

### Caching

Consider implementing Redis caching for:
- Frequently accessed examples
- Export manifest
- Training data splits

## Future Enhancements

1. **Interactive Design Tool**: Web UI for parametric design
2. **CAD Integration**: Export to FreeCAD, Fusion 360
3. **Cost Optimizer**: Find lowest-cost designs for target specs
4. **Community Builds**: User-submitted designs with photos
5. **Optical Simulation**: Ray tracing integration
6. **Print Time Estimates**: Based on slicing parameters
7. **Supplier Integration**: Live pricing from vendors
8. **Design Optimizer**: ML-based design suggestions

## Support

For issues or questions:
- Check logs: `docker compose logs astrodb-api`
- Verify database: `psql $DATABASE_URL -c "SELECT COUNT(*) FROM design_concept"`
- Test endpoints: See example queries above

## License

Knowledge base content: Various licenses (see individual records)  
Code: MIT License

---

**Version**: 1.0.0  
**Last Updated**: 2025-11-08
