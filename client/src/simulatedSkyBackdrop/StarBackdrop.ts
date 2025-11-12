/**
 * StarBackdrop: Main controller for simulated sky visualization
 * Public API for integrating real star positions into the telescope interface
 */

import { SceneHost } from './renderer/SceneHost';
import { SkyDome } from './renderer/SkyDome';
import { StarLayer } from './renderer/StarLayer';
import { PlanetLayer } from './renderer/PlanetLayer';
import { MoonLayer } from './renderer/MoonLayer';
import { SunLayer } from './renderer/SunLayer';

export interface StarBackdropConfig {
  /**
   * Container element to attach canvas to
   */
  container: HTMLElement;

  /**
   * Observer's latitude in degrees (positive North)
   */
  latitude: number;

  /**
   * Observer's longitude in degrees (positive East)
   */
  longitude: number;

  /**
   * Initial observation time (defaults to current time)
   */
  time?: Date;

  /**
   * Canvas width (defaults to container width)
   */
  width?: number;

  /**
   * Canvas height (defaults to container height)
   */
  height?: number;

  /**
   * Enable antialiasing
   */
  antialias?: boolean;

  /**
   * Star point size scale
   */
  starScale?: number;

  /**
   * Planet size scale (multiplier for true angular sizes, default 1.0)
   */
  planetScale?: number;

  /**
   * Apply atmospheric refraction
   */
  applyRefraction?: boolean;

  /**
   * Auto-update time (updates star positions in real-time)
   */
  autoUpdateTime?: boolean;

  /**
   * Initial camera yaw (radians, 0 = North)
   */
  initialYaw?: number;

  /**
   * Initial camera pitch (radians, 0 = horizon, π/2 = zenith)
   */
  initialPitch?: number;

  /**
   * Minimum safe altitude in degrees (horizon safety boundary, default 10°)
   */
  minSafeAltitude?: number;

  /**
   * Maximum slew rate for altitude axis (deg/s, default 5°/s)
   */
  maxAltitudeRate?: number;

  /**
   * Maximum slew rate for azimuth axis (deg/s, default 10°/s)
   */
  maxAzimuthRate?: number;
}

/**
 * Slew path segment - represents one phase of a multi-phase slew
 */
interface SlewSegment {
  startAlt: number;
  endAlt: number;
  startAz: number;
  endAz: number;
  duration: number; // milliseconds
}

export class StarBackdrop {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private sceneHost: SceneHost;
  private skyDome: SkyDome;
  private starLayer: StarLayer;
  private planetLayer: PlanetLayer;
  private moonLayer: MoonLayer;
  private sunLayer: SunLayer;

  private config: Required<Omit<StarBackdropConfig, 'container' | 'width' | 'height'>>;
  private autoUpdateInterval: number | null = null;

  // Mount parameters (for time-optimal slewing)
  private minSafeAltitude: number = 10; // degrees
  private maxAltitudeRate: number = 5; // deg/s
  private maxAzimuthRate: number = 10; // deg/s
  private epsilon: number = 0.5; // safety margin in degrees

  // Slewing animation state
  private isSlewing: boolean = false;
  private currentAlt: number = 0; // degrees (initialized from config)
  private currentAz: number = 0; // degrees (initialized from config)
  private targetAlt: number = 0;
  private targetAz: number = 0;

  // Multi-segment slew path
  private slewPath: SlewSegment[] = [];
  private currentSegmentIndex: number = 0;
  private segmentStartTime: number = 0;
  private animationFrameId: number | null = null;

