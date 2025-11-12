import type {
  TelescopeState,
  CameraState,
  FocuserState,
  CalibrationData,
  SystemStatus
} from "@shared/schema";
import { raDecToAltAz } from "../lib/astro/altaz";

export class TelescopeSimulator {
  private telescopeState: TelescopeState;
  private cameraState: CameraState;
  private focuserState: FocuserState;
  private calibrationData: CalibrationData;

  private slewInterval: NodeJS.Timeout | null = null;
  private exposureInterval: NodeJS.Timeout | null = null;
  private focusInterval: NodeJS.Timeout | null = null;
  private trackingInterval: NodeJS.Timeout | null = null;

  // Observer location (default: San Francisco area)
  private observerLat: number = 37.7749;
  private observerLon: number = -122.4194;

  constructor() {
    this.telescopeState = {
      connected: false,
      connectionType: "mock",
      tracking: false,
      slewing: false,
      parked: true,
      position: {
        ra: 0,
        dec: 0,
        alt: 45,
        az: 180,
      },
      slewRate: 2,
      pierSide: "unknown",
    };

    this.cameraState = {
      connected: false,
      exposing: false,
      temperature: -10,
      coolerOn: false,
      exposureTime: 30,
      gain: 50,
      binning: 1,
      progress: 0,
    };

    this.focuserState = {
      connected: false,
      moving: false,
      position: 5000,
      temperature: 15,
      maxPosition: 10000,
    };

    this.calibrationData = {
      polarAlignmentError: 8.5,
      polarAlignmentAz: 0.5,
      polarAlignmentAlt: -0.3,
      lastCalibration: new Date().toISOString(),
    };
  }

  connect(): void {
    this.telescopeState.connected = true;
    this.cameraState.connected = true;
    this.focuserState.connected = true;
  }

  disconnect(): void {
    this.telescopeState.connected = false;
    this.cameraState.connected = false;
    this.focuserState.connected = false;
    this.stopAllMotion();
  }

  getStatus(): SystemStatus {
    return {
      telescope: { ...this.telescopeState },
      camera: { ...this.cameraState },
      focuser: { ...this.focuserState },
      calibration: { ...this.calibrationData },
      lastUpdate: new Date().toISOString(),
    };
  }

  // Telescope Control
  async gotoCoordinates(ra: number, dec: number): Promise<void> {
    if (!this.telescopeState.connected) {
      throw new Error("Telescope not connected");
    }

    this.telescopeState.slewing = true;
    this.telescopeState.parked = false;

    // Calculate target Alt/Az
    const targetAltAz = raDecToAltAz(
      ra * 15, // Convert RA hours to degrees
      dec,
      this.observerLat,
      this.observerLon,
      new Date()
    );

    this.telescopeState.targetPosition = {
      ra,
      dec,
      alt: targetAltAz.alt,
      az: targetAltAz.az
    };

    // Simulate slew (3 seconds)
    this.slewInterval = setTimeout(() => {
      this.telescopeState.position.ra = ra;
      this.telescopeState.position.dec = dec;
      this.updateAltAz(); // Update Alt/Az after slew
      this.telescopeState.slewing = false;
      this.slewInterval = null;
    }, 3000);
  }

  async slew(direction: string): Promise<void> {
    if (!this.telescopeState.connected) {
      throw new Error("Telescope not connected");
    }

    const rate = this.telescopeState.slewRate || 2;
    const delta = rate * 0.1;

    switch (direction) {
      case "north":
        this.telescopeState.position.dec = Math.min(90, this.telescopeState.position.dec + delta);
        break;
      case "south":
        this.telescopeState.position.dec = Math.max(-90, this.telescopeState.position.dec - delta);
        break;
      case "east":
        this.telescopeState.position.ra = (this.telescopeState.position.ra + delta) % 24;
        break;
      case "west":
        this.telescopeState.position.ra = (this.telescopeState.position.ra - delta + 24) % 24;
        break;
    }

    this.updateAltAz(); // Recalculate Alt/Az after manual slew
    this.telescopeState.parked = false;
  }

  startTracking(target?: string): void {
    if (!this.telescopeState.connected) {
      throw new Error("Telescope not connected");
    }

    this.telescopeState.tracking = true;
    this.telescopeState.parked = false;
    if (target) {
      this.telescopeState.currentTarget = target;
    }

    // Start tracking update loop
    // When tracking, RA/Dec stay constant (telescope follows the celestial coordinates)
    // Only Alt/Az changes as Earth rotates and the horizon moves
    // Update every 100ms for smooth Alt/Az updates
    const UPDATE_INTERVAL_MS = 100;

    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
    }

