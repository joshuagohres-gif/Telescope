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
├── storage.ts        # In-memory data store
├── services/
│   ├── nlp.ts        # OpenAI command interpretation
│   ├── telescope.ts  # Mock simulator + ASCOM client
│   ├── camera.ts     # Camera control
│   └── focuser.ts    # Focus control
```

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

## Development Status

### Completed (Phase 1: Schema & Frontend)
✅ Complete data model and TypeScript interfaces  
✅ Design tokens and color scheme configuration  
✅ All React components with exceptional visual polish  
✅ Command input with natural language processing UI  
✅ Telescope viewport with real-time position display  
✅ Position, tracking, camera, focus, and calibration controls  
✅ Real-time status dashboard with color-coded indicators  
✅ Command history with favorites  
✅ Connection toggle (ASCOM/Mock)  
✅ Emergency stop and park controls  
✅ Dark mode optimized for night vision  
✅ Responsive layout for desktop and tablet  

### In Progress (Phase 2: Backend)
⏳ OpenAI natural language processing service  
⏳ Mock telescope simulator  
⏳ ASCOM Alpaca REST client  
⏳ WebSocket real-time updates  
⏳ API endpoint implementation  
⏳ Command execution engine  

### Planned (Phase 3: Integration & Polish)
📋 Connect frontend to backend APIs  
📋 WebSocket client integration  
📋 Error handling and loading states  
📋 End-to-end testing  
📋 Architect review  
📋 Final polish and optimizations  

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