  constructor(config: StarBackdropConfig) {
    this.container = config.container;

    // Fill in defaults
    this.config = {
      latitude: config.latitude,
      longitude: config.longitude,
      time: config.time ?? new Date(),
      antialias: config.antialias ?? true,
      starScale: config.starScale ?? 2.0,
      planetScale: config.planetScale ?? 1.0,
      applyRefraction: config.applyRefraction ?? true,
      autoUpdateTime: config.autoUpdateTime ?? false,
      initialYaw: config.initialYaw ?? 0,
      initialPitch: config.initialPitch ?? Math.PI / 4, // 45° up
      minSafeAltitude: config.minSafeAltitude ?? 10,
      maxAltitudeRate: config.maxAltitudeRate ?? 5,
      maxAzimuthRate: config.maxAzimuthRate ?? 10,
    };

    // Set mount parameters from config
    this.minSafeAltitude = this.config.minSafeAltitude;
    this.maxAltitudeRate = this.config.maxAltitudeRate;
    this.maxAzimuthRate = this.config.maxAzimuthRate;

    // Initialize current position from initial camera orientation
    this.currentAlt = this.config.initialPitch * (180 / Math.PI); // radians to degrees
    this.currentAz = this.config.initialYaw * (180 / Math.PI); // radians to degrees
    this.targetAlt = this.currentAlt;
    this.targetAz = this.currentAz;

    // Create canvas
    this.canvas = this.createCanvas(config.width, config.height);
    this.container.appendChild(this.canvas);

    // Initialize WebGL scene
    this.sceneHost = new SceneHost({
      canvas: this.canvas,
      enableAntialias: this.config.antialias,
    });

    const gl = this.sceneHost.getContext();
    if (!gl) {
      throw new Error('Failed to initialize WebGL2 context');
    }

    // Create render layers
    this.skyDome = new SkyDome(gl);
    this.starLayer = new StarLayer(gl, {
      latitude: this.config.latitude,
      longitude: this.config.longitude,
      time: this.config.time,
      pointScale: this.config.starScale,
      applyRefraction: this.config.applyRefraction,
    });
    this.planetLayer = new PlanetLayer(gl, {
      latitude: this.config.latitude,
      longitude: this.config.longitude,
      time: this.config.time,
      planetScale: this.config.planetScale,
      applyRefraction: this.config.applyRefraction,
    });
    this.sunLayer = new SunLayer(gl, {
      latitude: this.config.latitude,
      longitude: this.config.longitude,
      time: this.config.time,
      applyRefraction: this.config.applyRefraction,
    });
    this.moonLayer = new MoonLayer(gl, {
      latitude: this.config.latitude,
      longitude: this.config.longitude,
      time: this.config.time,
      applyRefraction: this.config.applyRefraction,
    });

    // Add layers to scene (order matters: sky first, stars, then planets, then Sun and Moon on top)
    this.sceneHost.addLayer(this.skyDome);
    this.sceneHost.addLayer(this.starLayer);
    this.sceneHost.addLayer(this.planetLayer);
    this.sceneHost.addLayer(this.sunLayer);
    this.sceneHost.addLayer(this.moonLayer);

    // Set initial camera orientation
    this.sceneHost.setCameraOrientation(
      this.config.initialYaw,
      this.config.initialPitch
    );

    // Start rendering
    this.sceneHost.start();

    // Start auto-update if enabled
    if (this.config.autoUpdateTime) {
      this.startAutoUpdate();
    }
  }

  /**
   * Update observer location
   */
  setLocation(latitude: number, longitude: number): void {
    this.config.latitude = latitude;
    this.config.longitude = longitude;
    this.starLayer.updateObserver(latitude, longitude, this.config.time);
    this.planetLayer.updateObserver(latitude, longitude, this.config.time);
    this.sunLayer.updateConfig({ latitude, longitude });
    this.moonLayer.updateConfig({ latitude, longitude });
  }

  /**
   * Update observation time
   */
  setTime(time: Date): void {
    this.config.time = time;
    this.starLayer.updateObserver(
      this.config.latitude,
      this.config.longitude,
      time
    );
    this.planetLayer.updateObserver(
      this.config.latitude,
      this.config.longitude,
      time
    );
    this.sunLayer.updateConfig({ time });
    this.moonLayer.updateConfig({ time });
  }

  /**
   * Set camera orientation
   * @param yaw Camera yaw in radians (0 = North, π/2 = East, π = South, 3π/2 = West)
   * @param pitch Camera pitch in radians (0 = horizon, π/2 = zenith, -π/2 = nadir)
   */
  setCameraOrientation(yaw: number, pitch: number): void {
    this.sceneHost.setCameraOrientation(yaw, pitch);
  }

  /**
   * Set field of view
   * @param fovDegrees Field of view in degrees (10-120)
   */
  setFieldOfView(fovDegrees: number): void {
    this.sceneHost.setFieldOfView(fovDegrees);
  }

