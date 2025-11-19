import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const { Pool } = pg;
import {
  concept,
  equation,
  ruleOfThumb,
  dimensionedExample,
  partFile,
  dimension,
  procedure,
  figure,
  sourceRef,
  xref,
} from "@shared/design-schema";

export async function seedDesignKB() {
  console.log("Starting Design KB seeding...");
  
  if (!process.env.DATABASE_URL) {
    console.log("No DATABASE_URL, skipping Design KB seed");
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    // ===== SOURCE REFERENCES =====
    console.log("Seeding source references...");
    
    const sources = await db.insert(sourceRef).values([
      {
        name: "Amateur Telescope Making Book 1",
        url: "https://archive.org/details/AmateurTelescopeMakingBook1",
        license: "Public Domain",
        author: "Albert G. Ingalls",
        publisher: "Scientific American",
        year: 1935,
      },
      {
        name: "Stellafane ATM Resources",
        url: "https://stellafane.org/tm/atm/index.html",
        license: "CC-BY-SA",
        author: "Stellafane",
      },
      {
        name: "PlaneWave Instruments Knowledge Base",
        url: "https://planewave.com/",
        license: "Fair Use",
        author: "PlaneWave Instruments",
      },
    ]).onConflictDoNothing().returning();

    console.log(`Inserted ${sources.length} source references`);

    // ===== CONCEPTS (40+) =====
    console.log("Seeding concepts...");
    
    const concepts = await db.insert(concept).values([
      // Optics concepts (12)
      {
        title: "Focal Ratio and Speed",
        summary: "Understanding f-numbers and their impact on telescope performance",
        bodyMd: `The focal ratio (f-number) is the ratio of focal length to aperture diameter. A telescope with 600mm focal length and 120mm aperture is f/5.\n\n**Fast vs Slow:**\n- Fast (f/4-f/6): Brighter images, wider fields, requires precise collimation\n- Slow (f/8-f/15): Dimmer but easier to collimate, good for planets\n\n**Image scale:** Lower f-ratios give wider fields but can show optical aberrations more prominently.`,
        tags: ["optics", "focal-ratio", "basics"],
        difficulty: "intro",
        category: "optics",
      },
      {
        title: "Fully Illuminated Field",
        summary: "Calculating the field diameter that receives 100% light from the primary",
        bodyMd: `The fully illuminated field is the circular region at the focal plane where every point receives light from the entire primary mirror aperture.\n\n**Why it matters:** Outside this field, vignetting occurs. For visual use, aim for 20-28mm diameter. For imaging, match your sensor diagonal.\n\n**Factors:** Secondary size, focuser position, focal ratio, and off-axis distance all affect illumination.`,
        tags: ["optics", "illumination", "secondary"],
        difficulty: "intermediate",
        category: "optics",
      },
      {
        title: "Secondary Mirror Sizing for Newtonians",
        summary: "How to calculate the correct secondary (diagonal) mirror size",
        bodyMd: `Secondary mirror size balances full illumination with minimal obstruction.\n\n**Formula:** m = F·d_i / (F - b - t) + offset\nWhere F=focal length, d_i=desired illuminated field, b=focuser distance, t=in-travel\n\n**Rules of thumb:**\n- Fast scopes (f/4-f/5): 20-25% of aperture\n- Medium (f/6-f/8): 18-22%\n- Aim for <25% linear obstruction to preserve contrast`,
        tags: ["optics", "secondary", "newtonian"],
        difficulty: "advanced",
        category: "optics",
      },
      {
        title: "Diffraction Limit and Resolution",
        summary: "The theoretical resolution limit set by aperture",
        bodyMd: `Dawes' Limit (arc-seconds) ≈ 116 / D_mm\n\nFor a 150mm scope: 116/150 = 0.77 arc-seconds\n\n**Rayleigh Criterion:** 138 / D_mm (slightly more conservative)\n\n**Practical limits:** Atmospheric seeing typically limits resolution to 1-2 arc-seconds. Larger apertures collect more light but may not resolve finer detail unless seeing is excellent.`,
        tags: ["optics", "resolution", "diffraction"],
        difficulty: "intermediate",
        category: "optics",
      },
      {
        title: "Coma in Fast Newtonians",
        summary: "Understanding and managing off-axis coma aberration",
        bodyMd: `Paraboloid mirrors produce coma (comet-shaped stars) off-axis.\n\n**Coma-free field diameter (mm) ≈ F² / 6**\nFor f/5: 25/6 ≈ 4mm (quite small!)\n\n**Solutions:**\n1. Use a coma corrector (Paracorr, etc.)\n2. Accept limited field for visual\n3. Design f/6+ for wider fields\n\n**For astrophotography:** Coma correctors are essential for fast scopes.`,
        tags: ["optics", "coma", "aberrations", "newtonian"],
        difficulty: "advanced",
        category: "optics",
      },
      {
        title: "Backfocus Requirements",
        summary: "Ensuring adequate distance from focal plane to primary",
        bodyMd: `Backfocus is the distance from the focal plane back to the primary (or secondary in refractors).\n\n**Typical requirements:**\n- Eyepieces: 40-60mm\n- DSLRs: 55-60mm\n- Dedicated astro cameras: 55mm\n- With coma corrector: +25-30mm\n\n**Design tip:** Allow 75-100mm backfocus for flexibility with accessories.`,
        tags: ["optics", "backfocus", "focuser"],
        difficulty: "intro",
        category: "optics",
      },
      {
        title: "Spider Vane Diffraction",
        summary: "How spider thickness affects diffraction spikes",
        bodyMd: `Spider vanes holding the secondary create diffraction spikes.\n\n**Thinner is better:** 1-2mm vanes minimize spikes while maintaining rigidity.\n\n**Curved vanes:** Some designs use curved vanes to spread diffraction energy, reducing spike visibility.\n\n**Trade-off:** Structural rigidity vs optical purity. For visual, 2-3mm is fine. For imaging, aim for 1-1.5mm with adequate bracing.`,
        tags: ["optics", "spider", "diffraction"],
        difficulty: "intermediate",
        category: "optics",
      },
      {
        title: "Eyepiece Field of View",
        summary: "Calculating the actual sky field visible through an eyepiece",
        bodyMd: `True Field of View = Apparent FOV / Magnification\n\n**Example:** 25mm eyepiece in 750mm scope = 30x mag\nWith 50° apparent FOV eyepiece: 50°/30 = 1.67° true field\n\n**Field stop diameter:** d = F_eyepiece × tan(AFOV/2) × 2\nFor 25mm, 50° AFOV: d ≈ 22mm`,
        tags: ["optics", "eyepieces", "fov"],
        difficulty: "intro",
        category: "optics",
      },
      {
        title: "Light Grasp and Limiting Magnitude",
        summary: "How aperture determines faintest visible objects",
        bodyMd: `Limiting magnitude ≈ 2 + 5×log₁₀(D_mm)\n\nFor 150mm: 2 + 5×log₁₀(150) ≈ 13.4 magnitude\n\n**Practical reality:** Sky conditions, eye adaptation, and optical quality affect actual limits. Expect 0.5-1 mag less than theoretical.`,
        tags: ["optics", "magnitude", "sensitivity"],
        difficulty: "intro",
        category: "optics",
      },
      {
        title: "Exit Pupil Matching",
        summary: "Matching eyepiece exit pupil to your eye",
        bodyMd: `Exit pupil (mm) = Aperture / Magnification = Focal_eyepiece / Focal_ratio\n\n**Optimal range:** 2-7mm for most observers\n- Dark adapted pupils: ~7mm (age dependent)\n- Below 0.5mm: Hard to hold position, dim\n- Above 7mm: Wasted light\n\n**Deep-sky rule:** Exit pupil of 2-5mm shows good detail and brightness.`,
        tags: ["optics", "eyepieces", "magnification"],
        difficulty: "intro",
        category: "optics",
      },
      {
        title: "Obstruction and Contrast Loss",
        summary: "How central obstruction affects image quality",
        bodyMd: `**Linear obstruction** = (secondary diameter / primary diameter) × 100%\n**Area obstruction** = (linear obstruction)²\n\n**Impact:**\n- <20% linear: Minimal impact\n- 20-30%: Slight contrast loss\n- >35%: Noticeable on planets\n\n**Diffraction effects:** Larger obstructions scatter more light into diffraction rings, reducing contrast.`,
        tags: ["optics", "obstruction", "contrast"],
        difficulty: "intermediate",
        category: "optics",
      },
      {
        title: "Thermal Equilibrium",
        summary: "Why telescopes need time to cool down",
        bodyMd: `Mirrors and lenses must reach ambient temperature for best performance.\n\n**Cool-down time:** ~1 hour per inch of glass thickness\n150mm mirror (15mm thick): ~15-30 minutes\nThick refractor lens: 1-2 hours\n\n**Symptoms of thermal issues:**\n- Shimmering in star test\n- Soft, bloated stars\n- Asymmetric diffraction patterns\n\n**Solutions:** Fans, thin mirrors, early setup`,
        tags: ["optics", "thermal", "seeing"],
        difficulty: "intro",
        category: "optics",
      },

      // Mechanics concepts (10)
      {
        title: "Primary Mirror Cell Design",
        summary: "Supporting the primary without introducing distortion",
        bodyMd: `**Goals:**\n1. Support mirror's weight evenly\n2. Allow thermal expansion\n3. Maintain collimation\n\n**Key features:**\n- 3-point or 6-point flotation\n- Soft pads (cork, felt) at contact points\n- Spring-loaded collimation screws (1:4:7 pattern common)\n- Minimum 4 walls, 40% infill for printed cells`,
        tags: ["mechanics", "cell", "mirror-support"],
        difficulty: "intermediate",
        category: "mechanics",
      },
      {
        title: "Tube Rigidity and Flex",
        summary: "Preventing tube flex that ruins collimation",
        bodyMd: `**Sources of flex:**\n- Long, thin tubes sag under own weight\n- Focuser weight pulls tube\n- Wind loading\n\n**Solutions:**\n- Truss designs for long scopes\n- Tube rings with stiffening\n- Shorter f-ratios need shorter tubes\n- Carbon fiber tubes (but expensive)\n\n**Target:** <0.5mm deflection under normal use`,
        tags: ["mechanics", "rigidity", "tube"],
        difficulty: "intermediate",
        category: "mechanics",
      },
      {
        title: "Focuser Design Considerations",
        summary: "Key requirements for a stable, precise focuser",
        bodyMd: `**Essential features:**\n1. No image shift during focus\n2. Smooth motion (no stick-slip)\n3. Adequate travel (25-50mm)\n4. Load capacity for cameras\n\n**Types:**\n- Helical: Simple, printable, good for visual\n- Rack & pinion: Precise, handles weight well\n- Crayford: Smoothest, but harder to 3D print\n\n**Printed focusers:** Use fine threads (1mm pitch), PETG, and precision settings (0.2mm layers).`,
        tags: ["mechanics", "focuser", "precision"],
        difficulty: "advanced",
        category: "mechanics",
      },
      {
        title: "Spider Vane Geometry",
        summary: "Choosing the right spider configuration",
        bodyMd: `**Common patterns:**\n- 4-vane perpendicular: Simple, strong\n- 3-vane 120°: Less diffraction spikes\n- Curved vanes: Spreads diffraction\n\n**Material choices:**\n- Printed: Rigid, easy to integrate\n- Metal: Thinner, stronger\n- Wire: Very thin but requires tension\n\n**Adjustment:** Include collimation adjusters on spider attachment points.`,
        tags: ["mechanics", "spider", "secondary-support"],
        difficulty: "intermediate",
        category: "mechanics",
      },
      {
        title: "Dobsonian Mount Friction Balance",
        summary: "Achieving smooth motion without motors",
        bodyMd: `**Goal:** Scope stays where pointed but moves easily by hand.\n\n**Altitude bearing:**\n- Teflon on Formica or laminate\n- Size bearings for ~1kg effective friction\n- Balance point near CG\n\n**Azimuth bearing:**\n- Larger diameter = smoother\n- Similar Teflon/laminate interface\n- Minimum 3 pads, ideally 4-6\n\n**Testing:** Scope should not drift >5° in 30 seconds when released.`,
        tags: ["mount", "dobsonian", "friction"],
        difficulty: "intermediate",
        category: "mount",
      },
      {
        title: "Balance and Center of Gravity",
        summary: "Why balance matters and how to achieve it",
        bodyMd: `**Importance:**\n- Reduces bearing stress\n- Improves tracking (for motorized mounts)\n- Easier manual positioning (Dobs)\n\n**Finding CG:**\n1. Suspend tube at midpoint\n2. Add weight fore/aft until balanced\n3. Mark balance point\n4. Mount bearings at CG\n\n**Dynamic balance:** With accessories (eyepieces, cameras) installed, recheck balance.`,
        tags: ["mechanics", "balance", "mount"],
        difficulty: "intro",
        category: "mechanics",
      },
      {
        title: "Tube Rings and Dovetail Plates",
        summary: "Connecting OTA to mount securely",
        bodyMd: `**Tube rings:**\n- Match tube OD closely\n- Use soft liners (felt, rubber)\n- Two rings minimum for tubes >600mm\n- M6-M8 bolts, lock washers\n\n**Dovetail standards:**\n- Losmandy: Wider, more stable for heavy scopes\n- Vixen: Narrower, good for small refractors\n- 3D printed dovetails: Use PETG, 5+ walls, 100% infill`,
        tags: ["mechanics", "mounting", "dovetail"],
        difficulty: "intro",
        category: "mechanics",
      },
      {
        title: "Truss Tube Design",
        summary: "When and how to use truss tubes instead of solid tubes",
        bodyMd: `**Advantages:**\n- Lighter weight\n- Compact storage\n- Better thermal performance\n\n**When to use:**\n- Scopes >8\" aperture\n- Focal lengths >1000mm\n- Portability important\n\n**Construction:**\n- 4, 6, or 8 poles (4-pole simplest)\n- Carbon fiber or aluminum poles\n- Secure connection to rings (captured screws or clamps)\n- Check collimation stability`,
        tags: ["mechanics", "truss", "construction"],
        difficulty: "advanced",
        category: "mechanics",
      },
      {
        title: "Printed Parts Post-Processing",
        summary: "Improving strength and finish of 3D printed components",
        bodyMd: `**Techniques:**\n1. **Annealing:** Heat PETG/PLA to glass transition temp, slow cool (improves strength 30-50%)\n2. **Vapor smoothing:** Acetone for ABS, isopropyl for some PLAs\n3. **Tapping threads:** Use tap to cut clean threads in printed holes\n4. **Heat-set inserts:** M3-M5 brass inserts for strong repeated fastening\n\n**Critical parts:** Focuser, cell collimation points, bearing surfaces benefit most.`,
        tags: ["printing", "post-processing", "finishing"],
        difficulty: "intermediate",
        category: "printing",
      },
      {
        title: "Material Selection for Telescope Parts",
        summary: "Choosing the right filament for each component",
        bodyMd: `**PLA:**\n- Pros: Easy to print, rigid\n- Cons: Heat-sensitive, brittle outdoors\n- Use: Indoor scopes, non-structural\n\n**PETG:**\n- Pros: Tough, heat-resistant, outdoor-safe\n- Cons: Slight stringing\n- Use: Most telescope parts (recommended)\n\n**ASA:**\n- Pros: UV-resistant, very tough\n- Cons: Warping, needs enclosure\n- Use: Outdoor scopes, permanent installs\n\n**TPU (flexible):**\n- Use: Gaskets, vibration damping`,
        tags: ["printing", "materials", "filament"],
        difficulty: "intro",
        category: "materials",
      },

      // Testing/Collimation (8)
      {
        title: "Star Test Basics",
        summary: "Using a bright star to evaluate optical quality",
        bodyMd: `The star test reveals spherical aberration, astigmatism, and collimation errors.\n\n**Procedure:**\n1. Point at bright star (Sirius, Vega)\n2. Use high mag (150-300x)\n3. Examine in-focus, inside focus, outside focus\n\n**Good optics:** Symmetrical diffraction rings both sides of focus\n**Turned-down edge:** Brighter outer ring inside focus\n**Astigmatism:** Oval diffraction patterns\n**Miscollimation:** Asymmetric rings`,
        tags: ["testing", "star-test", "collimation"],
        difficulty: "intermediate",
        category: "testing",
      },
      {
        title: "Collimation with a Laser",
        summary: "Using a laser collimator for initial alignment",
        bodyMd: `**WARNING:** Never look directly at laser. Use safety glasses if laser power >1mW.\n\n**Procedure:**\n1. Insert laser in focuser\n2. Adjust secondary until laser reflects back to center\n3. Adjust primary until laser returns to collimator's target\n4. Fine-tune on star\n\n**Limitations:** Laser assumes perfect focuser alignment. Always finish on a star.\n\n**Safety:** Diffuse or use low-power (<1mW) lasers. Never point at aircraft.`,
        tags: ["collimation", "laser", "safety", "alignment"],
        difficulty: "intro",
        category: "collimation",
      },
      {
        title: "Ronchi Test",
        summary: "Using a diffraction grating to test mirror figure",
        bodyMd: `A Ronchi test uses a ruled grating to create interference patterns revealing mirror shape.\n\n**Setup:**\n- Place Ronchi grating near focus\n- Observe pattern with knife edge\n\n**Interpretation:**\n- Straight, parallel lines: Perfect parabola\n- Curved inward: Overcorrected (too deep)\n- Curved outward: Undercorrected (too shallow)\n\n**Useful for:** Diagnosing mirror figure errors before assembly.`,
        tags: ["testing", "ronchi", "mirror-making"],
        difficulty: "advanced",
        category: "testing",
      },
      {
        title: "Newtonian Collimation Procedure",
        summary: "Step-by-step guide to collimating a Newtonian telescope",
        bodyMd: `**Tools needed:** Collimation cap or Cheshire eyepiece\n\n**Steps:**\n1. **Secondary alignment:** Center secondary in focuser view\n2. **Secondary tilt:** Adjust until you see entire primary reflected\n3. **Primary center:** Adjust primary until center spot appears centered in secondary\n4. **Star test:** Fine-tune on bright star until perfect concentric rings\n\n**Frequency:** Check before each session; full collimation monthly or after transport.`,
        tags: ["collimation", "newtonian", "procedure"],
        difficulty: "intro",
        category: "collimation",
      },
      {
        title: "Cheshire Eyepiece",
        summary: "Why Cheshires are better than sight tubes for collimation",
        bodyMd: `A Cheshire eyepiece is a sight tube with an angled peep-hole that provides illumination.\n\n**Advantages over sight tube:**\n- Illuminates primary center spot\n- Easier to see alignment\n- Works in daylight\n\n**Usage:**\n1. Insert in focuser\n2. Look through peep-hole\n3. Adjust until all circles concentric\n\n**DIY:** Can be 3D printed with a small LED and diffuser.`,
        tags: ["collimation", "tools", "cheshire"],
        difficulty: "intro",
        category: "collimation",
      },
      {
        title: "Foucault Test",
        summary: "Knife-edge test for precise mirror figuring",
        bodyMd: `The Foucault test is the gold standard for testing mirror figure during grinding.\n\n**Setup:**\n- Point source at center of curvature\n- Knife edge cuts light path\n- Observer sees shadow pattern on mirror\n\n**Interpretation:**\n- Uniform gray: Perfect sphere\n- Null pattern: Perfect parabola (for Newtonians)\n- Zones or bumps: Local errors\n\n**Precision:** Can detect errors <1/20 wavelength.`,
        tags: ["testing", "foucault", "mirror-making"],
        difficulty: "advanced",
        category: "testing",
      },
      {
        title: "Artificial Star for Indoor Testing",
        summary: "Creating a stable test target for optical evaluation",
        bodyMd: `**Simple version:**\n- Pinhole in aluminum foil\n- Backlit by LED\n- Distance: >30m for scopes >150mm\n\n**Better version:**\n- Microscope objective\n- Fiber optic cable\n- Stable mount\n\n**Usage:** Test collimation, focusing, and aberrations without weather dependence. Not a substitute for on-sky star test but very useful for initial setup.`,
        tags: ["testing", "artificial-star", "indoor"],
        difficulty: "intermediate",
        category: "testing",
      },
      {
        title: "Tolerance Budgeting",
        summary: "Understanding cumulative errors in optical systems",
        bodyMd: `Each component has manufacturing tolerances that combine to affect final image quality.\n\n**Rayleigh criterion:** λ/4 wavefront error (commonly 1/4 wave)\n\n**Error sources:**\n- Mirror figure: ±1/8 wave\n- Collimation: ±1/16 wave\n- Thermal: ±1/16 wave\n- Tube flex: ±1/32 wave\n\n**RSS combination:** √(Σerrors²) should be <1/4 wave\n\n**Practical:** Aim for λ/6 or better on each major component.`,
        tags: ["testing", "tolerances", "quality"],
        difficulty: "advanced",
        category: "testing",
      },

      // Assembly/Printing (5)
      {
        title: "Print Orientation for Strength",
        summary: "How part orientation affects mechanical properties",
        bodyMd: `Layer lines are weak points. Orient parts so loads don't peel layers.\n\n**Good:** Load parallel to layers\n**Bad:** Load perpendicular to layers\n\n**Examples:**\n- Focuser body: Vertical (load along layers)\n- Bearing surfaces: Print flat (smooth finish)\n- Threaded holes: Vertical (threads across layers)\n\n**Support material:** Use tree supports to minimize marks on critical surfaces.`,
        tags: ["printing", "orientation", "strength"],
        difficulty: "intermediate",
        category: "printing",
      },
      {
        title: "Assembly Order for Newtonian OTA",
        summary: "Step-by-step assembly sequence",
        bodyMd: `**Correct order prevents rework:**\n\n1. Install primary in cell\n2. Attach cell to tube\n3. Install spider in tube\n4. Mount secondary on spider\n5. Install focuser\n6. Rough collimation\n7. Install finder\n8. Final collimation on star\n\n**Tip:** Test each joint before proceeding. Much easier to fix issues early.`,
        tags: ["assembly", "procedure", "newtonian"],
        difficulty: "intro",
        category: "assembly",
      },
      {
        title: "Adhesives for Telescope Construction",
        summary: "Which glues to use where",
        bodyMd: `**CA glue (cyanoacrylate):**\n- Use: Small parts, quick fixes\n- Pros: Fast, strong\n- Cons: Brittle, can fog optics\n\n**Epoxy (2-part):**\n- Use: Permanent joints, dissimilar materials\n- Pros: Very strong, gap-filling\n- Cons: Slow cure, can't disassemble\n\n**PVA (wood glue):**\n- Use: Wood components\n- Pros: Reversible, sandable\n\n**Contact cement:**\n- Use: Cork/felt liners\n\n**Never use:** Solvent-based glues near optics (outgassing damages coatings).`,
        tags: ["assembly", "adhesives", "materials"],
        difficulty: "intro",
        category: "assembly",
      },
      {
        title: "Heat-Set Inserts for Printed Parts",
        summary: "Creating durable threaded connections",
        bodyMd: `Heat-set inserts provide metal threads in plastic parts.\n\n**Installation:**\n1. Print hole 0.3-0.5mm smaller than insert OD\n2. Heat insert with soldering iron\n3. Press firmly until flush\n4. Allow to cool before use\n\n**Best practices:**\n- Use brass inserts (M3, M4, M5 common)\n- Pilot hole perpendicular to surface\n- Insert tips with soldering iron tip that fits insert\n\n**Alternatives:** Threaded heat-set brass inserts (Hilitchi brand popular).`,
        tags: ["assembly", "fasteners", "printing"],
        difficulty: "intermediate",
        category: "fasteners",
      },
      {
        title: "Fastener Selection",
        summary: "Choosing the right bolts and screws",
        bodyMd: `**Thread sizes:**\n- M3: Small parts, adjusters\n- M4: General assembly\n- M5: Heavy loads\n- M6-M8: Tube rings, mount attach points\n\n**Material:**\n- Stainless steel: Outdoor use\n- Zinc-plated: Indoor, cheaper\n- Nylon: Non-marring, adjusters\n\n**Thread types:**\n- Machine screws: Into inserts/nuts\n- Self-tapping: Direct into plastic (avoid if disassembly needed)\n\n**Always use:** Lock washers or threadlocker on vibration-prone joints.`,
        tags: ["fasteners", "hardware", "assembly"],
        difficulty: "intro",
        category: "fasteners",
      },

      // Safety (3)
      {
        title: "Solar Observing Safety - CRITICAL",
        summary: "NEVER observe the Sun without proper protection",
        bodyMd: `**⚠️ DANGER:** Looking at the Sun through ANY optical instrument without a certified solar filter WILL cause immediate and permanent blindness.\n\n**SAFE methods:**\n1. **White-light solar filter:** Glass or film filter on FRONT of telescope (Baader, Thousand Oaks)\n2. **H-alpha filter:** Dedicated solar telescope\n3. **Projection:** Project Sun's image onto white card (do NOT look through eyepiece)\n\n**NEVER SAFE:**\n- Eyepiece solar filters (can crack from heat)\n- Sunglasses\n- Smoked glass\n- Exposed film\n- Homemade filters\n\n**Eclipse viewing:** Follow NASA safety guidelines, use ISO 12312-2 certified eclipse glasses.`,
        tags: ["safety", "solar", "warning"],
        difficulty: "intro",
        category: "safety",
      },
      {
        title: "Laser Collimation Safety",
        summary: "Safe practices for laser collimators",
        bodyMd: `**Laser hazards:**\n- Class 1: <0.39 mW, safe\n- Class 2: <1 mW, safe if blink reflex works\n- Class 3R: 1-5 mW, can damage eye\n- Class 3B: 5-500 mW, DANGEROUS\n\n**Safe practices:**\n1. Use <1 mW laser collimators (Class 2 or lower)\n2. NEVER look directly into laser or its reflection\n3. Work at table height, not eye level\n4. Keep laser pointing down when not in use\n5. Warn others in area\n6. Use laser safety glasses for >1 mW lasers\n\n**Alternative:** Collimate with Cheshire or on-star (no laser hazard).`,
        tags: ["safety", "laser", "collimation"],
        difficulty: "intro",
        category: "safety",
      },
      {
        title: "Electrical Safety in Observatory",
        summary: "Safe wiring practices for powered equipment",
        bodyMd: `**Key principles:**\n1. All outdoor electrical must be GFCI protected\n2. Use grounded (3-prong) plugs\n3. Keep connections dry (weatherproof boxes)\n4. Size wire for load + 20% margin\n5. Use strain reliefs on all connections\n\n**12V DC systems:**\n- Fuse every circuit\n- Anderson Powerpoles for connectors\n- Keep positive and negative physically separated\n- Size wire for amperage (18 AWG good for 5A)\n\n**Motor controllers:** Add TVS diodes to protect from back-EMF.\n\n**Dew heaters:** Use thermostat-controlled, never run unattended on full power.`,
        tags: ["safety", "electrical", "power"],
        difficulty: "intermediate",
        category: "safety",
      },
    ]).onConflictDoNothing().returning();

    console.log(`Inserted ${concepts.length} concepts`);

    // ===== EQUATIONS (20+) =====
    console.log("Seeding equations...");
    
    const { seedEquations, seedDimensionedExamples, seedRulesOfThumb } = await import("./design-seed-data");
    
    const equations = await db.insert(equation).values(seedEquations as any[]).onConflictDoNothing().returning();
    console.log(`Inserted ${equations.length} equations`);

    // ===== DIMENSIONED EXAMPLES (18+) =====
    console.log("Seeding dimensioned examples...");
    
    const examples = await db.insert(dimensionedExample).values(seedDimensionedExamples as any[]).onConflictDoNothing().returning();
    console.log(`Inserted ${examples.length} dimensioned examples`);

    // Add dimensions for first example
    if (examples.length > 0) {
      await db.insert(dimension).values([
        {
          exampleId: examples[0].id,
          name: "tube_inner_diameter_mm",
          value: 110,
          unitSource: "mm",
          unitSi: "mm",
          notes: "Matches PVC tube OD",
        },
        {
          exampleId: examples[0].id,
          name: "secondary_minor_axis_mm",
          value: 18,
          unitSource: "mm",
          unitSi: "mm",
          computedFromEquationId: equations[0]?.id,
          toleranceMm: 1.0,
        },
        {
          exampleId: examples[0].id,
          name: "focuser_travel_mm",
          value: 20,
          unitSource: "mm",
          unitSi: "mm",
          notes: "Helical focuser with 1mm thread pitch",
        },
        {
          exampleId: examples[0].id,
          name: "spider_vane_thickness_mm",
          value: 2.0,
          unitSource: "mm",
          unitSi: "mm",
          notes: "3-vane spider, 2mm printed thickness",
        },
        {
          exampleId: examples[0].id,
          name: "backfocus_mm",
          value: 75,
          unitSource: "mm",
          unitSi: "mm",
          notes: "Sufficient for eyepieces and small cameras",
        },
      ]).onConflictDoNothing();
    }

    // ===== PROCEDURES =====
    console.log("Seeding procedures...");
    
    const procedures = await db.insert(procedure).values([
      {
        title: "Solar Observing Safety Protocol",
        bodyMd: `**⚠️ CRITICAL SAFETY PROCEDURE ⚠️**

## WARNING
NEVER observe the Sun through ANY optical instrument without proper certified solar filtration. Doing so WILL cause immediate and permanent blindness.

## Safe Solar Observing Methods

### Method 1: White-Light Solar Filter (RECOMMENDED)
1. Obtain ISO-certified solar filter (Baader, Thousand Oaks)
2. Mount filter securely on FRONT of telescope (aperture end)
3. Verify no cracks or pinholes in filter
4. Double-check filter is secure before pointing at Sun
5. Never use eyepiece solar filters - they can crack from heat

### Method 2: Projection Method
1. Point telescope at Sun (DO NOT LOOK through finder or eyepiece)
2. Hold white card 12-18" behind eyepiece
3. Adjust focus until Sun's image is sharp on card
4. Safe for groups to view

## What NOT to Use
- ❌ Eyepiece solar filters
- ❌ Sunglasses
- ❌ Smoked glass
- ❌ Exposed film
- ❌ Any homemade filters
- ❌ Neutral density filters

## Emergency Procedure
If you accidentally view the Sun through unfiltered optics:
1. Close eye IMMEDIATELY
2. Cover eye with hand
3. Seek medical attention if vision is affected
4. Report incident to prevent others from same mistake`,
        type: "safety",
        estimatedTimeMin: 10,
        tools: ["ISO-certified solar filter", "White card (for projection)"],
        steps: [
          {
            order: 1,
            description: "Verify solar filter is certified and undamaged",
            safety_note: "Check for pinholes, cracks, or delamination",
          },
          {
            order: 2,
            description: "Mount filter securely on telescope aperture",
            safety_note: "Use provided mounting hardware, ensure cannot fall off",
          },
          {
            order: 3,
            description: "Cover or remove finder scope",
            safety_note: "Finder scopes must also have solar filters or be covered",
          },
          {
            order: 4,
            description: "Point telescope at Sun using shadow method",
            safety_note: "Minimize telescope shadow on ground to aim",
          },
          {
            order: 5,
            description: "View through eyepiece ONLY after filter is confirmed secure",
          },
        ],
        hazardsMd: "**BLINDNESS HAZARD:** Unfiltered solar viewing causes irreversible retinal damage within milliseconds.",
      },
      {
        title: "Newtonian Collimation with Cheshire",
        bodyMd: `Complete procedure for collimating a Newtonian telescope using a Cheshire eyepiece.`,
        type: "collimation",
        estimatedTimeMin: 15,
        tools: ["Cheshire eyepiece", "Phillips screwdriver", "Patience"],
        steps: [
          {
            order: 1,
            description: "Insert Cheshire eyepiece into focuser",
          },
          {
            order: 2,
            description: "Look through Cheshire peephole and identify secondary mirror reflection",
          },
          {
            order: 3,
            description: "Adjust secondary position screws until secondary is centered in focuser view",
          },
          {
            order: 4,
            description: "Adjust secondary tilt until entire primary mirror is visible in secondary reflection",
          },
          {
            order: 5,
            description: "Adjust primary mirror collimation screws until center spot appears centered",
          },
          {
            order: 6,
            description: "Verify all circles are concentric when viewed through Cheshire",
          },
          {
            order: 7,
            description: "Fine-tune on bright star using high magnification",
          },
        ],
        hazardsMd: "No significant hazards. Take care not to touch mirror surfaces.",
      },
      {
        title: "Star Test Procedure",
        bodyMd: `Using a bright star to evaluate optical quality and collimation.`,
        type: "test",
        estimatedTimeMin: 20,
        tools: ["High-power eyepiece (150-300x)", "Bright star", "Good seeing conditions"],
        steps: [
          {
            order: 1,
            description: "Point telescope at bright star (Sirius, Vega, Capella)",
          },
          {
            order: 2,
            description: "Use high magnification eyepiece (150-300x)",
          },
          {
            order: 3,
            description: "Focus precisely on star - should be tiny point",
          },
          {
            order: 4,
            description: "Rack focuser inward (inside focus) - observe diffraction pattern",
          },
          {
            order: 5,
            description: "Rack focuser outward (outside focus) - observe diffraction pattern",
          },
          {
            order: 6,
            description: "Compare patterns - should be identical if collimated",
          },
        ],
        hazardsMd: "Ensure star is not the Sun! Only perform at night on stars.",
      },
    ]).onConflictDoNothing().returning();
    
    console.log(`Inserted ${procedures.length} procedures`);

    // ===== RULES OF THUMB (50) =====
    console.log("Seeding rules of thumb...");
    
    const rules = await db.insert(ruleOfThumb).values(
      seedRulesOfThumb.map(rule => ({
        ...rule,
        sourceRefId: sources[0]?.id || null,
      }))
    ).onConflictDoNothing().returning();
    
    console.log(`Inserted ${rules.length} rules of thumb`);

    // ===== CROSS-REFERENCES =====
    console.log("Creating cross-references...");
    
    if (concepts.length > 0 && equations.length > 0) {
      await db.insert(xref).values([
        {
          fromTable: "concept",
          fromId: concepts[2].id, // Secondary sizing concept
          toTable: "equation",
          toId: equations[0].id, // Secondary sizing equation
          relation: "uses",
        },
        {
          fromTable: "concept",
          fromId: concepts[1].id, // Fully illuminated field
          toTable: "equation",
          toId: equations[0].id,
          relation: "explains",
        },
      ]).onConflictDoNothing();
    }

    console.log("Design KB seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding Design KB:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run seed if called directly
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

if (isMainModule) {
  seedDesignKB()
    .then(() => {
      console.log("Seed completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seed failed:", error);
      process.exit(1);
    });
}
