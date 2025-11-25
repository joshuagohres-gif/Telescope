# 🔭 Generative Telescope Design Pipeline

An AI-powered system for designing custom telescopes with complete conversation history, state management, and bill of materials tracking.

## 🚀 Quick Start

```bash
# 1. Install dependencies (if not already done)
npm install

# 2. Start the application
npm run dev

# 3. Access the feature
# - Open the app in your browser
# - Click the menu (top-left)
# - Select "Generative Design (AI)"

# 4. Create your first telescope design!
```

**That's it!** The system works immediately in mock mode (no configuration required).

## ✨ Features

### Four Design Domains
- **AR** - Apochromatic Refractor (high-quality, portable)
- **NR** - Newtonian Reflector (cost-effective, versatile)
- **SC** - Schmidt-Cassegrain (compact, long focal length)
- **RASA** - Rowe-Ackermann Schmidt Astrograph (ultra-fast, widefield)

### Complete Design Pipeline
1. Initial criteria gathering
2. Follow-up questions
3. Domain classification
4. Optical design analysis
5. Mechanical geometry specification
6. Bill of materials generation
7. Final review and validation
8. Complete design ready to build

### Intelligent Conversation
- Natural language input
- AI asks clarifying questions
- Iterative refinement
- Complete conversation history
- Design snapshots at key stages

### Data Management
- User-separated sessions (Auth-ready)
- Complete conversation history
- Versioned design snapshots
- Normalized bill of materials
- Stage transition tracking
- Categorical tagging

## 📖 Documentation

- **[Quick Start Guide](GENERATIVE_DESIGN_QUICKSTART.md)** - Get started in 5 minutes
- **[Implementation Details](GENERATIVE_DESIGN_IMPLEMENTATION.md)** - Complete technical documentation
- **[Implementation Summary](IMPLEMENTATION_COMPLETE.md)** - Feature checklist and verification

## 🔧 Optional Configuration

### LLM API (for full AI capabilities)

**OpenAI:**
```bash
export OPENAI_API_KEY="sk-..."
export OPENAI_MODEL="gpt-4o"  # optional
```

**Anthropic:**
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

Without an API key, the system uses mock responses (still functional for testing).

### Database (for persistent storage)

```bash
export DATABASE_URL="postgresql://user:password@host:port/database"

# Then push the schema
npm run db:push
```

Without a database, the system uses in-memory storage (sessions reset on restart).

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend UI                         │
│  (React Components + Custom Hook)                       │
│  - Session management                                   │
│  - Chat interface                                       │
│  - Design visualization                                 │
└─────────────────────────────────────────────────────────┘
                           │
                           │ REST API
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  Backend API Layer                      │
│  (Express Routes)                                       │
│  - POST /api/generative-design/sessions                │
│  - POST /api/generative-design/sessions/:id/turns      │
│  - GET  /api/generative-design/sessions/:id            │
└─────────────────────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
┌─────────────────────────┐  ┌──────────────────────────┐
│   LLM Orchestration     │  │    Storage Layer         │
│  - System prompt        │  │  - PostgreSQL (prod)     │
│  - Response validation  │  │  - Mock mode (dev)       │
│  - OpenAI/Anthropic     │  │  - 6 database tables     │
└─────────────────────────┘  └──────────────────────────┘
```

## 🗄️ Database Schema

Six tables with full relationship tracking:

1. **gen_design_users** - User accounts (Auth-ready)
2. **gen_design_sessions** - Design sessions (one per telescope)
3. **gen_design_turns** - Conversation history (all messages)
4. **gen_design_state_snapshots** - Design state at key stages
5. **gen_bom_items** - Bill of materials (normalized)
6. **gen_stage_transitions** - Stage progression audit log

## 🎯 Usage Example

```
User: "I want to design a fast widefield telescope for 
       nebula photography, portable, under $3000"

AI:   [FOLLOW] Great! I need a few more details:
      1. What aperture are you targeting?
      2. What mount will you use?
      3. Do you need visual capability or imaging only?

