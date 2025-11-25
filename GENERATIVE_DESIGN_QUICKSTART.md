# Generative Telescope Design - Quick Start Guide

## 🚀 Getting Started

### 1. Start the Server

```bash
npm run dev
```

The system works immediately in **mock mode** (no database or API key required).

### 2. Access the Interface

1. Open the application in your browser
2. Click the **Telescope Control System** menu in the top-left
3. Select **"Generative Design (AI)"** from the dropdown

### 3. Create Your First Design

1. Click **"New"** in the left sidebar
2. Enter a title: `"My First Telescope"`
3. Enter a description, for example:
   ```
   I want to design a telescope for photographing nebulae 
   and galaxies. I need something portable with good widefield 
   capability for deep sky imaging.
   ```
4. Click **"Create"**

### 4. Follow the AI Conversation

- The AI will ask follow-up questions
- Answer naturally in the chat interface
- The AI will guide you through:
  - Domain classification (AR/NR/SC/RASA)
  - Optical design analysis
  - Mechanical geometry
  - Bill of Materials
  - Final review

### 5. Review Your Design

- Check the **Design Details** panel on the right
- Expand design data in chat messages
- View BOM items and stage transitions

## 🔧 Optional Configuration

### Database (PostgreSQL)

For persistent storage:

```bash
export DATABASE_URL="postgresql://user:password@host:port/database"
```

### LLM API

For full AI-powered design (instead of mock responses):

**OpenAI:**
```bash
export OPENAI_API_KEY="sk-..."
export OPENAI_MODEL="gpt-4o"  # optional, defaults to gpt-4o
```

**Anthropic:**
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

## 📋 Example Prompts

### For RASA Design
```
I want to build a fast widefield astrograph for imaging 
large nebulae. I need f/2 to f/3 focal ratio and a large 
field of view. Budget around $5000.
```

### For Newtonian Reflector
```
Design a Newtonian telescope for visual observation and 
planetary imaging. I want good portability and easy 
maintenance. Aperture around 200-250mm.
```

### For Apochromatic Refractor
```
I need a premium apochromatic refractor for lunar and 
planetary photography. Portability is key - I'll be 
traveling to dark sky sites. Budget is flexible for quality.
```

### For Schmidt-Cassegrain
```
Build me a compact Schmidt-Cassegrain for planetary 
observation and high magnification work. I need something 
that fits on a small mount but still delivers crisp images 
of Jupiter and Saturn.
```

## 🎯 Design Domains

The AI will classify your telescope into one of four domains:

- **AR** (Apochromatic Refractor) - High-quality, portable, for lunar/planetary
- **NR** (Newtonian Reflector) - Cost-effective, large aperture, versatile
- **SC** (Schmidt-Cassegrain) - Compact, long focal length, planetary specialist
- **RASA** (Rowe-Ackermann Schmidt Astrograph) - Ultra-fast, widefield imaging

## 📊 Pipeline Stages

Your design progresses through 8 stages:

1. **Initial Criteria** - Understanding your goals
2. **Follow-up Questions** - Gathering details
3. **Domain Classified** - Choosing telescope type
4. **Domain Analysis** - High-level optical design
5. **Geometry & Tubes** - Precise mechanical dimensions
6. **BOM & Mass Estimate** - Parts list with costs
7. **Final Review** - Design validation
8. **Complete** - Ready to build!

## 🎨 UI Features

### Sessions List (Left)
- View all your design sessions
- Create new sessions
- Switch between sessions
- Archive old designs

### Chat Interface (Center)
- Natural conversation with AI
- Follow-up questions highlighted
- Expandable design data
- BOM visualization

### Design Details (Right)
- Complete bill of materials
- Stage progression timeline
- Design snapshots
- Notes and warnings

## 🔍 Troubleshooting

### "No sessions yet"
Click the **"New"** button to create your first session.

### Mock responses
If you see generic responses, the system is in mock mode. This is normal without an API key.

### Error messages
Red error banner appears at bottom. Check console for details.

## 📚 Learn More

See `GENERATIVE_DESIGN_IMPLEMENTATION.md` for complete technical documentation.

## 🤝 Tips for Best Results

1. **Be Specific**: Mention your targets (planets, nebulae, etc.)
2. **Set Constraints**: Budget, portability, mount type
3. **Describe Experience**: Beginner vs. advanced affects recommendations
4. **Iterate**: Ask follow-up questions to refine the design
5. **Review BOM**: Check the parts list matches your budget

## ⚡ Quick Examples

### Minimal Prompt
```
Fast telescope for nebula photography
```

### Detailed Prompt
```
I'm an intermediate astrophotographer looking to upgrade 
from my 80mm refractor. I want to design a telescope 
specifically for imaging emission nebulae (Ha, OIII) with 
narrowband filters. My mount can handle up to 15kg. Budget 
is $3000-4000. I need something with good field curvature 
correction and fast focal ratio for reasonable exposure times. 
Portability is nice but not critical.
```

Both work! The AI will ask questions to fill in gaps.

## 🎓 Understanding the Output

### Optical Design
- Aperture (diameter)
- Focal length
- Focal ratio (f/number)
- Optical spacing
- Mirror/lens specs

### Mechanical Design
- Tube dimensions (length, diameter)
- Focuser specifications
- Mirror cells and spiders
- Mounting points
- Focusing mechanisms

### Bill of Materials
- Primary optics
- Secondary optics
- Structural components
- Focuser hardware
- Estimated weights
- Cost estimates (when available)

## 🚀 Next Steps After Design

1. **Export Design** (future feature)
2. **Generate CAD Files** (future feature)
3. **Order Parts** from BOM
4. **Build Your Telescope!**

---

**Happy Designing! 🔭✨**
