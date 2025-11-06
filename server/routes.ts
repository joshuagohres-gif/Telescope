import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { telescopeSimulator } from "./services/telescope-simulator";
import { ascomClient } from "./services/ascom-client";
import { interpretCommand, executeInterpretedCommand } from "./services/nlp";
import { imagingSequenceExecutor } from "./services/imaging-sequence";
import type { SystemStatus } from "@shared/schema";

// Active telescope connection
let activeConnection: "mock" | "ascom" | null = null;

// WebSocket clients
const wsClients = new Set<WebSocket>();

// Broadcast status to all connected clients
function broadcastStatus(status: SystemStatus) {
  const message = JSON.stringify({ type: "status", data: status });
  wsClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Status update interval
let statusInterval: NodeJS.Timeout | null = null;

function startStatusBroadcast() {
  if (statusInterval) return;
  
  statusInterval = setInterval(() => {
    const status = activeConnection === "mock" 
      ? telescopeSimulator.getStatus()
      : null; // ASCOM status would be fetched here
    
    if (status) {
      broadcastStatus(status);
    }
  }, 500); // Broadcast every 500ms
}

function stopStatusBroadcast() {
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server (on distinct path to not conflict with Vite HMR)
  // Reference: javascript_websocket blueprint
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    wsClients.add(ws);
    console.log('WebSocket client connected');

    // Send current status immediately on connection
    if (activeConnection === "mock") {
      const status = telescopeSimulator.getStatus();
      ws.send(JSON.stringify({ type: "status", data: status }));
    }

    ws.on('close', () => {
      wsClients.delete(ws);
      console.log('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      wsClients.delete(ws);
    });
  });

  // ===== Commands =====
  
  app.post("/api/commands/execute", async (req, res) => {
    try {
      const { naturalLanguage } = req.body;
      
      if (!naturalLanguage) {
        return res.status(400).json({ error: "Natural language command required" });
      }

      // Create command record
      const command = await storage.createCommand({
        naturalLanguage,
        structuredCommand: "",
        status: "executing",
        result: null,
        isFavorite: false,
      });

      // Interpret command with NLP
      const nlpResult = await interpretCommand(naturalLanguage);
      
      // Execute the interpreted command
      try {
        const structuredCommand = await executeInterpretedCommand(nlpResult);
        
        // Update command with structured version
        command.structuredCommand = JSON.stringify(structuredCommand);
        await storage.updateCommandStatus(command.id, "completed", JSON.stringify({ success: true }));

        // Execute based on action type
        const action = structuredCommand.action;
        
        if (activeConnection === "mock") {
          switch (action) {
            case "goto_target":
              // Look up target coordinates
              const target = await storage.getCelestialTargetByName(structuredCommand.target);
              if (target) {
                await telescopeSimulator.gotoCoordinates(target.ra, target.dec);
                telescopeSimulator.startTracking(target.name);
              }
              break;
            
            case "goto_coordinates":
              await telescopeSimulator.gotoCoordinates(structuredCommand.ra, structuredCommand.dec);
              break;
            
            case "track":
              const trackTarget = await storage.getCelestialTargetByName(structuredCommand.target);
              if (trackTarget) {
                await telescopeSimulator.gotoCoordinates(trackTarget.ra, trackTarget.dec);
                telescopeSimulator.startTracking(trackTarget.name);
              }
              break;
            
            case "stop_tracking":
              telescopeSimulator.stopTracking();
              break;
            
            case "park":
              telescopeSimulator.park();
              break;
            
            case "home":
              telescopeSimulator.home();
              break;
            
            case "capture":
              await telescopeSimulator.startExposure(
                structuredCommand.exposureTime,
                structuredCommand.gain,
                1
              );
              break;
            
            case "focus":
              await telescopeSimulator.moveFocuser(structuredCommand.steps);
              break;
            
            case "calibrate":
              telescopeSimulator.startPolarAlignment();
              break;
          }
        }

        res.json({ success: true, command, nlpResult });
      } catch (execError: any) {
        await storage.updateCommandStatus(command.id, "failed", execError.message);
        throw execError;
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/commands/history", async (req, res) => {
    const commands = await storage.getCommandHistory();
    res.json(commands);
  });

  app.post("/api/commands/:id/favorite", async (req, res) => {
    const { id } = req.params;
    await storage.toggleCommandFavorite(id);
    res.json({ success: true });
  });

  app.delete("/api/commands/history", async (req, res) => {
    await storage.clearCommandHistory();
    res.json({ success: true });
  });

  // ===== Telescope Control =====

  app.post("/api/telescope/connect", async (req, res) => {
    try {
      const { type } = req.body;
      
      if (type !== "mock" && type !== "ascom") {
        return res.status(400).json({ error: "Invalid connection type" });
      }

      activeConnection = type;

      if (type === "mock") {
        telescopeSimulator.connect();
        startStatusBroadcast();
      } else {
        await ascomClient.connect();
        startStatusBroadcast();
      }

      res.json({ success: true, type });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/telescope/disconnect", async (req, res) => {
    try {
      if (activeConnection === "mock") {
        telescopeSimulator.disconnect();
      } else if (activeConnection === "ascom") {
        await ascomClient.disconnect();
      }

      activeConnection = null;
      stopStatusBroadcast();

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/telescope/status", async (req, res) => {
    try {
      if (!activeConnection) {
        return res.json({
          telescope: {
            connected: false,
            connectionType: "mock",
            tracking: false,
            slewing: false,
            parked: true,
            position: { ra: 0, dec: 0, alt: 0, az: 0 },
          },
          camera: {
            connected: false,
            exposing: false,
            coolerOn: false,
            exposureTime: 30,
            gain: 50,
            binning: 1,
            progress: 0,
          },
          focuser: {
            connected: false,
            moving: false,
            position: 0,
            maxPosition: 10000,
          },
          calibration: {},
          lastUpdate: new Date().toISOString(),
        });
      }

      const status = activeConnection === "mock"
        ? telescopeSimulator.getStatus()
        : await ascomClient.getStatus();

      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/telescope/goto", async (req, res) => {
    try {
      const { ra, dec, alt, az } = req.body;

      if (activeConnection === "mock") {
        if (ra !== undefined && dec !== undefined) {
          await telescopeSimulator.gotoCoordinates(ra, dec);
        } else if (alt !== undefined && az !== undefined) {
          // For simplicity, mock simulator primarily uses RA/Dec
          // In a real implementation, you'd convert alt/az to RA/Dec
          await telescopeSimulator.gotoCoordinates(az / 15, alt - 45);
        }
      } else if (activeConnection === "ascom") {
        if (ra !== undefined && dec !== undefined) {
          await ascomClient.slewToCoordinatesAsync(ra, dec);
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/telescope/slew", async (req, res) => {
    try {
      const { direction } = req.body;

      if (activeConnection === "mock") {
        await telescopeSimulator.slew(direction);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/telescope/track", async (req, res) => {
    try {
      const { target } = req.body;

      // Look up target
      const celestialTarget = await storage.getCelestialTargetByName(target);
      if (!celestialTarget) {
        return res.status(404).json({ error: "Target not found" });
      }

      if (activeConnection === "mock") {
        await telescopeSimulator.gotoCoordinates(celestialTarget.ra, celestialTarget.dec);
        telescopeSimulator.startTracking(celestialTarget.name);
      } else if (activeConnection === "ascom") {
        await ascomClient.slewToCoordinatesAsync(celestialTarget.ra, celestialTarget.dec);
        await ascomClient.setTracking(true);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/telescope/stop-tracking", async (req, res) => {
    try {
      if (activeConnection === "mock") {
        telescopeSimulator.stopTracking();
      } else if (activeConnection === "ascom") {
        await ascomClient.setTracking(false);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/telescope/park", async (req, res) => {
    try {
      if (activeConnection === "mock") {
        telescopeSimulator.park();
      } else if (activeConnection === "ascom") {
        await ascomClient.park();
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/telescope/home", async (req, res) => {
    try {
      if (activeConnection === "mock") {
        telescopeSimulator.home();
      } else if (activeConnection === "ascom") {
        await ascomClient.findHome();
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/telescope/emergency-stop", async (req, res) => {
    try {
      if (activeConnection === "mock") {
        telescopeSimulator.emergencyStop();
      } else if (activeConnection === "ascom") {
        await ascomClient.abortSlew();
        await ascomClient.setTracking(false);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== Camera Control =====

  app.post("/api/camera/capture", async (req, res) => {
    try {
      const { exposureTime, gain, binning } = req.body;

      if (activeConnection === "mock") {
        await telescopeSimulator.startExposure(exposureTime, gain, binning);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/camera/abort", async (req, res) => {
    try {
      if (activeConnection === "mock") {
        telescopeSimulator.abortExposure();
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== Focuser Control =====

  app.post("/api/focuser/move", async (req, res) => {
    try {
      const { action, position, steps } = req.body;

      if (activeConnection === "mock") {
        if (action === "move_absolute" && position !== undefined) {
          await telescopeSimulator.moveFocuserAbsolute(position);
        } else if (action === "move_relative" && steps !== undefined) {
          await telescopeSimulator.moveFocuser(steps);
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== Calibration =====

  app.post("/api/calibration/start-polar-alignment", async (req, res) => {
    try {
      if (activeConnection === "mock") {
        telescopeSimulator.startPolarAlignment();
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/calibration/complete-polar-alignment", async (req, res) => {
    try {
      const { azCorrection, altCorrection } = req.body;

      if (activeConnection === "mock") {
        telescopeSimulator.completePolarAlignment(azCorrection, altCorrection);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/calibration/plate-solve", async (req, res) => {
    try {
      if (activeConnection === "mock") {
        telescopeSimulator.plateSolve();
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== Celestial Targets =====

  app.get("/api/targets", async (req, res) => {
    const targets = await storage.getCelestialTargets();
    res.json(targets);
  });

  // ===== Imaging Sequences =====

  app.post("/api/sequences", async (req, res) => {
    try {
      const sequence = await storage.createImagingSequence(req.body);
      res.json(sequence);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sequences", async (req, res) => {
    const sequences = await storage.getImagingSequences();
    res.json(sequences);
  });

  app.get("/api/sequences/:id", async (req, res) => {
    const sequence = await storage.getImagingSequence(req.params.id);
    if (!sequence) {
      return res.status(404).json({ error: "Sequence not found" });
    }
    res.json(sequence);
  });

  app.delete("/api/sequences/:id", async (req, res) => {
    await storage.deleteImagingSequence(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/sequences/:id/frames", async (req, res) => {
    try {
      const frame = await storage.createImagingSequenceFrame({
        ...req.body,
        sequenceId: req.params.id
      });
      res.json(frame);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sequences/:id/frames", async (req, res) => {
    const frames = await storage.getImagingSequenceFrames(req.params.id);
    res.json(frames);
  });

  app.post("/api/sequences/:id/start", async (req, res) => {
    try {
      await imagingSequenceExecutor.startSequence(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sequences/pause", async (req, res) => {
    try {
      await imagingSequenceExecutor.pauseSequence();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sequences/resume", async (req, res) => {
    try {
      await imagingSequenceExecutor.resumeSequence();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sequences/stop", async (req, res) => {
    try {
      await imagingSequenceExecutor.stopSequence();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sequences/active", async (req, res) => {
    const active = imagingSequenceExecutor.getActiveSequence();
    const progress = imagingSequenceExecutor.getCurrentProgress();
    res.json({ sequence: active, progress });
  });

  return httpServer;
}
