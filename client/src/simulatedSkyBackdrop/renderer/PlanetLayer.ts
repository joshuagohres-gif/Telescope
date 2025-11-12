/**
 * PlanetLayer: GPU-based planet rendering with real-time position calculations
 * Renders planets as larger, colored discs distinct from stars
 */

import type { RenderContext, RenderLayer } from './SceneHost';
import { getAllPlanetPositions } from '../math/planets';
import { starToDirection } from '../math/altaz';

const VERTEX_SHADER = `#version 300 es
precision highp float;

uniform mat4 uProjection;
uniform mat4 uView;

in vec3 aPosition;
in vec3 aColor;
in float aSize;

out vec3 vColor;
out float vAlpha;

void main() {
  gl_Position = uProjection * uView * vec4(aPosition, 1.0);
  gl_PointSize = aSize;

  vColor = aColor;

  // Fade planets near horizon
  float altitude = aPosition.y;
  vAlpha = smoothstep(-0.1, 0.1, altitude);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec3 vColor;
in float vAlpha;

out vec4 fragColor;

void main() {
  // Circular point with very soft edges (more disc-like)
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);

  if (dist > 0.5) {
    discard;
  }

  // Soft falloff for planets (less harsh than stars)
  float alpha = smoothstep(0.5, 0.1, dist);
  alpha *= vAlpha;

  // Planets are brighter and more solid than stars
  alpha = mix(0.8, 1.0, alpha);

  fragColor = vec4(vColor, alpha);
}
`;

export interface PlanetLayerConfig {
  /**
   * Observer's latitude in degrees (positive North)
   */
  latitude: number;

  /**
   * Observer's longitude in degrees (positive East)
   */
  longitude: number;

  /**
   * Observation time (defaults to current time)
   */
  time?: Date;

  /**
   * Planet size scale factor (multiplier for true angular sizes)
   */
  planetScale?: number;

  /**
   * Apply atmospheric refraction
   */
  applyRefraction?: boolean;

  /**
   * Field of view in degrees (for angular size to pixel conversion)
   */
  fov?: number;
}

interface ProcessedPlanet {
  name: string;
  position: [number, number, number]; // 3D direction vector
  color: [number, number, number]; // RGB
  size: number; // Point size in pixels
}