  /**
   * Point camera at specific Alt/Az coordinates with smooth, time-optimal animation
   * Uses the "super-simple policy" from the slew planning guide:
   * - Raise to safe overhead altitude
   * - Rotate azimuth while maintaining safe altitude
   * - Lower to target altitude
   *
   * @param altitude Altitude in degrees (-90 to 90)
   * @param azimuth Azimuth in degrees (0 = North, 90 = East, 180 = South, 270 = West)
   */
  pointAtAltAz(altitude: number, azimuth: number): void {
    console.log(`[StarBackdrop] pointAtAltAz called: alt=${altitude.toFixed(2)}°, az=${azimuth.toFixed(2)}°`);

    // Set new target position
    this.targetAlt = altitude;
    this.targetAz = azimuth;

    // Plan and start slewing animation
    this.planAndExecuteSlew();
  }

  /**
   * Update target position smoothly without restarting the slew animation
   * This is better for continuous tracking when the telescope position is updated frequently
   *
   * @param altitude Target altitude in degrees (-90 to 90)
   * @param azimuth Target azimuth in degrees (0 = North, 90 = East, 180 = South, 270 = West)
   */
  updateTarget(altitude: number, azimuth: number): void {
    // Check if position changed significantly (threshold: 0.1 degrees)
    const altDiff = Math.abs(altitude - this.targetAlt);
    const azDiff = Math.abs(this.getShortestAzimuthDistance(azimuth, this.targetAz));

    if (altDiff < 0.1 && azDiff < 0.1) {
      // Position hasn't changed significantly, skip update to avoid jitter
      return;
    }

    console.log(`[StarBackdrop] updateTarget: alt=${altitude.toFixed(2)}°, az=${azimuth.toFixed(2)}° (was: ${this.targetAlt.toFixed(2)}°/${this.targetAz.toFixed(2)}°)`);

    // Update target
    this.targetAlt = altitude;
    this.targetAz = azimuth;

    // If not currently slewing, start a new slew
    if (!this.isSlewing) {
      this.planAndExecuteSlew();
      return;
    }

    // If already slewing, smoothly update the endpoint of the current path
    // This avoids jarring restarts during continuous movement
    if (this.slewPath.length > 0) {
      // Update the final segment's endpoint
      const lastSegment = this.slewPath[this.slewPath.length - 1];
      lastSegment.endAlt = altitude;
      lastSegment.endAz = azimuth;

      // Recalculate duration for the updated final segment
      const deltaAlt = Math.abs(lastSegment.endAlt - lastSegment.startAlt);
      let deltaAz = lastSegment.endAz - lastSegment.startAz;
      while (deltaAz > 180) deltaAz -= 360;
      while (deltaAz < -180) deltaAz += 360;
      const absDeltaAz = Math.abs(deltaAz);

      const timeAlt = deltaAlt / this.maxAltitudeRate;
      const timeAz = absDeltaAz / this.maxAzimuthRate;
      const durationSec = Math.max(timeAlt, timeAz);
      lastSegment.duration = Math.max(200, durationSec * 1000);

      console.log(`[StarBackdrop] Updated final segment endpoint: alt ${lastSegment.startAlt.toFixed(2)}°->${lastSegment.endAlt.toFixed(2)}°, az ${lastSegment.startAz.toFixed(2)}°->${lastSegment.endAz.toFixed(2)}°`);
    }
  }

  /**
   * Enable/disable automatic time updates
   */
  setAutoUpdate(enabled: boolean): void {
    this.config.autoUpdateTime = enabled;
    if (enabled) {
      this.startAutoUpdate();
    } else {
      this.stopAutoUpdate();
    }
  }

  /**
   * Resize canvas
   */
  resize(width?: number, height?: number): void {
    if (width) {
      this.canvas.style.width = `${width}px`;
    }
    if (height) {
      this.canvas.style.height = `${height}px`;
    }
  }

  /**
   * Cleanup and dispose resources
   */
  dispose(): void {
    this.stopAutoUpdate();
    this.stopSlewAnimation();
    this.sceneHost.dispose();
    this.container.removeChild(this.canvas);
  }

  // ===== Private Methods =====