    this.trackingInterval = setInterval(() => {
      if (this.telescopeState.tracking) {
        // RA/Dec stay constant - telescope is tracking the same celestial coordinates
        // Only update Alt/Az as Earth rotates
        this.updateAltAz();
      }
    }, UPDATE_INTERVAL_MS);
  }

  stopTracking(): void {
    this.telescopeState.tracking = false;
    this.telescopeState.currentTarget = undefined;

    // Stop tracking interval
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
  }

  park(): void {
    if (!this.telescopeState.connected) {
      throw new Error("Telescope not connected");
    }

    this.telescopeState.slewing = true;
    this.telescopeState.tracking = false;

    // Simulate park (2 seconds)
    setTimeout(() => {
      this.telescopeState.position.alt = 45;
      this.telescopeState.position.az = 180;
      this.telescopeState.slewing = false;
      this.telescopeState.parked = true;
    }, 2000);
  }

  home(): void {
    if (!this.telescopeState.connected) {
      throw new Error("Telescope not connected");
    }

    this.telescopeState.slewing = true;
    this.telescopeState.parked = false;

    setTimeout(() => {
      this.telescopeState.position.ra = 0;
      this.telescopeState.position.dec = 90;
      this.telescopeState.position.alt = 90;
      this.telescopeState.position.az = 0;
      this.telescopeState.slewing = false;
    }, 2000);
  }

  emergencyStop(): void {
    this.stopAllMotion();
    this.telescopeState.tracking = false;
  }

  // Camera Control
  async startExposure(exposureTime: number, gain: number, binning: number): Promise<void> {
    if (!this.cameraState.connected) {
      throw new Error("Camera not connected");
    }

    if (this.cameraState.exposing) {
      throw new Error("Exposure already in progress");
    }

    this.cameraState.exposing = true;
    this.cameraState.exposureTime = exposureTime;
    this.cameraState.gain = gain;
    this.cameraState.binning = binning as 1 | 2 | 3 | 4;
    this.cameraState.progress = 0;

    // Simulate exposure progress
    const totalSteps = 100;
    const stepDuration = (exposureTime * 1000) / totalSteps;

    let currentStep = 0;
    this.exposureInterval = setInterval(() => {
      currentStep++;
      this.cameraState.progress = (currentStep / totalSteps) * 100;

      if (currentStep >= totalSteps) {
        this.cameraState.exposing = false;
        this.cameraState.progress = 0;
        if (this.exposureInterval) {
          clearInterval(this.exposureInterval);
          this.exposureInterval = null;
        }
      }
    }, stepDuration);
  }

  abortExposure(): void {
    if (this.exposureInterval) {
      clearInterval(this.exposureInterval);
      this.exposureInterval = null;
    }
    this.cameraState.exposing = false;
    this.cameraState.progress = 0;
  }

  // Focuser Control
  async moveFocuser(steps: number): Promise<void> {
    if (!this.focuserState.connected) {
      throw new Error("Focuser not connected");
    }

    this.focuserState.moving = true;
    const newPosition = Math.max(0, Math.min(this.focuserState.maxPosition, this.focuserState.position + steps));

    // Simulate movement (1 second)
    this.focusInterval = setTimeout(() => {
      this.focuserState.position = newPosition;
      this.focuserState.moving = false;
      this.focusInterval = null;
    }, 1000);
  }

  async moveFocuserAbsolute(position: number): Promise<void> {
    const steps = position - this.focuserState.position;
    return this.moveFocuser(steps);
  }

  // Calibration
  startPolarAlignment(): void {
    // Just mark that calibration has started
    this.calibrationData.lastCalibration = new Date().toISOString();
  }

  completePolarAlignment(azCorrection: number, altCorrection: number): void {
    this.calibrationData.polarAlignmentAz = azCorrection;
    this.calibrationData.polarAlignmentAlt = altCorrection;
    
    // Calculate new error based on corrections (simplified)
    const errorReduction = Math.abs(azCorrection) + Math.abs(altCorrection);
    this.calibrationData.polarAlignmentError = Math.max(0.5, 
      (this.calibrationData.polarAlignmentError || 10) - errorReduction * 2
    );
    
    this.calibrationData.lastCalibration = new Date().toISOString();
  }

  plateSolve(): void {
    // Simulate plate solving - just update calibration timestamp
    this.calibrationData.lastCalibration = new Date().toISOString();
  }

  private updateAltAz(): void {
    // Calculate Alt/Az from current RA/Dec
    const altAz = raDecToAltAz(
      this.telescopeState.position.ra * 15, // Convert RA hours to degrees
      this.telescopeState.position.dec,
      this.observerLat,
      this.observerLon,
      new Date()
    );

    this.telescopeState.position.alt = altAz.alt;
    this.telescopeState.position.az = altAz.az;
  }

  private stopAllMotion(): void {
    if (this.slewInterval) {
      clearTimeout(this.slewInterval);
      this.slewInterval = null;
    }
    if (this.exposureInterval) {
      clearInterval(this.exposureInterval);
      this.exposureInterval = null;
    }
    if (this.focusInterval) {
      clearTimeout(this.focusInterval);
      this.focusInterval = null;
    }
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }

    this.telescopeState.slewing = false;
    this.cameraState.exposing = false;
    this.cameraState.progress = 0;
    this.focuserState.moving = false;
  }
}

// Singleton instance
export const telescopeSimulator = new TelescopeSimulator();