export class PlanetLayer implements RenderLayer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private vertexBuffer: WebGLBuffer | null = null;
  private planetCount: number = 0;

  // Configuration
  private config: Required<PlanetLayerConfig>;

  // Uniform locations
  private uProjection: WebGLUniformLocation | null = null;
  private uView: WebGLUniformLocation | null = null;

  constructor(gl: WebGL2RenderingContext, config: PlanetLayerConfig) {
    this.gl = gl;

    // Fill in defaults
    this.config = {
      latitude: config.latitude,
      longitude: config.longitude,
      time: config.time ?? new Date(),
      planetScale: config.planetScale ?? 1.0,
      applyRefraction: config.applyRefraction ?? true,
      fov: config.fov ?? 60,
    };

    this.initialize();
  }

  /**
   * Update observer location and time
   */
  updateObserver(latitude: number, longitude: number, time?: Date): void {
    this.config.latitude = latitude;
    this.config.longitude = longitude;
    if (time) {
      this.config.time = time;
    }

    // Recompute planet positions
    this.computePlanetPositions();
  }

  render(ctx: RenderContext): void {
    if (!this.program || !this.vao || this.planetCount === 0) return;

    const { gl } = this;

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    // Set uniforms
    if (this.uProjection) {
      gl.uniformMatrix4fv(this.uProjection, false, ctx.projectionMatrix);
    }
    if (this.uView) {
      gl.uniformMatrix4fv(this.uView, false, ctx.viewMatrix);
    }

    // Enable additive blending for planets
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    // Render planets as points
    gl.drawArrays(gl.POINTS, 0, this.planetCount);

    // Restore normal blending
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.bindVertexArray(null);
  }

  dispose(): void {
    const { gl } = this;

    if (this.vao) {
      gl.deleteVertexArray(this.vao);
      this.vao = null;
    }
    if (this.vertexBuffer) {
      gl.deleteBuffer(this.vertexBuffer);
      this.vertexBuffer = null;
    }
    if (this.program) {
      gl.deleteProgram(this.program);
      this.program = null;
    }
  }

  // ===== Private Methods =====

  private initialize(): void {
    this.program = this.createShaderProgram();
    if (!this.program) {
      throw new Error('Failed to create planet layer shader program');
    }

    // Get uniform locations
    this.uProjection = this.gl.getUniformLocation(this.program, 'uProjection');
    this.uView = this.gl.getUniformLocation(this.program, 'uView');

    // Compute initial planet positions
    this.computePlanetPositions();
  }

  private createShaderProgram(): WebGLProgram | null {
    const { gl } = this;

    const vertShader = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragShader = this.compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

    if (!vertShader || !fragShader) {
      return null;
    }

    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Planet shader program link error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);

    return program;
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    const { gl } = this;
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Planet shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private computePlanetPositions(): void {
    const { gl } = this;
    const { latitude, longitude, time, applyRefraction, planetScale, fov } = this.config;

    // Get all planet positions for current time
    const planets = getAllPlanetPositions(time);

    const processedPlanets: ProcessedPlanet[] = [];

    // Constants for angular size calculation
    const AU_TO_KM = 149597870.7; // 1 AU in kilometers
    const canvasHeight = gl.canvas.height;

    for (const planet of planets) {
      // Convert planet's RA/Dec to Alt/Az and get 3D direction vector
      const direction = starToDirection(
        planet.ra,
        planet.dec,
        time,
        latitude,
        longitude,
        applyRefraction
      );

      // Skip planets below horizon
      if (!direction) continue;

      // Calculate TRUE angular size based on physical diameter and distance
      // Angular diameter (radians) = 2 * arctan(diameter / (2 * distance))
      const distanceKm = planet.distance * AU_TO_KM;
      const angularDiameterRad = 2 * Math.atan(planet.diameter / (2 * distanceKm));

      // Convert angular size to pixel size based on FOV
      // Pixels per radian = canvas height / FOV in radians
      const fovRad = (fov * Math.PI) / 180;
      const pixelsPerRadian = canvasHeight / fovRad;
      const angularSizePixels = angularDiameterRad * pixelsPerRadian * planetScale;

      // Clamp to reasonable range (minimum 4 pixels so tiny planets are visible, max 100)
      const size = Math.max(4.0, Math.min(100.0, angularSizePixels));

      processedPlanets.push({
        name: planet.name,
        position: [direction.x, direction.y, direction.z],
        color: planet.color,
        size,
      });
    }

    this.planetCount = processedPlanets.length;

    console.log(`[PlanetLayer] Computed ${this.planetCount} visible planets for ${time.toISOString()}`);
    processedPlanets.forEach((p, i) => {
      const planet = planets.find(pl => pl.name === p.name);
      if (planet) {
        const distanceKm = planet.distance * 149597870.7;
        const angularDiameterRad = 2 * Math.atan(planet.diameter / (2 * distanceKm));
        const angularDiameterArcSec = (angularDiameterRad * 180 * 3600) / Math.PI;
        console.log(`  ${p.name}: pos=[${p.position[0].toFixed(3)}, ${p.position[1].toFixed(3)}, ${p.position[2].toFixed(3)}], size=${p.size.toFixed(1)}px (${angularDiameterArcSec.toFixed(2)}" angular)`);
      }
    });

    // Create vertex data
    // Layout: [x, y, z, r, g, b, size] per planet
    const vertexData = new Float32Array(processedPlanets.length * 7);

    for (let i = 0; i < processedPlanets.length; i++) {
      const planet = processedPlanets[i];
      const offset = i * 7;

      vertexData[offset + 0] = planet.position[0];
      vertexData[offset + 1] = planet.position[1];
      vertexData[offset + 2] = planet.position[2];
      vertexData[offset + 3] = planet.color[0];
      vertexData[offset + 4] = planet.color[1];
      vertexData[offset + 5] = planet.color[2];
      vertexData[offset + 6] = planet.size;
    }

    // Create VAO
    if (!this.vao) {
      this.vao = gl.createVertexArray();
    }
    gl.bindVertexArray(this.vao);

    // Create or update vertex buffer
    if (!this.vertexBuffer) {
      this.vertexBuffer = gl.createBuffer();
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);

    // Set up vertex attributes
    const aPosition = gl.getAttribLocation(this.program!, 'aPosition');
    const aColor = gl.getAttribLocation(this.program!, 'aColor');
    const aSize = gl.getAttribLocation(this.program!, 'aSize');

    const stride = 7 * 4; // 7 floats * 4 bytes

    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, stride, 0);

    gl.enableVertexAttribArray(aColor);
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, stride, 3 * 4);

    gl.enableVertexAttribArray(aSize);
    gl.vertexAttribPointer(aSize, 1, gl.FLOAT, false, stride, 6 * 4);

    gl.bindVertexArray(null);
  }
}
