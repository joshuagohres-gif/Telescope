// Design KB Seed Data - Equations and Examples
// This file contains the bulk seed data to keep design-seed.ts manageable

export const seedEquations = [
  {
    name: "Secondary Minor Axis for Newtonian",
    latex: "m = \\frac{F \\cdot d_i + D \\cdot (b + t)}{F - (b + t)}",
    description: "Calculates the required secondary mirror minor axis to fully illuminate a field diameter d_i",
    variables: [
      { symbol: "m", name: "Secondary minor axis", unit_si: "mm", description: "The short axis of the elliptical secondary" },
      { symbol: "F", name: "Focal length", unit_si: "mm", description: "Primary mirror focal length" },
      { symbol: "d_i", name: "Illuminated field", unit_si: "mm", description: "Desired fully illuminated field diameter" },
      { symbol: "D", name: "Aperture", unit_si: "mm", description: "Primary mirror diameter" },
      { symbol: "b", name: "Focuser distance", unit_si: "mm", description: "Distance from secondary to focal plane" },
      { symbol: "t", name: "In-travel", unit_si: "mm", description: "Focuser in-travel distance", typical_range: "20-50" },
    ],
    assumptions: "Assumes paraboloid primary, centered focuser, and negligible secondary thickness",
    domain: "Valid for f/3.5 to f/8 Newtonians",
    references: ["Rutten & van Venrooij - Telescope Optics"],
    unitTests: [
      {
        name: "150mm f/5 with 20mm field",
        inputs: { F: 750, d_i: 20, D: 150, b: 100, t: 25 },
        expected_output: 35.0,
        tolerance: 2.0,
      },
      {
        name: "200mm f/5 with 28mm field",
        inputs: { F: 1000, d_i: 28, D: 200, b: 120, t: 30 },
        expected_output: 50.0,
        tolerance: 3.0,
      },
    ],
  },
  {
    name: "Focal Ratio",
    latex: "f = \\frac{F}{D}",
    description: "The ratio of focal length to aperture, indicating telescope speed",
    variables: [
      { symbol: "f", name: "Focal ratio", unit_si: "", description: "f-number (dimensionless)" },
      { symbol: "F", name: "Focal length", unit_si: "mm", description: "Distance from mirror/lens to focal plane" },
      { symbol: "D", name: "Aperture", unit_si: "mm", description: "Clear aperture diameter" },
    ],
    assumptions: "Unobstructed clear aperture",
    domain: "All telescope types",
    references: [],
    unitTests: [
      {
        name: "150mm f/5",
        inputs: { F: 750, D: 150 },
        expected_output: 5.0,
        tolerance: 0.1,
      },
      {
        name: "80mm f/10 refractor",
        inputs: { F: 800, D: 80 },
        expected_output: 10.0,
        tolerance: 0.1,
      },
    ],
  },
  {
    name: "Magnification",
    latex: "M = \\frac{F_{telescope}}{F_{eyepiece}}",
    description: "Magnification produced by a given eyepiece",
    variables: [
      { symbol: "M", name: "Magnification", unit_si: "", description: "Power (dimensionless)" },
      { symbol: "F_{telescope}", name: "Telescope focal length", unit_si: "mm", description: "Objective focal length" },
      { symbol: "F_{eyepiece}", name: "Eyepiece focal length", unit_si: "mm", description: "Eyepiece focal length", typical_range: "4-40" },
    ],
    assumptions: "Paraxial approximation",
    domain: "Visual astronomy",
    references: [],
    unitTests: [
      {
        name: "750mm scope with 25mm eyepiece",
        inputs: { F_telescope: 750, F_eyepiece: 25 },
        expected_output: 30.0,
        tolerance: 0.5,
      },
    ],
  },
  {
    name: "Diffraction Limit (Dawes)",
    latex: "\\theta = \\frac{116}{D_{mm}}",
    description: "Theoretical resolution limit in arc-seconds (Dawes' criterion)",
    variables: [
      { symbol: "\\theta", name: "Resolution", unit_si: "arcsec", description: "Minimum resolvable separation" },
      { symbol: "D_{mm}", name: "Aperture", unit_si: "mm", description: "Clear aperture diameter" },
    ],
    assumptions: "Perfect optics, good seeing, λ=550nm",
    domain: "All telescopes",
    references: ["Dawes - Monthly Notices RAS (1867)"],
    unitTests: [
      {
        name: "150mm aperture",
        inputs: { D_mm: 150 },
        expected_output: 0.77,
        tolerance: 0.05,
      },
      {
        name: "200mm aperture",
        inputs: { D_mm: 200 },
        expected_output: 0.58,
        tolerance: 0.05,
      },
    ],
  },
  {
    name: "Exit Pupil",
    latex: "EP = \\frac{D}{M} = \\frac{F_{eyepiece}}{f}",
    description: "Diameter of light beam exiting eyepiece",
    variables: [
      { symbol: "EP", name: "Exit pupil", unit_si: "mm", description: "Light beam diameter at eye" },
      { symbol: "D", name: "Aperture", unit_si: "mm", description: "Telescope aperture" },
      { symbol: "M", name: "Magnification", unit_si: "", description: "Magnification power" },
      { symbol: "F_{eyepiece}", name: "Eyepiece focal length", unit_si: "mm", description: "Eyepiece focal length" },
      { symbol: "f", name: "Focal ratio", unit_si: "", description: "Telescope f-number" },
    ],
    assumptions: "Matched to eye's pupil for optimal brightness",
    domain: "Visual astronomy",
    references: [],
    unitTests: [
      {
        name: "150mm f/5 at 30x magnification",
        inputs: { D: 150, M: 30 },
        expected_output: 5.0,
        tolerance: 0.5,
      },
    ],
  },
  {
    name: "True Field of View",
    latex: "TFOV = \\frac{AFOV}{M}",
    description: "Actual sky area visible through eyepiece",
    variables: [
      { symbol: "TFOV", name: "True FOV", unit_si: "degrees", description: "Actual sky field" },
      { symbol: "AFOV", name: "Apparent FOV", unit_si: "degrees", description: "Eyepiece apparent field", typical_range: "40-100" },
      { symbol: "M", name: "Magnification", unit_si: "", description: "Magnification power" },
    ],
    assumptions: "Paraxial approximation",
    domain: "Visual astronomy",
    references: [],
    unitTests: [
      {
        name: "30x with 60° eyepiece",
        inputs: { AFOV: 60, M: 30 },
        expected_output: 2.0,
        tolerance: 0.1,
      },
    ],
  },
  {
    name: "Limiting Magnitude",
    latex: "m_{lim} = 2 + 5 \\log_{10}(D_{mm})",
    description: "Faintest star visible through telescope",
    variables: [
      { symbol: "m_{lim}", name: "Limiting magnitude", unit_si: "", description: "Faintest visible magnitude" },
      { symbol: "D_{mm}", name: "Aperture", unit_si: "mm", description: "Clear aperture diameter" },
    ],
    assumptions: "Perfect sky, dark-adapted eye, optimal magnification",
    domain: "Visual astronomy",
    references: [],
    unitTests: [
      {
        name: "150mm aperture",
        inputs: { D_mm: 150 },
        expected_output: 13.4,
        tolerance: 0.3,
      },
    ],
  },
  {
    name: "Obstruction Percentage (Linear)",
    latex: "\\text{Obstruction} = \\frac{d_{secondary}}{D_{primary}} \\times 100\\%",
    description: "Central obstruction as percentage of aperture diameter",
    variables: [
      { symbol: "Obstruction", name: "Obstruction %", unit_si: "percent", description: "Linear obstruction percentage" },
      { symbol: "d_{secondary}", name: "Secondary diameter", unit_si: "mm", description: "Secondary mirror diameter" },
      { symbol: "D_{primary}", name: "Primary diameter", unit_si: "mm", description: "Primary mirror diameter" },
    ],
    assumptions: "Circular obstruction",
    domain: "Reflecting telescopes",
    references: [],
    unitTests: [
      {
        name: "35mm secondary in 150mm scope",
        inputs: { d_secondary: 35, D_primary: 150 },
        expected_output: 23.3,
        tolerance: 1.0,
      },
    ],
  },
  {
    name: "Backfocus Distance",
    latex: "BF = F - d_{secondary}",
    description: "Distance from focal plane back to primary mirror vertex",
    variables: [
      { symbol: "BF", name: "Backfocus", unit_si: "mm", description: "Focal plane to primary distance" },
      { symbol: "F", name: "Focal length", unit_si: "mm", description: "Primary focal length" },
      { symbol: "d_{secondary}", name: "Secondary offset", unit_si: "mm", description: "Secondary to focus distance" },
    ],
    assumptions: "Newtonian configuration",
    domain: "Newtonian telescopes",
    references: [],
    unitTests: [
      {
        name: "750mm scope with 100mm offset",
        inputs: { F: 750, d_secondary: 100 },
        expected_output: 650,
        tolerance: 10,
      },
    ],
  },
  {
    name: "Coma-Free Field Diameter",
    latex: "d_{coma-free} = \\frac{F^2}{6}",
    description: "Approximate diameter where coma is <1 arc-minute (fast Newtonians)",
    variables: [
      { symbol: "d_{coma-free}", name: "Coma-free field", unit_si: "mm", description: "Field with acceptable coma" },
      { symbol: "F", name: "Focal ratio", unit_si: "", description: "f-number (dimensionless)" },
    ],
    assumptions: "Paraboloid mirror, <1 arcmin coma tolerance",
    domain: "Fast Newtonians (f/4-f/6)",
    references: ["Rutten & van Venrooij"],
    unitTests: [
      {
        name: "f/5 Newtonian",
        inputs: { F: 5 },
        expected_output: 4.17,
        tolerance: 0.5,
      },
      {
        name: "f/4 Newtonian",
        inputs: { F: 4 },
        expected_output: 2.67,
        tolerance: 0.3,
      },
    ],
  },
];

  // Additional equations (11-20)
  {
    name: "Image Scale",
    latex: "\\text{scale} = \\frac{206.265}{F_{mm}}",
    description: "Arc-seconds per millimeter at focal plane",
    variables: [
      { symbol: "scale", name: "Image scale", unit_si: "arcsec/mm", description: "Angular resolution per mm" },
      { symbol: "F_{mm}", name: "Focal length", unit_si: "mm", description: "Telescope focal length" },
    ],
    assumptions: "Small angle approximation",
    domain: "All telescopes",
    references: [],
    unitTests: [
      {
        name: "750mm focal length",
        inputs: { F_mm: 750 },
        expected_output: 275.0,
        tolerance: 5.0,
      },
    ],
  },
  {
    name: "Maximum Useful Magnification",
    latex: "M_{max} = 2 \\times D_{mm}",
    description: "Highest practical magnification before empty magnification",
    variables: [
      { symbol: "M_{max}", name: "Max magnification", unit_si: "", description: "Maximum useful power" },
      { symbol: "D_{mm}", name: "Aperture", unit_si: "mm", description: "Telescope aperture" },
    ],
    assumptions: "Good seeing conditions, quality optics",
    domain: "All telescopes",
    references: [],
    unitTests: [
      {
        name: "150mm aperture",
        inputs: { D_mm: 150 },
        expected_output: 300,
        tolerance: 10,
      },
    ],
  },
  {
    name: "Minimum Useful Magnification",
    latex: "M_{min} = \\frac{D_{mm}}{7}",
    description: "Lowest magnification before light is wasted",
    variables: [
      { symbol: "M_{min}", name: "Min magnification", unit_si: "", description: "Minimum useful power" },
      { symbol: "D_{mm}", name: "Aperture", unit_si: "mm", description: "Telescope aperture" },
    ],
    assumptions: "7mm dark-adapted pupil",
    domain: "All telescopes",
    references: [],
    unitTests: [
      {
        name: "150mm aperture",
        inputs: { D_mm: 150 },
        expected_output: 21.4,
        tolerance: 2.0,
      },
    ],
  },
  {
    name: "Field Stop Diameter",
    latex: "d_{stop} = 2 \\times F_{eyepiece} \\times \\tan\\left(\\frac{AFOV}{2}\\right)",
    description: "Physical diameter of eyepiece field stop",
    variables: [
      { symbol: "d_{stop}", name: "Field stop", unit_si: "mm", description: "Physical stop diameter" },
      { symbol: "F_{eyepiece}", name: "Eyepiece focal length", unit_si: "mm", description: "Eyepiece FL" },
      { symbol: "AFOV", name: "Apparent FOV", unit_si: "degrees", description: "Eyepiece AFOV" },
    ],
    assumptions: "Standard eyepiece design",
    domain: "Visual astronomy",
    references: [],
    unitTests: [
      {
        name: "25mm eyepiece, 50° AFOV",
        inputs: { F_eyepiece: 25, AFOV: 50 },
        expected_output: 21.8,
        tolerance: 1.0,
      },
    ],
  },
  {
    name: "Rayleigh Criterion",
    latex: "\\theta = 1.22 \\times \\frac{\\lambda}{D}",
    description: "Theoretical resolution limit based on diffraction",
    variables: [
      { symbol: "\\theta", name: "Resolution", unit_si: "radians", description: "Angular resolution" },
      { symbol: "\\lambda", name: "Wavelength", unit_si: "m", description: "Light wavelength" },
      { symbol: "D", name: "Aperture", unit_si: "m", description: "Telescope aperture" },
    ],
    assumptions: "λ=550nm (green light)",
    domain: "All telescopes",
    references: ["Lord Rayleigh - Philosophical Magazine (1879)"],
    unitTests: [
      {
        name: "150mm at 550nm",
        inputs: { lambda: 0.00000055, D: 0.15 },
        expected_output: 0.00000447,
        tolerance: 0.0000001,
      },
    ],
  },
  {
    name: "Tube Length for Newtonian",
    latex: "L_{tube} = F - BF + margin",
    description: "Required tube length from primary to focuser",
    variables: [
      { symbol: "L_{tube}", name: "Tube length", unit_si: "mm", description: "Physical tube length" },
      { symbol: "F", name: "Focal length", unit_si: "mm", description: "Primary focal length" },
      { symbol: "BF", name: "Backfocus", unit_si: "mm", description: "Focus to primary distance" },
      { symbol: "margin", name: "Margin", unit_si: "mm", description: "Safety margin", typical_range: "50-100" },
    ],
    assumptions: "Newtonian configuration",
    domain: "Newtonian telescopes",
    references: [],
    unitTests: [
      {
        name: "750mm f/5 with 75mm backfocus",
        inputs: { F: 750, BF: 650, margin: 75 },
        expected_output: 175,
        tolerance: 10,
      },
    ],
  },
  {
    name: "Secondary Offset for Off-Axis Focuser",
    latex: "\\text{offset} = \\frac{d_{tube}}{4F}",
    description: "How much to offset secondary toward focuser",
    variables: [
      { symbol: "offset", name: "Secondary offset", unit_si: "mm", description: "Offset distance" },
      { symbol: "d_{tube}", name: "Tube diameter", unit_si: "mm", description: "Inner tube diameter" },
      { symbol: "F", name: "Focal ratio", unit_si: "", description: "f-number" },
    ],
    assumptions: "Side-mounted focuser",
    domain: "Newtonian telescopes",
    references: [],
    unitTests: [
      {
        name: "200mm tube at f/5",
        inputs: { d_tube: 200, F: 5 },
        expected_output: 10,
        tolerance: 2,
      },
    ],
  },
  {
    name: "Mirror Sag Depth",
    latex: "\\text{sag} = \\frac{D^2}{16F}",
    description: "Depth of paraboloid mirror curve at edge",
    variables: [
      { symbol: "sag", name: "Sag depth", unit_si: "mm", description: "Curve depth" },
      { symbol: "D", name: "Diameter", unit_si: "mm", description: "Mirror diameter" },
      { symbol: "F", name: "Focal length", unit_si: "mm", description: "Mirror focal length" },
    ],
    assumptions: "Paraboloid primary",
    domain: "Reflecting telescopes",
    references: [],
    unitTests: [
      {
        name: "150mm f/5 mirror",
        inputs: { D: 150, F: 750 },
        expected_output: 1.875,
        tolerance: 0.1,
      },
    ],
  },
  {
    name: "Thermal Cooldown Time",
    latex: "t_{cool} = k \\times \\text{thickness}_{mm}",
    description: "Approximate time for mirror to reach thermal equilibrium",
    variables: [
      { symbol: "t_{cool}", name: "Cooldown time", unit_si: "minutes", description: "Time to equilibrium" },
      { symbol: "k", name: "Constant", unit_si: "min/mm", description: "Material constant (~1 for glass)" },
      { symbol: "thickness_{mm}", name: "Thickness", unit_si: "mm", description: "Mirror thickness" },
    ],
    assumptions: "Still air, moderate temperature difference",
    domain: "All telescopes with glass optics",
    references: [],
    unitTests: [
      {
        name: "15mm thick mirror",
        inputs: { k: 1, thickness_mm: 15 },
        expected_output: 15,
        tolerance: 5,
      },
    ],
  },
  {
    name: "Spider Diffraction Spike Angle",
    latex: "\\theta_{spike} = \\frac{90°}{n_{vanes}}",
    description: "Angle between diffraction spikes from spider vanes",
    variables: [
      { symbol: "\\theta_{spike}", name: "Spike angle", unit_si: "degrees", description: "Angular separation" },
      { symbol: "n_{vanes}", name: "Number of vanes", unit_si: "", description: "Spider vane count" },
    ],
    assumptions: "Straight vanes, perpendicular arrangement",
    domain: "Reflecting telescopes with spiders",
    references: [],
    unitTests: [
      {
        name: "4-vane spider",
        inputs: { n_vanes: 4 },
        expected_output: 22.5,
        tolerance: 1,
      },
      {
        name: "3-vane spider",
        inputs: { n_vanes: 3 },
        expected_output: 30,
        tolerance: 1,
      },
    ],
  },
  {
    name: "Light Gathering Power",
    latex: "LGP = \\left(\\frac{D_{telescope}}{d_{eye}}\\right)^2",
    description: "How many times more light telescope gathers vs naked eye",
    variables: [
      { symbol: "LGP", name: "Light gathering", unit_si: "", description: "Light gathering power" },
      { symbol: "D_{telescope}", name: "Telescope aperture", unit_si: "mm", description: "Telescope diameter" },
      { symbol: "d_{eye}", name: "Eye pupil", unit_si: "mm", description: "Dark-adapted pupil (~7mm)" },
    ],
    assumptions: "7mm dark-adapted pupil, no obstruction",
    domain: "All telescopes",
    references: [],
    unitTests: [
      {
        name: "150mm vs 7mm eye",
        inputs: { D_telescope: 150, d_eye: 7 },
        expected_output: 459,
        tolerance: 10,
      },
    ],
  },
];