  private createCanvas(width?: number, height?: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');

    // Set size
    const w = width ?? this.container.clientWidth;
    const h = height ?? this.container.clientHeight;

    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.style.display = 'block';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none'; // Allow clicks to pass through

    return canvas;
  }

  private startAutoUpdate(): void {
    if (this.autoUpdateInterval !== null) {
      return; // Already running
    }

    // Update every second
    this.autoUpdateInterval = window.setInterval(() => {
      this.setTime(new Date());
    }, 1000);
  }

  private stopAutoUpdate(): void {
    if (this.autoUpdateInterval !== null) {
      clearInterval(this.autoUpdateInterval);
      this.autoUpdateInterval = null;
    }
  }

  /**
   * Plan time-optimal slew path using the "super-simple policy" (section 10 of guide)
   * For flat horizon with safety boundary
   */
  private planAndExecuteSlew(): void {
    // Stop any existing animation
    this.stopSlewAnimation();

    // Check if we're already at the target
    const altDiff = Math.abs(this.targetAlt - this.currentAlt);
    const azDiff = this.getShortestAzimuthDistance(this.currentAz, this.targetAz);

    if (altDiff < 0.1 && Math.abs(azDiff) < 0.1) {
      console.log(`[StarBackdrop] Already at target position, skipping slew`);
      return;
    }

    // Calculate safe altitude boundary
    const safeAlt = this.minSafeAltitude + this.epsilon;

    // Determine if we need a three-phase overhead arc or can go direct
    const needsOverheadArc = this.currentAlt < safeAlt || this.targetAlt < safeAlt;

    this.slewPath = [];

    if (!needsOverheadArc && this.currentAlt >= safeAlt && this.targetAlt >= safeAlt) {
      // Case A: Both endpoints already safe - direct slew
      console.log(`[StarBackdrop] Direct slew (both endpoints safe)`);

      const segment = this.createSegment(
        this.currentAlt, this.targetAlt,
        this.currentAz, this.targetAz
      );
      this.slewPath.push(segment);
    } else {
      // Case B: One or both endpoints below safe - use three-phase overhead arc
      // A* = max(h_safe + ε, alt_S, alt_E)
      const overheadAlt = Math.max(safeAlt, this.currentAlt, this.targetAlt);

      console.log(`[StarBackdrop] Three-phase overhead arc (safe alt: ${overheadAlt.toFixed(2)}°)`);

      // Phase 1: Raise to overhead altitude at current azimuth
      if (this.currentAlt < overheadAlt) {
        const segment1 = this.createSegment(
          this.currentAlt, overheadAlt,
          this.currentAz, this.currentAz
        );
        this.slewPath.push(segment1);
      }

      // Phase 2: Rotate azimuth while holding overhead altitude
      const segment2 = this.createSegment(
        overheadAlt, overheadAlt,
        this.currentAlt < overheadAlt ? this.currentAz : this.currentAlt,
        this.targetAz
      );
      this.slewPath.push(segment2);

      // Phase 3: Lower to target altitude at target azimuth
      if (overheadAlt > this.targetAlt) {
        const segment3 = this.createSegment(
          overheadAlt, this.targetAlt,
          this.targetAz, this.targetAz
        );
        this.slewPath.push(segment3);
      }
    }

    // Calculate total duration
    const totalDuration = this.slewPath.reduce((sum, seg) => sum + seg.duration, 0);

    console.log(`[StarBackdrop] Planned ${this.slewPath.length}-segment slew: ${this.currentAlt.toFixed(2)}°/${this.currentAz.toFixed(2)}° -> ${this.targetAlt.toFixed(2)}°/${this.targetAz.toFixed(2)}° (total: ${totalDuration.toFixed(0)}ms)`);
    this.slewPath.forEach((seg, i) => {
      console.log(`  Segment ${i+1}: alt ${seg.startAlt.toFixed(2)}°->${seg.endAlt.toFixed(2)}°, az ${seg.startAz.toFixed(2)}°->${seg.endAz.toFixed(2)}°, ${seg.duration.toFixed(0)}ms`);
    });

    // Start executing the path
    this.currentSegmentIndex = 0;
    this.segmentStartTime = performance.now();
    this.isSlewing = true;
    this.animateSlewStep();
  }