User: "150mm aperture, EQ6 mount, imaging only"

AI:   [NEXTPHASE] Based on your requirements, I recommend 
      a RASA (Rowe-Ackermann Schmidt Astrograph) design...
      
      [Proceeds through design stages...]
      
      [FINAL] Your telescope design is complete!
      - Aperture: 150mm
      - Focal ratio: f/2.8
      - Focal length: 420mm
      - Total weight: 4.2kg
      - Estimated cost: $2,750
      
      [Complete BOM with 23 items...]
```

## 📁 File Structure

```
/workspace
├── shared/
│   └── generative-design-schema.ts      # Database schema
├── server/
│   ├── generative-design-storage.ts     # Storage layer
│   ├── generative-design-llm.ts         # LLM integration
│   └── generative-design-routes.ts      # API endpoints
├── client/src/
│   ├── hooks/
│   │   └── use-generative-design.ts     # React hook
│   ├── components/
│   │   └── GenerativeDesignInterface.tsx
│   └── pages/
│       └── generative-design.tsx
└── docs/
    ├── GENERATIVE_DESIGN_QUICKSTART.md
    ├── GENERATIVE_DESIGN_IMPLEMENTATION.md
    └── IMPLEMENTATION_COMPLETE.md
```

## 🎨 UI Features

- **Sessions List** - View and manage all design sessions
- **Chat Interface** - Natural conversation with AI designer
- **Design Details Panel** - BOM, transitions, snapshots
- **Follow-up Highlighting** - Clearly shows when AI needs more info
- **Expandable Data** - Collapse/expand optical and mechanical specs
- **Stage Badges** - Color-coded pipeline progress
- **Domain Badges** - Visual indication of telescope type

## 🔒 Security & Privacy

- User-separated data (ready for Auth)
- All sessions belong to authenticated user
- No cross-user data leakage
- API keys stored securely in environment
- SQL injection protection via Drizzle ORM

## 🧪 Testing

### Without API Key (Mock Mode)
The system provides intelligent mock responses:
- Classifies domains based on keywords
- Asks relevant follow-up questions
- Progresses through stages naturally
- Generates sample BOM and specs

### With API Key (Full AI)
Full AI-powered design generation:
- GPT-4o or Claude 3.5 Sonnet recommended
- Accurate optical calculations
- Realistic BOM generation
- Physics-aware design constraints

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production
```bash
# 1. Set environment variables
export DATABASE_URL="..."
export OPENAI_API_KEY="..."

# 2. Push database schema
npm run db:push

# 3. Build and start
npm run build
npm start
```

## 🤝 Integration with Existing Features

The generative design system integrates seamlessly with:
- **Design Knowledge Base** - Reference existing telescope designs
- **CAD Viewer** - Future integration for 3D visualization
- **AstroDB** - Link to equipment catalogs

## 📈 Extensibility

Easy to extend with:
- New design domains (add to enum)
- New pipeline stages (add to enum)
- New BOM categories (flexible strings)
- Additional LLM providers (add to orchestration layer)
- Export formats (PDF, CAD, JSON)

## 🎓 Learning

**New to telescope design?**
The AI will guide you through the entire process with explanations at each stage.

**Experienced designer?**
Provide detailed specifications upfront and skip the follow-up questions.

## 📝 License

Same as the parent project.

## 🙏 Acknowledgments

Built using:
- OpenAI GPT-4o or Anthropic Claude 3.5 Sonnet for AI generation
- PostgreSQL + Drizzle ORM for data persistence
- React + TypeScript for the frontend
- Express.js for the backend API

## 🐛 Support

See documentation files for:
- Troubleshooting common issues
- API endpoint details
- Database schema reference
- Example prompts

## ✅ Status

**Production Ready** ✨

All features implemented, tested, and documented. Ready for immediate use in mock mode, or with optional LLM API and database configuration.

---

**Happy Designing! 🔭✨**
