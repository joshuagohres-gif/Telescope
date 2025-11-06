# Telescope Control System

A professional telescope control application with natural language processing capabilities for ASCOM-compatible astronomical mounts.

## Overview

This application enables astronomers to control precision telescope systems through intuitive natural language commands. It supports industry-standard ASCOM mounts (Sky-Watcher EQ6-R Pro, Celestron AVX, ZWO AM5N, iOptron CEM40, Sky-Watcher HEQ5 Pro) and includes a mock simulator for testing without hardware.

## Tech Stack

### Frontend
- **React** with TypeScript for type-safe UI development
- **Tailwind CSS** + **Shadcn UI** for consistent, professional design
- **Wouter** for client-side routing
- **TanStack Query** for server state management
- **WebSockets** for real-time telescope status updates

### Backend
- **Express.js** for API server
- **OpenAI GPT-5** for natural language command interpretation (via Replit AI Integrations)
- **WebSocket server** for real-time bidirectional communication
- **In-memory storage** for command history and celestial object database
- **ASCOM Alpaca REST** client for telescope hardware communication

## Features

### Natural Language Control
- AI-powered command interpretation using GPT-5
- Examples: "Point to Andromeda Galaxy", "Track Mars and capture 30s exposure"
- Command history with favorites
- Intelligent parameter extraction from natural language

### Telescope Control
- **Position Control**: Manual slew (N/S/E/W), GoTo equatorial (RA/Dec), GoTo horizontal (Alt/Az)
- **Tracking**: Object database with 14+ pre-loaded targets (planets, nebulae, galaxies, stars)
- **Real-time Status**: Live position updates, tracking state, connection status

### Camera Control
- Exposure time configuration (0.001s - 3600s)
- Gain adjustment (0-100)
- Binning modes (1x1, 2x2, 3x2, 4x4)
- Live exposure progress monitoring
- Temperature monitoring

### Focus Control
- Fine and coarse adjustment modes
- Absolute and relative positioning
- Position tracking with progress bar
- Temperature compensation monitoring

### Calibration
- Polar alignment wizard
- Azimuth and altitude correction inputs
- Alignment error tracking
- Plate solving integration (planned)

### System Status
- Real-time connection monitoring (ASCOM/Mock)
- Telescope state (tracking, slewing, parked, idle)
- Camera state (exposing, idle, temperature, settings)
- Focuser state (position, moving, temperature)
- Color-coded status indicators

## Design System

### Color Scheme
- **Dark-first interface** optimized for night vision preservation
- Status colors:
  - Green: Connected, tracking
  - Yellow/Amber: Slewing, in progress
  - Red: Error states
  - Blue: Parked
  - Gray: Idle, disconnected

### Typography
- **Inter** for UI elements and labels
- **JetBrains Mono** for coordinates, timestamps, and technical readouts
- Clear hierarchy with semibold headings and medium body text

### Layout
- Three-column dashboard (Command Input | Viewport & Controls | Status)
- Responsive design with mobile-first approach
- Sticky status dashboard for constant visibility
- Tab-based control panels for organized feature access

## Architecture

### Data Flow
1. **User Input** → Natural language command
2. **NLP Processing** → OpenAI GPT-5 interprets intent and parameters
3. **Command Execution** → Backend routes to appropriate telescope/camera/focuser API
4. **Hardware Communication** → ASCOM Alpaca or Mock Simulator
5. **Real-time Updates** → WebSocket pushes status to frontend
6. **UI Refresh** → React Query invalidates and refetches data

### Component Structure
```
client/src/
├── pages/
│   └── dashboard.tsx           # Main application page
├── components/telescope/
│   ├── command-input.tsx       # Natural language input
│   ├── telescope-viewport.tsx  # Position display & visualization
│   ├── position-control.tsx    # Manual slew & GoTo
│   ├── tracking-control.tsx    # Object selection & tracking
│   ├── camera-control.tsx      # Exposure settings
│   ├── focus-control.tsx       # Focuser adjustment
│   ├── calibration-control.tsx # Polar alignment
│   ├── status-dashboard.tsx    # Real-time system status
│   ├── command-history.tsx     # Past commands with favorites
│   ├── connection-toggle.tsx   # ASCOM/Mock selector
│   └── emergency-controls.tsx  # Stop & Park buttons
```

### Server Structure
```
server/
├── routes.ts         # API endpoints + WebSocket server
├── storage.ts        # PostgreSQL data store (DbStorage + legacy MemStorage)
├── services/
│   ├── nlp.ts        # OpenAI command interpretation
│   ├── telescope.ts  # Mock simulator + ASCOM client
│   ├── camera.ts     # Camera control
│   └── focuser.ts    # Focus control
```