export const seedRulesOfThumb = [
  {
    statementMd: "**Secondary mirror sizing:** For f/5 Newtonians, use secondary diameter = 20-25% of primary diameter",
    contextMd: "Balances full illumination with minimal obstruction. Larger secondaries provide wider fields but reduce contrast.",
    tags: ["newtonian", "secondary", "optics"],
  },
  {
    statementMd: "**Focuser travel:** Provide at least 25mm of in-travel for versatility with eyepieces and cameras",
    contextMd: "Typical eyepieces need 40-60mm backfocus, cameras need 55mm, and coma correctors add 25-30mm.",
    tags: ["focuser", "design"],
  },
  {
    statementMd: "**Spider vane thickness:** Use 1-2mm thick vanes to minimize diffraction spikes while maintaining rigidity",
    contextMd: "Thinner vanes produce less prominent spikes. For visual use, 2-3mm is acceptable. For imaging, aim for 1-1.5mm.",
    tags: ["spider", "diffraction", "optics"],
  },
  {
    statementMd: "**Print orientation:** Orient parts so loads run parallel to layer lines, not perpendicular",
    contextMd: "Layer adhesion is the weakest point in 3D printed parts. Perpendicular loads can cause layer delamination.",
    tags: ["printing", "strength"],
  },
  {
    statementMd: "**Wall count:** Use minimum 4 walls and 40% infill for structural telescope parts",
    contextMd: "Adequate walls provide rigidity and prevent visible infill patterns. Critical parts may need 5-6 walls.",
    tags: ["printing", "strength"],
  },
  {
    statementMd: "**Material choice:** Use PETG for most telescope parts due to its heat resistance and toughness",
    contextMd: "PLA is easier to print but can deform in hot cars or summer sun. ASA is best for permanent outdoor installations.",
    tags: ["printing", "materials"],
  },
  {
    statementMd: "**Annealing:** Anneal PETG parts under load at 70-80°C for 1-2 hours to improve dimensional stability",
    contextMd: "Annealing relieves internal stresses and can improve strength by 30-50%, but parts may shrink slightly.",
    tags: ["printing", "post-processing"],
  },
  {
    statementMd: "**Heat-set inserts:** Install brass inserts for any connection that will be assembled/disassembled more than once",
    contextMd: "Self-tapping screws into plastic work 2-3 times, then strip. Heat-set inserts provide metal threads.",
    tags: ["fasteners", "assembly"],
  },
  {
    statementMd: "**Collimation frequency:** Check collimation before each observing session; full collimation monthly or after transport",
    contextMd: "Temperature changes, vibration during transport, and settling can affect alignment. Quick check takes 30 seconds.",
    tags: ["collimation", "maintenance"],
  },
  {
    statementMd: "**Tube clearance:** Allow minimum 10mm clearance per side between primary mirror and tube wall",
    contextMd: "Prevents vignetting and allows air circulation. Tight tubes can trap heat and create turbulence.",
    tags: ["mechanics", "tube"],
  },
  {
    statementMd: "**Mirror cell support:** Use 3-point or 6-point flotation for mirrors over 100mm diameter",
    contextMd: "Single-point support causes edge distortion. Multiple points distribute weight evenly across the mirror back.",
    tags: ["mechanics", "cell"],
  },
  {
    statementMd: "**Thermal equilibrium:** Allow 1 hour cooldown per inch of primary mirror thickness",
    contextMd: "Thick glass holds heat. Thermal gradients cause seeing distortion. Fans can reduce cooldown time by 30-50%.",
    tags: ["thermal", "optics"],
  },
  {
    statementMd: "**f-ratio vs use:** Use f/4-f/6 for deep-sky, f/8-f/12 for planets",
    contextMd: "Fast scopes gather more light but show coma off-axis. Slow scopes provide narrow fields but excellent planetary detail.",
    tags: ["optics", "design"],
  },
  {
    statementMd: "**Maximum magnification:** Don't exceed 2× aperture in mm (i.e., 300× for 150mm scope)",
    contextMd: "Higher magnifications produce empty magnification - larger but dimmer and fuzzier images with no additional detail.",
    tags: ["optics", "magnification"],
  },
  {
    statementMd: "**Minimum magnification:** Don't go below aperture/7 (i.e., 21× for 150mm scope)",
    contextMd: "Lower magnifications waste light as exit pupil exceeds eye's 7mm dark-adapted pupil.",
    tags: ["optics", "magnification"],
  },
  {
    statementMd: "**Obstruction limit:** Keep linear obstruction under 25% for good contrast on planets",
    contextMd: "Larger obstructions scatter light into diffraction rings, reducing contrast. Area obstruction = (linear obstruction)².",
    tags: ["optics", "obstruction"],
  },
  {
    statementMd: "**Eyepiece collection:** Start with 25mm (low power), 10mm (medium), and 6mm (high power)",
    contextMd: "Three eyepieces cover most observing needs. Add specialty eyepieces (wide-field, planetary) as experience grows.",
    tags: ["eyepieces", "accessories"],
  },
  {
    statementMd: "**Exit pupil sweet spot:** Aim for 2-5mm exit pupil for deep-sky observing",
    contextMd: "Balance between brightness and detail resolution. Too small is dim, too large wastes light.",
    tags: ["optics", "visual"],
  },
  {
    statementMd: "**Dobsonian friction:** Balance scope so it stays pointed but moves easily with one-finger push",
    contextMd: "Teflon on laminate provides adjustable friction. Aim for <5° drift in 30 seconds when released.",
    tags: ["mount", "dobsonian"],
  },
  {
    statementMd: "**Finder scope:** Use 8×50 or 9×50 straight-through finder for scopes over 6 inches",
    contextMd: "Red dot finders work for bright objects, but optical finders show faint stars for star-hopping.",
    tags: ["finders", "accessories"],
  },
  {
    statementMd: "**Dew prevention:** Use dew shields extending 1-2× the aperture diameter forward",
    contextMd: "Dew forms on exposed optics. Shields block radiant cooling to sky and trap warmth from scope.",
    tags: ["accessories", "dew"],
  },
  {
    statementMd: "**Center of gravity:** Place altitude bearings at tube's balance point for smooth motion",
    contextMd: "Off-balance tubes are hard to move and resist staying pointed. Test with all accessories installed.",
    tags: ["mount", "balance"],
  },
  {
    statementMd: "**Truss tubes:** Use truss design for scopes over 8\" aperture or 1000mm focal length",
    contextMd: "Solid tubes become unwieldy. Truss designs are lighter, pack smaller, and cool faster.",
    tags: ["mechanics", "truss"],
  },
  {
    statementMd: "**Tube diameter:** Use tube ID = aperture + 20mm for adequate clearance",
    contextMd: "Allows air circulation around mirror and prevents vignetting from tube walls.",
    tags: ["mechanics", "tube"],
  },
  {
    statementMd: "**Adhesive choice:** Never use solvent-based glues near optics - they outgas and damage coatings",
    contextMd: "Use CA glue sparingly and away from optical path. Epoxy is safer. PVA for wood parts.",
    tags: ["assembly", "adhesives"],
  },
  {
    statementMd: "**Mirror cleaning:** Clean mirrors only when absolutely necessary, and use proper techniques",
    contextMd: "Over-cleaning causes more damage than dirt. A little dust has minimal optical impact. See cleaning procedures.",
    tags: ["maintenance", "optics"],
  },
  {
    statementMd: "**Spider adjustability:** Include collimation adjusters on spider attachment points",
    contextMd: "Secondary alignment is critical and drifts with temperature. Adjustable spider simplifies collimation.",
    tags: ["collimation", "spider"],
  },
  {
    statementMd: "**Sonotube vs PVC:** Sonotube is lighter and insulates better; PVC is more rigid and weatherproof",
    contextMd: "Sonotube (concrete forming tube) needs sealing. PVC is heavier but handles humidity. Both work well.",
    tags: ["materials", "tube"],
  },
  {
    statementMd: "**Layer height for optics parts:** Use 0.2mm or finer layers for focuser and cell parts",
    contextMd: "Finer layers produce smoother surfaces and more precise threads. Structural parts can use 0.3mm.",
    tags: ["printing", "quality"],
  },
  {
    statementMd: "**Tolerance budgeting:** Aim for λ/6 wave on each major error source (mirror, collimation, thermal)",
    contextMd: "Errors combine by root-sum-square. Three λ/6 errors = √3 × (λ/6)² ≈ λ/4 total (Rayleigh limit).",
    tags: ["optics", "quality"],
  },
  {
    statementMd: "**Star test wisdom:** A well-collimated mediocre mirror outperforms a poorly-aligned excellent mirror",
    contextMd: "Collimation is free and reversible. Focus effort on assembly quality before blaming optics.",
    tags: ["collimation", "testing"],
  },
  {
    statementMd: "**Coma corrector:** Essential for f/4-f/5 Newtonians used for astrophotography",
    contextMd: "Coma spreads stars into comet shapes off-axis. Visual observers can tolerate it; imagers cannot.",
    tags: ["optics", "imaging"],
  },
  {
    statementMd: "**Backfocus safety:** Design for 75-100mm backfocus to accommodate future accessories",
    contextMd: "Eyepieces need 40-60mm, cameras 55mm, correctors add 25-30mm. More is better than less.",
    tags: ["design", "focuser"],
  },
  {
    statementMd: "**Teflon thickness:** Use 1/16\" (1.6mm) PTFE sheet for bearing surfaces",
    contextMd: "Thinner tears easily; thicker doesn't conform well. Available at hardware stores as plumber's tape.",
    tags: ["materials", "mount"],
  },
  {
    statementMd: "**Azimuth bearing size:** Use bearing diameter ≥ 1.5× tube length for stability",
    contextMd: "Larger bearings spread load and provide smoother motion. Too small causes wobble.",
    tags: ["mount", "dobsonian"],
  },
  {
    statementMd: "**Lunar filter:** Essential for comfortable lunar observing in scopes over 100mm",
    contextMd: "Moon at full phase is painfully bright in large scopes. Variable polarizing filters are most versatile.",
    tags: ["accessories", "filters"],
  },
  {
    statementMd: "**Storage humidity:** Store optics in low-humidity environment to prevent fungus growth",
    contextMd: "Fungus etches glass permanently. Use desiccant packs in storage cases. Check optics annually.",
    tags: ["maintenance", "storage"],
  },
  {
    statementMd: "**Red LED flashlights:** Use red light for charts and adjustments to preserve night vision",
    contextMd: "White light destroys dark adaptation in seconds. Red light has minimal impact. Takes 20-30min to re-adapt.",
    tags: ["accessories", "observing"],
  },
  {
    statementMd: "**Observing chair:** Use an adjustable-height observing chair for comfort during long sessions",
    contextMd: "Comfort improves observation quality. Ability to relax lets you see fainter detail.",
    tags: ["accessories", "ergonomics"],
  },
  {
    statementMd: "**Transport protection:** Use foam padding around mirrors during transport",
    contextMd: "Road vibration can chip mirror edges or damage coatings. Remove mirrors for long trips if possible.",
    tags: ["maintenance", "transport"],
  },
  {
    statementMd: "**First light expectations:** Don't judge optical quality on first light - wait for thermal equilibrium and good seeing",
    contextMd: "Thermal issues and atmospheric turbulence can make excellent optics look poor. Be patient.",
    tags: ["testing", "expectations"],
  },
  {
    statementMd: "**Budget allocation:** Spend 60% on optics, 25% on mount, 15% on accessories",
    contextMd: "Quality optics and stable mount are most important. Accessories can be added gradually.",
    tags: ["budget", "planning"],
  },
  {
    statementMd: "**Learning curve:** Master one object type (planets OR deep-sky) before tackling both",
    contextMd: "Different techniques required. Planets need high power and excellent seeing. DSOs need dark skies and low power.",
    tags: ["observing", "learning"],
  },
  {
    statementMd: "**Mirror coating life:** Properly cared-for enhanced aluminum coatings last 5-10 years before recoating",
    contextMd: "Store dry, clean gently, use scope regularly. Reflectivity drops slowly. Recoating costs $50-150.",
    tags: ["maintenance", "optics"],
  },
  {
    statementMd: "**Laser collimator safety:** Only use Class 2 lasers (<1mW) for collimation",
    contextMd: "Higher-power lasers are eye hazards. Reflections can be as dangerous as direct beam. Work at table height.",
    tags: ["safety", "collimation"],
  },
  {
    statementMd: "**Finderscope alignment:** Align finder in daylight on distant terrestrial object before nighttime use",
    contextMd: "Much easier than trying to align on stars. Choose object >100m away to approximate infinity focus.",
    tags: ["accessories", "setup"],
  },
  {
    statementMd: "**Dew heater power:** Size dew heaters at 1-2 watts per inch of aperture",
    contextMd: "Just enough heat to stay above dew point. Too much creates turbulence. Use thermostat control.",
    tags: ["accessories", "dew"],
  },
  {
    statementMd: "**Scope covers:** Use dust covers on both ends when not observing, even indoors",
    contextMd: "Protects from dust, insects, and accidental bumps. Simple lens caps work fine.",
    tags: ["maintenance", "protection"],
  },
  {
    statementMd: "**Documentation:** Keep a logbook of observations, equipment changes, and maintenance",
    contextMd: "Helps diagnose problems, track performance, and remember what you've seen. Also fun to review later.",
    tags: ["observing", "maintenance"],
  },
];