  /**
   * Create a slew segment with time-optimal duration
   * Duration = max(|Δalt|/ω_alt, |Δaz|/ω_az)
   * Both axes finish simultaneously
   */
  private createSegment(
    startAlt: number, endAlt: number,
    startAz: number, endAz: number
  ): SlewSegment {
    const deltaAlt = Math.abs(endAlt - startAlt);

    // Wrap azimuth to shortest path
    let deltaAz = endAz - startAz;
    while (deltaAz > 180) deltaAz -= 360;
    while (deltaAz < -180) deltaAz += 360;
    const absDeltaAz = Math.abs(deltaAz);

    // Calculate time required for each axis (in seconds)
    const timeAlt = deltaAlt / this.maxAltitudeRate;
    const timeAz = absDeltaAz / this.maxAzimuthRate;

    // Segment duration is limited by slower axis
    const durationSec = Math.max(timeAlt, timeAz);
    const durationMs = durationSec * 1000;

    // Add minimum duration for smoothness (200ms)
    const finalDuration = Math.max(200, durationMs);

    return {
      startAlt,
      endAlt,
      startAz,
      endAz,
      duration: finalDuration,
    };
  }

  private stopSlewAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.isSlewing = false;
    this.slewPath = [];
    this.currentSegmentIndex = 0;
  }

  private animateSlewStep = (): void => {
    if (!this.isSlewing || this.slewPath.length === 0) return;

    const now = performance.now();

    // Check if we've completed all segments
    if (this.currentSegmentIndex >= this.slewPath.length) {
      this.currentAlt = this.targetAlt;
      this.currentAz = this.targetAz;
      this.isSlewing = false;
      console.log(`[StarBackdrop] Slew complete at alt=${this.currentAlt.toFixed(2)}°, az=${this.currentAz.toFixed(2)}°`);
      return;
    }

    const segment = this.slewPath[this.currentSegmentIndex];
    const elapsed = now - this.segmentStartTime;
    const progress = Math.min(1.0, elapsed / segment.duration);

    // Apply ease-in-out cubic easing for smooth acceleration/deceleration
    const easedProgress = this.easeInOutCubic(progress);

    // Interpolate altitude
    const newAlt = segment.startAlt + (segment.endAlt - segment.startAlt) * easedProgress;

    // Interpolate azimuth (handle wrapping)
    const azDiff = this.getShortestAzimuthDistance(segment.startAz, segment.endAz);
    let newAz = segment.startAz + azDiff * easedProgress;
    newAz = ((newAz % 360) + 360) % 360;

    // Update current position tracking
    this.currentAlt = newAlt;
    this.currentAz = newAz;

    // Update camera
    const pitch = newAlt * (Math.PI / 180);
    const yaw = newAz * (Math.PI / 180);
    this.sceneHost.setCameraOrientation(yaw, pitch);

    // Check if segment is complete
    if (progress >= 1.0) {
      // Move to next segment
      this.currentSegmentIndex++;
      this.segmentStartTime = now;

      if (this.currentSegmentIndex < this.slewPath.length) {
        console.log(`[StarBackdrop] Segment ${this.currentSegmentIndex} complete, starting segment ${this.currentSegmentIndex + 1}`);
      }
    }

    // Continue animation
    this.animationFrameId = requestAnimationFrame(this.animateSlewStep);
  };

  /**
   * Calculate shortest angular distance between two azimuth angles
   * Handles wrapping around 0°/360° boundary
   */
  private getShortestAzimuthDistance(fromAz: number, toAz: number): number {
    let diff = toAz - fromAz;

    // Normalize to -180 to +180 range
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;

    return diff;
  }

  /**
   * Ease-in-out cubic easing function
   * Provides smooth acceleration at start and deceleration at end
   */
  private easeInOutCubic(t: number): number {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}

/**
 * Helper: Create a simple demo instance
 */
export function createDemo(container: HTMLElement): StarBackdrop {
  // Default to San Francisco coordinates for demo
  return new StarBackdrop({
    container,
    latitude: 37.7749,
    longitude: -122.4194,
    time: new Date(),
    autoUpdateTime: true,
    initialYaw: 0, // North
    initialPitch: Math.PI / 3, // 60° up
  });
}