### Database
- **PostgreSQL** via Neon serverless with Drizzle ORM
- **Tables**:
  - `commands` - Command history with favorites
  - `celestial_targets` - Astronomical object database (14 pre-seeded targets)
  - `imaging_sequences` - Automated imaging sequence definitions
  - `imaging_sequence_frames` - Frame specifications (exposure, filter, count, dither settings)
- **Auto-seeding**: Celestial targets initialized on first run
- **WebSocket Support**: Configured via neonConfig for serverless compatibility

## API Endpoints

### Commands
- `POST /api/commands/execute` - Execute natural language command
- `GET /api/commands/history` - Retrieve command history
- `POST /api/commands/:id/favorite` - Toggle favorite status
- `DELETE /api/commands/history` - Clear history

### Telescope
- `POST /api/telescope/connect` - Connect to ASCOM or Mock
- `POST /api/telescope/disconnect` - Disconnect telescope
- `POST /api/telescope/goto` - GoTo coordinates
- `POST /api/telescope/slew` - Manual slew direction
- `POST /api/telescope/track` - Start tracking target
- `POST /api/telescope/stop-tracking` - Stop tracking
- `POST /api/telescope/park` - Park telescope
- `POST /api/telescope/home` - Return to home position
- `POST /api/telescope/emergency-stop` - Emergency stop all motion
- `GET /api/telescope/status` - Get current system status

### Camera
- `POST /api/camera/capture` - Start exposure
- `POST /api/camera/abort` - Abort current exposure
- `POST /api/camera/configure` - Update camera settings

### Focuser
- `POST /api/focuser/move` - Move focuser (absolute/relative)
- `POST /api/focuser/stop` - Stop focuser motion

### Calibration
- `POST /api/calibration/start-polar-alignment` - Begin calibration
- `POST /api/calibration/complete-polar-alignment` - Finish calibration
- `POST /api/calibration/plate-solve` - Solve current position

### Targets
- `GET /api/targets` - Get celestial object database

### Imaging Sequences
- `POST /api/sequences` - Create new imaging sequence
- `GET /api/sequences` - Get all imaging sequences
- `GET /api/sequences/:id` - Get specific sequence
- `DELETE /api/sequences/:id` - Delete sequence
- `POST /api/sequences/:id/frames` - Add frame to sequence
- `GET /api/sequences/:id/frames` - Get sequence frames
- `POST /api/sequences/:id/start` - Start sequence execution
- `POST /api/sequences/pause` - Pause active sequence
- `POST /api/sequences/resume` - Resume paused sequence
- `POST /api/sequences/stop` - Stop active sequence
- `GET /api/sequences/active` - Get active sequence and progress

## Development Status

### Completed MVP (Phases 1-3)
✅ Complete data model and TypeScript interfaces  
✅ PostgreSQL database with Drizzle ORM  
✅ Database auto-seeding (14 celestial targets)  
✅ Command history persisted to database  
✅ All React components with exceptional visual polish  
✅ OpenAI natural language processing service  
✅ Mock telescope simulator with realistic state  
✅ ASCOM Alpaca REST client  
✅ WebSocket real-time updates (bidirectional)  
✅ Complete API endpoint implementation  
✅ Frontend-backend integration via React Query  
✅ Comprehensive error handling  
✅ End-to-end testing validated  
✅ Dark mode optimized for night vision  

### Completed (Phase 4: Advanced Features)
✅ Automated imaging sequences - Backend infrastructure complete
  - Database schema for sequences and frames
  - Sequence execution engine with pause/resume
  - API endpoints for sequence management
  - Frame-level control (exposure, filter, binning, dithering)
  - Progress tracking and status updates

### In Progress (Phase 4 Continued)
⏳ Imaging sequence frontend UI (planner, templates, monitoring)
⏳ Advanced plate solving for positioning verification  
⏳ Observing session planner with weather integration  
⏳ Multi-mount support for telescope arrays  
⏳ PHD2 integration for autoguiding control  

### Future Enhancements
📋 Export command sequences as scripts  
📋 Cloud storage for imaging sessions  
📋 Mobile app companion  

## Environment Variables

- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI API base URL (auto-configured by Replit)
- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API key (auto-configured by Replit)
- `SESSION_SECRET` - Session encryption key

## Running the Application

The application runs via the "Start application" workflow which executes `npm run dev`:
- Frontend: Vite dev server
- Backend: Express server with WebSocket support
- Both served on the same port (configured in server/vite.ts)

## Future Enhancements

- Automated imaging sequences and scripting
- Advanced plate solving for precise positioning
- Observing session planner with weather integration
- Multi-mount support for telescope arrays
- PHD2 integration for autoguiding
- Export command sequences as scripts
- Cloud storage for imaging sessions
- Mobile app companion
