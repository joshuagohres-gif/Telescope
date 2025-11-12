# CAD Feature User Guide

Complete guide for using the Telescope CAD feature.

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Using Templates](#using-templates)
4. [Generative CAD with AI](#generative-cad-with-ai)
5. [Parameter Editing](#parameter-editing)
6. [Viewing and Navigation](#viewing-and-navigation)
7. [Exporting Models](#exporting-models)
8. [Performance Optimization](#performance-optimization)
9. [Troubleshooting](#troubleshooting)

---

## Introduction

The Telescope CAD feature enables you to:

- Design custom telescope parts with parametric models
- Browse and customize pre-built templates
- Generate CAD models from natural language descriptions using AI
- Export models for 3D printing (STL) or CAD software (STEP)
- Visualize designs in an interactive 3D viewer

### Key Features

- **5 Pre-Built Templates**: Tube clamps, focuser drawtubes, dovetail bars, spider vanes, and finder rings
- **AI-Powered Generation**: Describe what you want in plain English
- **Real-Time Preview**: See changes instantly as you adjust parameters
- **Professional Export**: STEP (AP214/AP242) and STL formats
- **Performance Optimized**: Caching, worker pooling, and LOD rendering

---

## Getting Started

### Enabling the Feature

The CAD feature is experimental and must be enabled via feature flag:

1. Edit `.env` file:
   ```bash
   GENERATIVE_CAD_ENABLED=true
   ```

2. Restart the development server

3. Navigate to the CAD workspace (add route if needed)

### First Steps

1. **Choose Your Workflow:**
   - **Templates**: Start with a pre-built design and customize it
   - **Generative**: Describe your part and let AI create it

2. **Familiarize Yourself with the Interface:**
   - Left Panel: Template browser or generative input
   - Center: 3D viewer with your model
   - Right Panel: Parameter editor (when model is loaded)

---

## Using Templates

### Browsing Templates

1. Click the **Templates** tab in the left panel

2. Use the search bar to find templates:
   ```
   Search: "clamp"  →  Shows tube clamp template
   Search: "finder" →  Shows finder rings template
   ```

3. Filter by tags:
   - Click tag chips to filter (e.g., "mounting", "spider")
   - Click again to remove filter

4. Switch between grid and list view using the icons

### Available Templates

#### 1. Tube Clamp Ring

Parametric clamping ring for securing optical tube assemblies.

**Key Parameters:**
- Tube Diameter (50-500mm)
- Clamp Thickness (2-15mm)
- Number of Bolt Holes (2-12)
- Split Gap Width (2-20mm)

**Use Case:** Mount telescope tube to tripod or pier

#### 2. Focuser Drawtube

Telescope focuser drawtube with keyway slot for 2" or 1.25" eyepieces.

**Key Parameters:**
- Eyepiece Format (2" or 1.25")
- Outer Diameter (35-120mm)
- Length (50-200mm)
- Include Keyway (yes/no)
- Include Compression Ring (yes/no)

**Use Case:** Custom focuser for refractors or reflectors

#### 3. Dovetail Mounting Bar

Standard dovetail bar (Losmandy or Vixen style).

**Key Parameters:**
- Style (Losmandy 75mm / Vixen 44mm)
- Bar Length (100-500mm)
- Number of Slots (2-10)
- Slot Diameter (6-12mm)

**Use Case:** Mount telescope to equatorial mount

#### 4. Spider Vanes

Secondary mirror spider vane assembly for reflector telescopes.

**Key Parameters:**
- Number of Vanes (3 or 4)
- Tube Diameter (100-600mm)
- Vane Width (5-30mm)
- Vane Thickness (0.5-5mm)
- Hub Diameter (20-80mm)

**Use Case:** Support secondary mirror in Newtonian telescope

#### 5. Finder Rings

Finder scope mounting rings with base plate.

**Key Parameters:**
- Finder Scope Diameter (30-80mm)
- Ring Width (10-30mm)
- Ring Spacing (50-150mm)
- Base Thickness (3-12mm)

**Use Case:** Mount finder scope to main telescope

### Loading a Template

1. Click on a template card
2. The template loads in the 3D viewer
3. Parameter editor opens on the right
4. Default parameters are applied automatically

---

## Generative CAD with AI

### Creating Models from Descriptions

1. Click the **Generate** tab in the left panel

2. Describe your part in natural language:
   ```
   "A tube clamp ring for a 200mm telescope tube with 6 mounting holes"

   "A spider vane assembly with 4 vanes for a 250mm tube"

   "A focuser drawtube for 2 inch eyepieces with keyway slot"

   "A Losmandy-style dovetail bar, 250mm long with 6 mounting slots"
   ```

3. Click **Generate Model**

4. Wait for AI to generate the design (typically 5-15 seconds)

5. Review the generated code and parameters

6. Click **Use This Model** to load it

### Tips for Good Descriptions

**Be Specific:**
- ✅ "200mm diameter tube clamp with 8 bolt holes"
- ❌ "Make me a clamp"

**Include Dimensions:**
- ✅ "Focuser drawtube, 100mm long, 2 inch eyepiece"
- ❌ "Focuser drawtube"

**Mention Important Features:**
- ✅ "Dovetail bar with 6 slots for adjustment screws"
- ❌ "Dovetail bar"

**Use Telescope Terminology:**
- ✅ "Spider vane assembly for secondary mirror support"
- ❌ "Thing to hold the mirror"

### Advanced Options

Click **Show Advanced Options** to adjust:

- **Temperature (0.0-1.0):**
  - Lower (0.2-0.5): More predictable, conservative designs
  - Higher (0.7-1.0): More creative, experimental designs
  - Default: 0.7

- **Include Comments:**
  - Enabled: Generated code includes explanatory comments
  - Useful for learning and debugging

### Viewing Generated Code

After generation, expand the **View Generated Code** section to see:
- Complete CADScript implementation
- Parameter schema definition
- AI's reasoning for design choices

---

## Parameter Editing

### Real-Time Editing

1. Load a template or generated model

2. Locate the **Parameters** panel (right side or click "Parameters" button)

3. Adjust parameters:
   - **Numbers/Integers**: Type value or use arrow keys
   - **Booleans**: Toggle checkbox
   - **Enums**: Select from dropdown

4. Parameter changes are validated in real-time

5. Click **Rebuild Model** to apply changes

### Validation

Parameters are validated as you type:

- **Range Validation**: Red border if outside min/max
- **Pattern Validation**: String must match pattern (e.g., alphanumeric)
- **Constraint Validation**: Yellow warning if constraints violated

**Example Constraint:**
```
"Base plate too narrow for ring diameter"
```

This appears when `baseWidth < scopeDiameter + ringThickness * 2 + 10`

### Parameter Groups

Parameters are organized into logical groups:

- **Dimensions**: Size-related parameters
- **Features**: Optional features (keyways, holes, etc.)
- **Configuration**: Style or type selections
- **Mounting**: Fastener-related parameters

### Suggested Values

Each template provides suggested values that work well together. Use these as a starting point and adjust as needed.

---

## Viewing and Navigation

### Camera Controls

**Orbit:**
- Left-click + drag to rotate around model
- Touch: One finger drag

**Pan:**
- Right-click + drag to move camera
- Touch: Two finger drag

**Zoom:**
- Scroll wheel to zoom in/out
- Touch: Pinch gesture

**Reset View:**
- Click camera reset button in toolbar
- Double-click on model to focus

### Toolbar Features

**View Presets:**
- Top, Front, Right, Isometric views
- Click buttons to snap to preset

**Display Options:**
- **Grid**: Toggle reference grid
- **Axes**: Show X/Y/Z axes
- **Edges**: Display model edges
- **Section Plane**: Cut view for interior inspection

**Measurement Tools:**
- Distance measurement
- Angle measurement
- Area calculation

### Section Plane

Enable cross-section views:

1. Click **Section** button in toolbar
2. Adjust plane position with slider
3. Change plane normal (X, Y, or Z axis)
4. View interior geometry

**Use Cases:**
- Check wall thickness
- Verify internal clearances
- Inspect hollow sections

### Performance

The viewer automatically adjusts detail level based on:
- Camera distance from model
- Model complexity
- Available GPU performance

**LOD (Level of Detail) Levels:**
- Close: High detail (0.05mm linear deflection)
- Medium: Standard detail (0.1mm)
- Far: Low detail (0.3mm)
- Very Far: Minimum detail (0.5mm)

---

## Exporting Models

### STEP Export

STEP files are compatible with professional CAD software (SolidWorks, Fusion 360, FreeCAD, etc.).

1. Build your model
2. Click **Export** → **STEP**
3. Choose schema:
   - **AP214**: Widely compatible, automotive/aerospace standard
   - **AP242**: Modern standard, better feature support
4. File downloads automatically

**Recommended For:**
- Further editing in CAD software
- Professional manufacturing
- Precise modifications

### STL Export

STL files are for 3D printing and mesh-based applications.

1. Build your model
2. Click **Export** → **STL**
3. Choose format:
   - **Binary**: Smaller files (recommended)
   - **ASCII**: Human-readable, larger files
4. Adjust mesh quality:
   - **Linear Deflection**: 0.01-0.5mm (lower = finer mesh)
   - **Angular Deflection**: 0.1-2.0° (lower = smoother curves)

**Recommended For:**
- 3D printing
- CNC machining
- Mesh editing (Blender, MeshLab)

### Export Tips

**For 3D Printing:**
- Use Binary STL
- Linear Deflection: 0.1mm (standard) or 0.05mm (high quality)
- Check model dimensions match printer bed size

**For CAD Editing:**
- Use STEP AP214 (maximum compatibility)
- Original parametric data is preserved
- Can modify in any CAD program

**For Visualization:**
- STL is sufficient
- Increase deflection values for smaller files
- Binary format loads faster

---

## Performance Optimization

### Cache System

The cache stores built models to avoid recomputation:

**How It Works:**
- Models are cached based on script + parameters
- Cache is stored in browser (IndexedDB)
- Survives page reloads
- Maximum 100MB or 100 entries

**Benefits:**
- 10-100x faster for repeated builds
- Instant preview when adjusting parameters
- Works across sessions

**Managing Cache:**
1. Open **Telemetry Dashboard**
2. View cache statistics
3. Click **Clear Cache** if needed

**When to Clear:**
- Cache grows too large (>50MB)
- Experiencing stale data issues
- Freeing disk space

### Worker Pool

Multiple workers process models in parallel:

- Automatically scales to CPU cores
- Priority queue for urgent requests
- Timeout and recovery handling

**Best Practices:**
- Build multiple models concurrently when possible
- System handles up to hardware concurrency workers
- Long operations (>1min) may timeout

### Mesh Quality vs Performance

Balance quality and performance:

**High Quality (Slow):**
```
linearDeflection: 0.05
angularDeflection: 0.3
```
- 50,000-200,000 triangles
- Smooth curves
- Large file sizes
- Use for final export

**Standard Quality (Balanced):**
```
linearDeflection: 0.1
angularDeflection: 0.5
```
- 10,000-50,000 triangles
- Good balance
- Recommended for most uses

**Low Quality (Fast):**
```
linearDeflection: 0.3
angularDeflection: 1.0
```
- 2,000-10,000 triangles
- Faceted appearance
- Quick preview
- Use during parameter adjustment

### Telemetry Dashboard

Monitor performance and identify issues:

1. Click **Telemetry** button
2. View metrics:
   - Build times
   - Cache hit rate
   - FPS (frames per second)
   - Error logs

**Metrics Explained:**
- **Cache Hit Rate**: % of builds using cache (higher is better)
- **Average Build Time**: Time to build models (lower is better)
- **Average FPS**: Viewer performance (60 is ideal)
- **Total Errors**: Problems encountered

---

## Troubleshooting

### Model Won't Build

**Symptom:** "Build failed" error

**Causes:**
1. **Invalid Parameters:**
   - Check for red validation errors
   - Ensure values are within min/max ranges
   - Fix constraint violations (yellow warnings)

2. **Invalid CADScript:**
   - Syntax errors in generated code
   - Use templates as reference
   - Check browser console for details

3. **Geometry Issues:**
   - Self-intersecting geometry
   - Degenerate shapes (zero volume)
   - Boolean operations failed

**Solutions:**
- Start with template and modify incrementally
- Check parameter constraints
- Regenerate with AI using clearer description
- View browser console for detailed error

### Slow Performance

**Symptom:** Low FPS, laggy interactions

**Causes:**
1. **Complex Geometry**: Too many triangles
2. **Multiple Models**: Several models in scene
3. **High Quality Settings**: Excessive detail

**Solutions:**
1. Increase deflection values (lower quality)
2. Close other browser tabs
3. Update graphics drivers
4. Use modern browser (Chrome/Edge preferred)
5. Check telemetry for bottlenecks

### Cache Issues

**Symptom:** Stale data, incorrect models

**Solutions:**
1. Clear browser cache
2. Clear CAD cache (Telemetry Dashboard)
3. Hard refresh (Ctrl+Shift+R)
4. Rebuild model manually

### Export Fails

**Symptom:** Export button does nothing or errors

**Causes:**
1. Model not built yet
2. Browser blocking downloads
3. Insufficient memory

**Solutions:**
1. Ensure model is successfully built
2. Check browser download permissions
3. Try simpler/smaller model first
4. Use different export format

### AI Generation Fails

**Symptom:** "Generation failed" error

**Causes:**
1. **No API Key**: OpenAI API key not configured
2. **Rate Limit**: Too many requests
3. **Invalid Description**: Unclear or impossible request

**Solutions:**
1. Check server logs for API configuration
2. Wait a few minutes and retry
3. Simplify your description
4. Use more specific terminology
5. Try a template-based approach instead

### Worker Timeout

**Symptom:** "Worker timeout" error after 60 seconds

**Causes:**
- Extremely complex geometry
- Infinite loops in CADScript
- Heavy boolean operations

**Solutions:**
- Simplify model parameters
- Check CADScript for performance issues
- Break complex models into simpler parts
- Increase timeout in worker pool config (advanced)

---

## Best Practices

### General Tips

1. **Start Simple**: Begin with basic parameters, add complexity gradually
2. **Save Often**: Export models frequently during development
3. **Use Templates**: Leverage pre-built templates as starting points
4. **Monitor Telemetry**: Check performance dashboard regularly
5. **Test Parameters**: Validate extreme values before final export

### Design Workflow

1. **Concept**: Describe or sketch your idea
2. **Template/Generate**: Choose template or use AI
3. **Customize**: Adjust parameters
4. **Validate**: Check constraints and dimensions
5. **Preview**: View in 3D, inspect details
6. **Export**: Save as STEP or STL
7. **Verify**: Open in CAD software or slicer

### Learning Resources

- **API Documentation**: See API.md for technical details
- **Architecture Guide**: See ARCHITECTURE.md for system design
- **Templates**: Study template source code to learn CADScript
- **Examples**: Generated AI models show working patterns

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + Z | Undo parameter change |
| Ctrl/Cmd + Y | Redo parameter change |
| Space | Reset camera view |
| 1-4 | Switch view preset |
| G | Toggle grid |
| A | Toggle axes |
| E | Toggle edges |
| S | Toggle section plane |
| Ctrl/Cmd + E | Export current model |
| Ctrl/Cmd + R | Rebuild model |
| Ctrl/Cmd + F | Focus search |

---

## Support

For issues, feature requests, or questions:

1. Check [Troubleshooting](#troubleshooting) section
2. Review [API Documentation](API.md)
3. Open GitHub issue with:
   - Description of problem
   - Steps to reproduce
   - Browser and OS version
   - Screenshots or exported telemetry

---

## Next Steps

- Explore all 5 templates
- Try AI generation with different prompts
- Export your first model for 3D printing
- Read API.md for advanced usage
- Review ARCHITECTURE.md to understand the system
