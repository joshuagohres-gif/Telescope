import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { telescopeSimulator } from "./services/telescope-simulator";
import { 
  ascomTelescope, 
  ascomCamera, 
  ascomFocuser, 
  ascomDiscovery,
  ascomClient // backward compatibility
} from "./services/ascom-client";
import { interpretCommand, executeInterpretedCommand } from "./services/nlp";
import { imagingSequenceExecutor } from "./services/imaging-sequence";
import { registerAstroDbRoutes } from "./astrodb-routes";
import { registerDesignRoutes } from "./design-routes";
import { registerOpsRoutes } from "./ops-routes";
import { registerCalibRoutes } from "./calib-routes";
import { registerTargetsRoutes } from "./targets-routes";
import { registerPlanQaRoutes } from "./planqa-routes";
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

// Get status from ASCOM devices
async function getAscomStatus(): Promise<SystemStatus> {
  try {
    const [telConnected, camConnected, focConnected] = await Promise.all([
      ascomTelescope.isConnected().catch((err) => {
        console.error('[Routes] Telescope isConnected error:', err);
        return false;
      }),
      ascomCamera.isConnected().catch((err) => {
        console.error('[Routes] Camera isConnected error:', err);
        return false;
      }),
      ascomFocuser.isConnected().catch((err) => {
        console.error('[Routes] Focuser isConnected error:', err);
        return false;
      }),
    ]);
    console.log('[Routes] getAscomStatus - telConnected:', telConnected, 'camConnected:', camConnected, 'focConnected:', focConnected);

    // Telescope status
    let telescopeState = {
      connected: telConnected,
      connectionType: "ascom" as const,
      tracking: false,
      slewing: false,
      parked: true,
      position: { ra: 0, dec: 0, alt: 0, az: 0 },
    };

    if (telConnected) {
      const [ra, dec, alt, az, slewing, tracking, parked] = await Promise.all([
        ascomTelescope.getRightAscension().catch(() => 0),
        ascomTelescope.getDeclination().catch(() => 0),
        ascomTelescope.getAltitude().catch(() => 0),
        ascomTelescope.getAzimuth().catch(() => 0),
        ascomTelescope.isSlewing().catch(() => false),
        ascomTelescope.isTracking().catch(() => false),
        ascomTelescope.isParked().catch(() => true),
      ]);

      telescopeState = {
        connected: telConnected,
        connectionType: "ascom",
        tracking,
        slewing,
        parked,
        position: { ra, dec, alt, az },
      };
    }

    // Camera status
    let cameraState = {
      connected: camConnected,
      exposing: false,
      coolerOn: false,
      exposureTime: 30,
      gain: 50,
      binning: 1 as 1 | 2 | 3 | 4,
      progress: 0,
    };

    if (camConnected) {
      const [cameraStateNum, coolerOn, gain, binX, progress] = await Promise.all([
        ascomCamera.getCameraState().catch(() => 0),
        ascomCamera.getCoolerOn().catch(() => false),
        ascomCamera.getGain().catch(() => 50),
        ascomCamera.getBinX().catch(() => 1),
        ascomCamera.getPercentCompleted().catch(() => 0),
      ]);

      const exposing = cameraStateNum === 2; // CameraState.Exposing = 2
      const temperature = await ascomCamera.getCCDTemperature().catch(() => undefined);

      cameraState = {
        connected: camConnected,
        exposing,
        temperature,
        coolerOn,
        exposureTime: 30,
        gain,
        binning: binX as 1 | 2 | 3 | 4,
        progress: exposing ? progress : 0,
      };
    }

    // Focuser status
    let focuserState = {
      connected: focConnected,
      moving: false,
      position: 0,
      maxPosition: 10000,
    };

    if (focConnected) {
      const [position, maxStep, moving] = await Promise.all([
        ascomFocuser.getPosition().catch(() => 0),
        ascomFocuser.getMaxStep().catch(() => 10000),
        ascomFocuser.isMoving().catch(() => false),
      ]);

      const temperature = await ascomFocuser.getTemperature().catch(() => undefined);

      focuserState = {
        connected: focConnected,
        moving,
        position,
        temperature,
        maxPosition: maxStep,
      };
    }

    return {
      telescope: telescopeState,
      camera: cameraState,
      focuser: focuserState,
      calibration: {},
      lastUpdate: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error getting ASCOM status:", error);
    throw error;
  }
}

function startStatusBroadcast() {
  if (statusInterval) return;
  
  statusInterval = setInterval(async () => {
    try {
      const status = activeConnection === "mock" 
        ? telescopeSimulator.getStatus()
        : activeConnection === "ascom"
        ? await getAscomStatus()
        : null;
      
      if (status) {
        broadcastStatus(status);
      }
    } catch (error) {
      console.error("Error broadcasting status:", error);
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

  // Register AstroDB routes (feature-flagged)
  registerAstroDbRoutes(app);
  
  // Register Design KB routes (feature-flagged)
  registerDesignRoutes(app);
  
  // Register Operations & Environment routes (feature-flagged)
  registerOpsRoutes(app);
  
  // Register Calibration routes (feature-flagged)
  registerCalibRoutes(app);
  
  // Register Targets & Alerts routes (feature-flagged)
  registerTargetsRoutes(app);
  
  // Register Planning, QA & Personalization routes (feature-flagged)
  registerPlanQaRoutes(app);

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
        } else if (activeConnection === "ascom") {
          switch (action) {
            case "goto_target":
              // Look up target coordinates
              const target = await storage.getCelestialTargetByName(structuredCommand.target);
              if (target) {
                const canSlewAsync = await ascomTelescope.canSlewAsync().catch(() => false);
                if (canSlewAsync) {
                  await ascomTelescope.slewToCoordinatesAsync(target.ra, target.dec);
                } else {
                  await ascomTelescope.slewToCoordinates(target.ra, target.dec);
                }
                const canSetTracking = await ascomTelescope.canSetTracking().catch(() => false);
                if (canSetTracking) {
                  await ascomTelescope.setTracking(true);
                }
              }
              break;
            
            case "goto_coordinates":
              const canSlewAsync = await ascomTelescope.canSlewAsync().catch(() => false);
              if (canSlewAsync) {
                await ascomTelescope.slewToCoordinatesAsync(structuredCommand.ra, structuredCommand.dec);
              } else {
                await ascomTelescope.slewToCoordinates(structuredCommand.ra, structuredCommand.dec);
              }
              break;
            
            case "track":
              const trackTarget = await storage.getCelestialTargetByName(structuredCommand.target);
              if (trackTarget) {
                const canSlew = await ascomTelescope.canSlewAsync().catch(() => false);
                if (canSlew) {
                  await ascomTelescope.slewToCoordinatesAsync(trackTarget.ra, trackTarget.dec);
                } else {
                  await ascomTelescope.slewToCoordinates(trackTarget.ra, trackTarget.dec);
                }
                const canSetTracking = await ascomTelescope.canSetTracking().catch(() => false);
                if (canSetTracking) {
                  await ascomTelescope.setTracking(true);
                }
              }
              break;
            
            case "stop_tracking":
              const canSetTracking = await ascomTelescope.canSetTracking().catch(() => false);
              if (canSetTracking) {
                await ascomTelescope.setTracking(false);
              }
              break;
            
            case "park":
              const canPark = await ascomTelescope.canPark().catch(() => false);
              if (canPark) {
                await ascomTelescope.park();
              }
              break;
            
            case "home":
              const canFindHome = await ascomTelescope.canFindHome().catch(() => false);
              if (canFindHome) {
                await ascomTelescope.findHome();
              }
              break;
            
            case "capture":
              if (structuredCommand.gain !== undefined) {
                await ascomCamera.setGain(structuredCommand.gain).catch(() => {});
              }
              await ascomCamera.startExposure(structuredCommand.exposureTime, true);
              break;
            
            case "focus":
              const isAbsolute = await ascomFocuser.isAbsolute().catch(() => false);
              if (isAbsolute) {
                const currentPos = await ascomFocuser.getPosition();
                await ascomFocuser.move(currentPos + structuredCommand.steps);
              }
              break;
            
            case "calibrate":
              // ASCOM doesn't have a built-in calibration command
              // This would typically involve plate solving or external tools
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
      console.log('[Routes] Connect request - type:', type);

      if (type !== "mock" && type !== "ascom") {
        return res.status(400).json({ error: "Invalid connection type" });
      }

      activeConnection = type;

      if (type === "mock") {
        telescopeSimulator.connect();
        startStatusBroadcast();
      } else {
        // Connect to all ASCOM devices that are available
        console.log('[Routes] Connecting to ASCOM devices...');
        const results = await Promise.allSettled([
          ascomTelescope.connect(),
          ascomCamera.connect(),
          ascomFocuser.connect(),
        ]);
        console.log('[Routes] Connection results:', results.map((r, i) =>
          ({ device: ['telescope', 'camera', 'focuser'][i], status: r.status, reason: r.status === 'rejected' ? r.reason : 'ok' })
        ));
        startStatusBroadcast();
      }

      res.json({ success: true, type });
    } catch (error: any) {
      console.error('[Routes] Connect error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/telescope/disconnect", async (req, res) => {
    try {
      if (activeConnection === "mock") {
        telescopeSimulator.disconnect();
      } else if (activeConnection === "ascom") {
        // Disconnect all ASCOM devices
        await Promise.allSettled([
          ascomTelescope.disconnect(),
          ascomCamera.disconnect(),
          ascomFocuser.disconnect(),
        ]);
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
        : await getAscomStatus();

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
          // Check if async slewing is supported
          const canSlewAsync = await ascomTelescope.canSlewAsync().catch(() => false);
          if (canSlewAsync) {
            await ascomTelescope.slewToCoordinatesAsync(ra, dec);
          } else {
            // Fall back to synchronous slew if async not supported
            await ascomTelescope.slewToCoordinates(ra, dec);
          }
        } else if (alt !== undefined && az !== undefined) {
          // Check if Alt/Az slewing is supported
          const canSlewAltAzAsync = await ascomTelescope.canSlewAltAzAsync().catch(() => false);
          if (canSlewAltAzAsync) {
            await ascomTelescope.slewToAltAzAsync(alt, az);
          } else {
            const canSlewAltAz = await ascomTelescope.canSlewAltAz().catch(() => false);
            if (canSlewAltAz) {
              await ascomTelescope.slewToAltAz(alt, az);
            } else {
              return res.status(400).json({ error: "Telescope does not support Alt/Az slewing" });
            }
          }
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
      } else if (activeConnection === "ascom") {
        // Map direction to ASCOM axis and rate
        // Axis: 0 = Primary (RA/Az), 1 = Secondary (Dec/Alt)
        // Direction: north/south = Axis 1, east/west = Axis 0
        const axisMap: Record<string, { axis: number; rate: number }> = {
          north: { axis: 1, rate: 1.0 },
          south: { axis: 1, rate: -1.0 },
          east: { axis: 0, rate: 1.0 },
          west: { axis: 0, rate: -1.0 },
        };

        const slewConfig = axisMap[direction];
        if (!slewConfig) {
          return res.status(400).json({ error: "Invalid slew direction" });
        }

        const canMove = await ascomTelescope.canMoveAxis(slewConfig.axis).catch(() => false);
        if (canMove) {
          await ascomTelescope.moveAxis(slewConfig.axis, slewConfig.rate);
        } else {
          return res.status(400).json({ error: `Telescope does not support axis ${slewConfig.axis} movement` });
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('[Routes] /api/telescope/slew error:', error);
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
        // First, check if telescope is parked and unpark if necessary
        const isParked = await ascomTelescope.isParked().catch(() => false);
        if (isParked) {
          const canUnpark = await ascomTelescope.canUnpark().catch(() => false);
          if (canUnpark) {
            await ascomTelescope.unpark();
          }
        }

        // Enable tracking FIRST (required by ASCOM before slewing)
        const canSetTracking = await ascomTelescope.canSetTracking().catch(() => false);
        if (canSetTracking) {
          await ascomTelescope.setTracking(true);
        }

        // Then slew to target
        const canSlewAsync = await ascomTelescope.canSlewAsync().catch(() => false);
        if (canSlewAsync) {
          await ascomTelescope.slewToCoordinatesAsync(celestialTarget.ra, celestialTarget.dec);
        } else {
          await ascomTelescope.slewToCoordinates(celestialTarget.ra, celestialTarget.dec);
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('[Routes] /api/telescope/track error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/telescope/stop-tracking", async (req, res) => {
    try {
      if (activeConnection === "mock") {
        telescopeSimulator.stopTracking();
      } else if (activeConnection === "ascom") {
        const canSetTracking = await ascomTelescope.canSetTracking().catch(() => false);
        if (canSetTracking) {
          await ascomTelescope.setTracking(false);
        } else {
          return res.status(400).json({ error: "Telescope does not support tracking control" });
        }
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
        const canPark = await ascomTelescope.canPark().catch(() => false);
        if (canPark) {
          await ascomTelescope.park();
        } else {
          return res.status(400).json({ error: "Telescope does not support parking" });
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/telescope/unpark", async (req, res) => {
    try {
      if (activeConnection === "mock") {
        // Mock simulator doesn't have explicit unpark, just move out of parked state
        telescopeSimulator.home();
      } else if (activeConnection === "ascom") {
        const canUnpark = await ascomTelescope.canUnpark().catch(() => false);
        if (canUnpark) {
          await ascomTelescope.unpark();
        } else {
          return res.status(400).json({ error: "Telescope does not support unparking" });
        }
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
        const canFindHome = await ascomTelescope.canFindHome().catch(() => false);
        if (canFindHome) {
          await ascomTelescope.findHome();
        } else {
          return res.status(400).json({ error: "Telescope does not support finding home" });
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('[Routes] /api/telescope/home error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/telescope/emergency-stop", async (req, res) => {
    try {
      if (activeConnection === "mock") {
        telescopeSimulator.emergencyStop();
      } else if (activeConnection === "ascom") {
        // Abort any slewing
        await ascomTelescope.abortSlew().catch(() => {});
        
        // Stop any axis movement
        await Promise.allSettled([
          ascomTelescope.moveAxis(0, 0),
          ascomTelescope.moveAxis(1, 0),
        ]);
        
        // Disable tracking if supported
        const canSetTracking = await ascomTelescope.canSetTracking().catch(() => false);
        if (canSetTracking) {
          await ascomTelescope.setTracking(false);
        }
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
      } else if (activeConnection === "ascom") {
        // Set camera parameters
        if (gain !== undefined) {
          await ascomCamera.setGain(gain).catch(() => {});
        }
        if (binning !== undefined) {
          await ascomCamera.setBinX(binning).catch(() => {});
          await ascomCamera.setBinY(binning).catch(() => {});
        }
        
        // Start exposure (true = light frame)
        await ascomCamera.startExposure(exposureTime, true);
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
      } else if (activeConnection === "ascom") {
        const canAbort = await ascomCamera.canAbortExposure().catch(() => false);
        if (canAbort) {
          await ascomCamera.abortExposure();
        } else {
          const canStop = await ascomCamera.canStopExposure().catch(() => false);
          if (canStop) {
            await ascomCamera.stopExposure();
          } else {
            return res.status(400).json({ error: "Camera does not support aborting exposure" });
          }
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/camera/cooler", async (req, res) => {
    try {
      const { enabled, temperature } = req.body;

      if (activeConnection === "ascom") {
        if (temperature !== undefined) {
          const canSetTemp = await ascomCamera.canSetCCDTemperature().catch(() => false);
          if (canSetTemp) {
            await ascomCamera.setCCDTemperature(temperature);
          }
        }
        if (enabled !== undefined) {
          await ascomCamera.setCoolerOn(enabled);
        }
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
      } else if (activeConnection === "ascom") {
        const isAbsolute = await ascomFocuser.isAbsolute().catch(() => false);
        
        if (action === "move_absolute" && position !== undefined) {
          if (isAbsolute) {
            await ascomFocuser.move(position);
          } else {
            return res.status(400).json({ error: "Focuser does not support absolute positioning" });
          }
        } else if (action === "move_relative" && steps !== undefined) {
          if (isAbsolute) {
            // For absolute focusers, calculate new position
            const currentPos = await ascomFocuser.getPosition();
            await ascomFocuser.move(currentPos + steps);
          } else {
            return res.status(400).json({ error: "Relative focuser not yet supported" });
          }
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/focuser/halt", async (req, res) => {
    try {
      if (activeConnection === "ascom") {
        const canHalt = await ascomFocuser.canHalt().catch(() => false);
        if (canHalt) {
          await ascomFocuser.halt();
        } else {
          return res.status(400).json({ error: "Focuser does not support halt" });
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

  // ===== Device Discovery =====

  app.get("/api/ascom/discover", async (req, res) => {
    try {
      const devices = await ascomDiscovery.discoverDevices();
      res.json(devices);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/ascom/server-info", async (req, res) => {
    try {
      const info = await ascomDiscovery.getServerInfo();
      res.json(info);
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

  // IMPORTANT: /active route must come before /:id to avoid Express treating "active" as an ID
  app.get("/api/sequences/active", async (req, res) => {
    const activeSequence = imagingSequenceExecutor.getActiveSequence();
    const progress = imagingSequenceExecutor.getCurrentProgress();
    
    if (!activeSequence) {
      return res.status(404).json({ error: "No active sequence" });
    }

    // Return formatted response matching frontend expectations
    res.json({
      sequenceId: activeSequence.id,
      name: activeSequence.name,
      targetName: activeSequence.targetName,
      status: activeSequence.status,
      completedFrames: activeSequence.completedFrames,
      totalFrames: activeSequence.totalFrames,
      estimatedDuration: activeSequence.estimatedDuration,
      currentFrame: progress?.currentFrame || 0,
    });
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

  return httpServer;
}