export const seedDimensionedExamples = [
  {
    title: "80mm f/5 Budget Newtonian",
    telescopeType: "newtonian" as const,
    apertureMm: 80,
    focalRatio: 5.0,
    focalLengthMm: 400,
    obstructionPct: 22.0,
    illuminatedFieldMm: 15.0,
    focuserType: "printed_helical" as const,
    printVolumeMm: { x: 220, y: 220, z: 250 },
    totalMassKg: 1.2,
    billOfMaterials: [
      { part: "80mm First Surface Mirror", qty: 1, material: "Glass", vendor: "AliExpress", unit_cost: 25 },
      { part: "18mm Secondary Mirror", qty: 1, material: "Glass", vendor: "AliExpress", unit_cost: 8 },
      { part: "PVC Tube 110mm OD", qty: 1, material: "PVC", vendor: "Hardware Store", link: "https://example.com" },
      { part: "M3 Heat-Set Inserts", qty: 12, material: "Brass", vendor: "Amazon" },
      { part: "M3x12mm Screws", qty: 12, material: "Steel", vendor: "Hardware Store" },
      { part: "M4x16mm Screws", qty: 6, material: "Steel", vendor: "Hardware Store" },
      { part: "Cork Sheet 3mm", qty: 1, material: "Cork", vendor: "Craft Store" },
      { part: "1.25\" Adapter Ring", qty: 1, material: "Printed", vendor: "Self" },
    ],
    printSettings: {
      nozzle_mm: 0.4,
      layer_mm: 0.2,
      walls: 4,
      infill_pct: 40,
      material: "PETG",
      anneal: false,
    },
    notesMd: `Excellent starter scope for learning ATM basics. Small enough to print in parts on standard printers.
    
**Key features:**
- Fast f/5 for wide fields
- Simple helical focuser (20mm travel)
- 3-vane spider for minimal diffraction
- Total cost under $75

**Performance:**
- Visual limiting magnitude: ~12.5
- Resolution: 1.45 arc-seconds
- Good for Moon, planets, bright DSOs`,
  },
  {
    title: "114mm f/4.5 Wide-Field Newtonian",
    telescopeType: "newtonian" as const,
    apertureMm: 114,
    focalRatio: 4.5,
    focalLengthMm: 513,
    obstructionPct: 24.0,
    illuminatedFieldMm: 20.0,
    focuserType: "rack_pinion" as const,
    printVolumeMm: { x: 250, y: 210, z: 210 },
    totalMassKg: 2.1,
    billOfMaterials: [
      { part: "114mm Parabolic Mirror", qty: 1, vendor: "GSO", unit_cost: 65 },
      { part: "27mm Secondary Mirror", qty: 1, vendor: "AliExpress", unit_cost: 12 },
      { part: "Cardboard Tube 127mm ID", qty: 1, material: "Cardboard", vendor: "Concrete Form Tube" },
      { part: "M4 Heat-Set Inserts", qty: 18, material: "Brass" },
      { part: "Rack & Pinion Kit", qty: 1, vendor: "AliExpress", unit_cost: 25 },
    ],
    printSettings: {
      nozzle_mm: 0.4,
      layer_mm: 0.2,
      walls: 4,
      infill_pct: 40,
      material: "PETG",
    },
    notesMd: `Fast wide-field design ideal for deep-sky observation and astrophotography.
    
**Specifications:**
- 114mm aperture, 513mm focal length
- 27mm secondary (24% obstruction)
- Rack & pinion focuser with 35mm travel
- 20mm fully illuminated field

**Coma performance:** Use coma corrector for fields >10mm. Native coma-free field ~3.4mm.`,
  },
  {
    title: "130mm f/5 All-Rounder Newtonian",
    telescopeType: "newtonian" as const,
    apertureMm: 130,
    focalRatio: 5.0,
    focalLengthMm: 650,
    obstructionPct: 23.0,
    illuminatedFieldMm: 22.0,
    focuserType: "rack_pinion" as const,
    printVolumeMm: { x: 250, y: 210, z: 210 },
    totalMassKg: 3.2,
    billOfMaterials: [
      { part: "130mm Parabolic Mirror", qty: 1, vendor: "GSO", unit_cost: 85 },
      { part: "30mm Secondary", qty: 1, unit_cost: 15 },
      { part: "Spiral Cardboard Tube 150mm ID", qty: 1, vendor: "Online Metals" },
      { part: "Crayford Focuser", qty: 1, vendor: "Amazon", unit_cost: 45 },
    ],
    printSettings: {
      nozzle_mm: 0.4,
      layer_mm: 0.25,
      walls: 4,
      infill_pct: 40,
      material: "PETG",
    },
    notesMd: `Popular aperture class balancing portability with light grasp.

**Performance:**
- Magnitude limit: ~13.2
- Resolution: 0.89 arc-seconds
- Excellent for planets and bright galaxies

**Mount:** Pairs well with printed Dobsonian base (see mount examples).`,
  },
  {
    title: "150mm f/4 Fast Deep-Sky Newtonian",
    telescopeType: "newtonian" as const,
    apertureMm: 150,
    focalRatio: 4.0,
    focalLengthMm: 600,
    obstructionPct: 27.0,
    illuminatedFieldMm: 24.0,
    focuserType: "crayford" as const,
    printVolumeMm: { x: 300, y: 300, z: 300 },
    totalMassKg: 4.8,
    billOfMaterials: [
      { part: "150mm Parabolic Mirror f/4", qty: 1, vendor: "Orion", unit_cost: 150 },
      { part: "40mm Secondary", qty: 1, unit_cost: 22 },
      { part: "PVC Tube 200mm OD", qty: 1 },
      { part: "2\" Crayford Focuser", qty: 1, vendor: "SVBony", unit_cost: 65 },
      { part: "Paracorr Coma Corrector", qty: 1, note: "Highly recommended", unit_cost: 180 },
    ],
    printSettings: {
      nozzle_mm: 0.6,
      layer_mm: 0.3,
      walls: 5,
      infill_pct: 50,
      material: "PETG",
      anneal: true,
    },
    notesMd: `Fast astrograph for deep-sky imaging. Requires coma corrector for photography.

**Camera recommendations:**
- ASI533MC (11.3mm sensor, perfect fit)
- ZWO ASI294MC (19mm sensor, with corrector)

**Collimation critical:** f/4 demands precise collimation. Check before every session.`,
  },
  {
    title: "150mm f/5 Classic Newtonian",
    telescopeType: "newtonian" as const,
    apertureMm: 150,
    focalRatio: 5.0,
    focalLengthMm: 750,
    obstructionPct: 23.0,
    illuminatedFieldMm: 25.0,
    focuserType: "rack_pinion" as const,
    printVolumeMm: { x: 300, y: 300, z: 300 },
    totalMassKg: 5.5,
    billOfMaterials: [
      { part: "150mm Parabolic Mirror f/5", qty: 1, vendor: "GSO", unit_cost: 120 },
      { part: "35mm Secondary", qty: 1, unit_cost: 18 },
      { part: "Sonotube 200mm ID", qty: 1, vendor: "Concrete Supply" },
      { part: "2\" Dual-Speed Focuser", qty: 1, unit_cost: 95 },
    ],
    printSettings: {
      nozzle_mm: 0.6,
      layer_mm: 0.3,
      walls: 5,
      infill_pct: 45,
      material: "PETG",
      anneal: true,
    },
    notesMd: `Classic 6-inch f/5 design. Versatile for visual and imaging.

**Why f/5?**
- Manageable focal length (~30 inches)
- Moderate coma (usable without corrector for visual)
- Good balance of speed and ease of use

**Tube length:** 800mm allows room for focuser and accessories.`,
  },
  {
    title: "200mm f/5 Premium Newtonian",
    telescopeType: "newtonian" as const,
    apertureMm: 200,
    focalRatio: 5.0,
    focalLengthMm: 1000,
    obstructionPct: 24.0,
    illuminatedFieldMm: 32.0,
    focuserType: "crayford" as const,
    printVolumeMm: { x: 350, y: 350, y: 350 },
    totalMassKg: 9.5,
    billOfMaterials: [
      { part: "200mm Parabolic Mirror", qty: 1, vendor: "Orion/GSO", unit_cost: 280 },
      { part: "48mm Secondary", qty: 1, unit_cost: 35 },
      { part: "Carbon Fiber Tube 250mm ID", qty: 1, note: "Lightweight option", unit_cost: 200 },
      { part: "2.5\" Moonlite Focuser", qty: 1, unit_cost: 325 },
      { part: "Paracorr Type 2", qty: 1, unit_cost: 220 },
    ],
    printSettings: {
      nozzle_mm: 0.8,
      layer_mm: 0.3,
      walls: 6,
      infill_pct: 60,
      material: "ASA",
      anneal: true,
    },
    notesMd: `Serious light bucket for deep-sky observing and imaging.

**Performance:**
- Magnitude limit: ~14.2
- Resolution: 0.58 arc-seconds
- Excellent for faint galaxies and nebulae

**Weight management:** Use carbon fiber tube and truss design for portability.
**Mount requirements:** Needs substantial Dobsonian or heavy-duty EQ mount.`,
  },
  // Refractor examples
  {
    title: "80mm f/11 Achromatic Refractor",
    telescopeType: "refractor" as const,
    apertureMm: 80,
    focalRatio: 11.0,
    focalLengthMm: 880,
    focuserType: "rack_pinion" as const,
    printVolumeMm: { x: 200, y: 200, z: 200 },
    totalMassKg: 2.8,
    billOfMaterials: [
      { part: "80mm Achromat Doublet", qty: 1, vendor: "AliExpress", unit_cost: 85 },
      { part: "Aluminum Tube 90mm OD", qty: 1, material: "Aluminum", vendor: "Online Metals" },
      { part: "2\" Rack & Pinion Focuser", qty: 1, unit_cost: 35 },
      { part: "Dovetail Plate (Vixen)", qty: 1 },
    ],
    printSettings: {
      nozzle_mm: 0.4,
      layer_mm: 0.2,
      walls: 4,
      infill_pct: 30,
      material: "PETG",
    },
    notesMd: `Classic "short tube 80" design. Excellent for lunar/planetary and bright DSOs.
    
**Chromatic aberration:** f/11 minimizes but doesn't eliminate color fringing. Acceptable for visual use.

**Best targets:** Moon, planets, double stars, bright star clusters.`,
  },
  {
    title: "102mm f/9 ED Refractor",
    telescopeType: "refractor" as const,
    apertureMm: 102,
    focalRatio: 9.0,
    focalLengthMm: 918,
    focuserType: "crayford" as const,
    printVolumeMm: { x: 250, y: 250, z: 250 },
    totalMassKg: 5.2,
    billOfMaterials: [
      { part: "102mm ED Doublet", qty: 1, vendor: "Astro-Physics/TeleVue clone", unit_cost: 450 },
      { part: "Carbon Fiber Tube 110mm OD", qty: 1, unit_cost: 150 },
      { part: "2.5\" Crayford Focuser", qty: 1, unit_cost: 120 },
      { part: "Dew Shield", qty: 1, note: "Retractable recommended" },
    ],
    printSettings: {
      nozzle_mm: 0.4,
      layer_mm: 0.2,
      walls: 5,
      infill_pct: 40,
      material: "ASA",
    },
    notesMd: `Premium apo-class refractor. Virtually no false color.
    
**Performance:** Crisp planetary views, excellent for double stars and lunar imaging.

**Mount requirements:** Needs substantial mount - scope + accessories = 8-10kg.`,
  },
  {
    title: "200mm f/6 Classic Dobsonian",
    telescopeType: "dobsonian" as const,
    apertureMm: 200,
    focalRatio: 6.0,
    focalLengthMm: 1200,
    obstructionPct: 22.0,
    illuminatedFieldMm: 32.0,
    focuserType: "crayford" as const,
    printVolumeMm: { x: 350, y: 350, z: 350 },
    totalMassKg: 18.5,
    billOfMaterials: [
      { part: "200mm Parabolic Mirror", qty: 1, vendor: "Orion/GSO", unit_cost: 280 },
      { part: "44mm Secondary", qty: 1, unit_cost: 32 },
      { part: "Sonotube 250mm ID", qty: 1, vendor: "Concrete Supply" },
      { part: "2\" Dual-Speed Focuser", qty: 1, unit_cost: 95 },
      { part: "Plywood 18mm Baltic Birch", note: "For rocker box" },
      { part: "PTFE Pads", qty: 6, material: "Teflon" },
      { part: "Formica Sheet", qty: 1, note: "For bearing surfaces" },
    ],
    printSettings: {
      nozzle_mm: 0.6,
      layer_mm: 0.3,
      walls: 5,
      infill_pct: 50,
      material: "PETG",
      anneal: true,
    },
    notesMd: `Traditional 8-inch Dobsonian. Sweet spot for portability and performance.
    
**Altitude bearings:** Place at balance point. Use Teflon on Formica for smooth motion.

**Azimuth:** 300-400mm diameter bearing recommended.

**Total height:** ~1.2m makes comfortable standing observation.`,
  },
  {
    title: "250mm f/5 Light Bucket Dob",
    telescopeType: "dobsonian" as const,
    apertureMm: 250,
    focalRatio: 5.0,
    focalLengthMm: 1250,
    obstructionPct: 24.0,
    illuminatedFieldMm: 40.0,
    focuserType: "crayford" as const,
    printVolumeMm: { x: 400, y: 400, z: 400 },
    totalMassKg: 28.0,
    billOfMaterials: [
      { part: "250mm Parabolic Mirror", qty: 1, vendor: "Orion", unit_cost: 450 },
      { part: "60mm Secondary", qty: 1, unit_cost: 55 },
      { part: "Truss Poles (carbon fiber)", qty: 4, unit_cost: 25 },
      { part: "2.5\" Moonlite Focuser", qty: 1, unit_cost: 325 },
      { part: "Baltic Birch Plywood", note: "For mirror box and rocker" },
    ],
    printSettings: {
      nozzle_mm: 0.8,
      layer_mm: 0.3,
      walls: 6,
      infill_pct: 60,
      material: "ASA",
      anneal: true,
    },
    notesMd: `Serious deep-sky instrument. Truss design for portability.
    
**Performance:**
- Limiting magnitude: ~14.7
- Resolves globular clusters into individual stars
- Shows faint galaxy structure

**Transport:** Breaks down into manageable pieces. Mirror box + rocker + poles.`,
  },
  {
    title: "150mm f/12 Maksutov-Cassegrain",
    telescopeType: "maksutov" as const,
    apertureMm: 150,
    focalRatio: 12.0,
    focalLengthMm: 1800,
    obstructionPct: 35.0,
    focuserType: "helical" as const,
    printVolumeMm: { x: 200, y: 200, z: 200 },
    totalMassKg: 4.5,
    billOfMaterials: [
      { part: "150mm Mak-Cass OTA", qty: 1, vendor: "Sky-Watcher", unit_cost: 600, note: "Complete OTA" },
      { part: "Vixen-style Dovetail", qty: 1 },
      { part: "Custom Tube Rings", qty: 2, material: "Printed" },
    ],
    printSettings: {
      nozzle_mm: 0.4,
      layer_mm: 0.2,
      walls: 5,
      infill_pct: 40,
      material: "PETG",
    },
    notesMd: `Compact, high-magnification planetary specialist.
    
**Advantages:**
- Sealed tube protects optics
- Very portable (~400mm long)
- No collimation needed
- Excellent thermal stability

**Best for:** Planets, Moon, double stars, compact observing sites.`,
  },
  {
    title: "200mm f/10 Schmidt-Cassegrain",
    telescopeType: "sct" as const,
    apertureMm: 200,
    focalRatio: 10.0,
    focalLengthMm: 2000,
    obstructionPct: 37.0,
    focuserType: "helical" as const,
    printVolumeMm: { x: 250, y: 250, z: 250 },
    totalMassKg: 6.8,
    billOfMaterials: [
      { part: "8\" SCT OTA", qty: 1, vendor: "Celestron/Meade", unit_cost: 1200, note: "Used market option" },
      { part: "CGE-style Dovetail", qty: 1 },
      { part: "Focal Reducer (f/6.3)", qty: 1, unit_cost: 150, note: "For wide-field" },
    ],
    printSettings: {
      nozzle_mm: 0.4,
      layer_mm: 0.2,
      walls: 4,
      infill_pct: 30,
      material: "PETG",
    },
    notesMd: `Versatile design popular for both visual and imaging.
    
**Focal reducer:** Converts to f/6.3 (~1260mm FL) for wider fields and imaging.

**Mirror shift:** Primary moves for focusing - can cause image shift. Lock mirror after focusing for photography.

**Periodic collimation:** Check collimation quarterly, especially after temperature swings.`,
  },
];
