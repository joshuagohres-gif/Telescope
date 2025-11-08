/**
 * StarLayer: GPU-based star rendering with proper astronomical coordinates
 * Applies full coordinate transform pipeline and magnitude-based sizing
 */

import type { RenderContext, RenderLayer } from './SceneHost';
import { BRIGHT_STARS, type StarData } from '../data/brightStars';
import { dateToJD } from '../math/sidereal';
import { applyPrecession, applyProperMotion } from '../math/precession';
import { starToDirection } from '../math/altaz';

const VERTEX_SHADER = `#version 300 es
precision highp float;

uniform mat4 uProjection;
uniform mat4 uView;
uniform float uPointScale; // Scale factor for point sizes

in vec3 aPosition;
in float aMagnitude;
in vec3 aColor;

out vec3 vColor;
out float vAlpha;

void main() {
  // Calculate point size based on magnitude
  // Brighter stars (lower magnitude) = larger points
  // Visual magnitude scale: -1.5 (Sirius) to ~2.0 (dimmest in our set)
  float brightness = pow(2.512, -aMagnitude); // Pogson's ratio
  float pointSize = uPointScale * brightness * 3.0;

  gl_Position = uProjection * uView * vec4(aPosition, 1.0);
  gl_PointSize = clamp(pointSize, 1.0, 20.0);

  vColor = aColor;

  // Fade stars near horizon
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
  // Circular point with soft edges
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);

  if (dist > 0.5) {
    discard;
  }

  // Soft falloff
  float alpha = smoothstep(0.5, 0.2, dist);
  alpha *= vAlpha;

  fragColor = vec4(vColor, alpha);
}
`;

export interface StarLayerConfig {
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
   * Point size scale factor
   */
  pointScale?: number;

  /**
   * Apply atmospheric refraction
   */
  applyRefraction?: boolean;
}

interface ProcessedStar {
  position: [number, number, number]; // 3D direction vector
  magnitude: number;
  color: [number, number, number]; // RGB
}

export class StarLayer implements RenderLayer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private vertexBuffer: WebGLBuffer | null = null;
  private starCount: number = 0;

  // Configuration
  private config: Required<StarLayerConfig>;

  // Uniform locations
  private uProjection: WebGLUniformLocation | null = null;
  private uView: WebGLUniformLocation | null = null;
  private uPointScale: WebGLUniformLocation | null = null;

  constructor(gl: WebGL2RenderingContext, config: StarLayerConfig) {
    this.gl = gl;

    // Fill in defaults
    this.config = {
      latitude: config.latitude,
      longitude: config.longitude,
      time: config.time ?? new Date(),
      pointScale: config.pointScale ?? 2.0,
      applyRefraction: config.applyRefraction ?? true,
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

    // Recompute star positions
    this.computeStarPositions();
  }

  render(ctx: RenderContext): void {
    if (!this.program || !this.vao || this.starCount === 0) return;

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
    if (this.uPointScale) {
      gl.uniform1f(this.uPointScale, this.config.pointScale);
    }

    // Enable additive blending for stars
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    // Render stars as points
    gl.drawArrays(gl.POINTS, 0, this.starCount);

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
      throw new Error('Failed to create star layer shader program');
    }

    // Get uniform locations
    this.uProjection = this.gl.getUniformLocation(this.program, 'uProjection');
    this.uView = this.gl.getUniformLocation(this.program, 'uView');
    this.uPointScale = this.gl.getUniformLocation(this.program, 'uPointScale');

    // Compute initial star positions
    this.computeStarPositions();
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
      console.error('Star shader program link error:', gl.getProgramInfoLog(program));
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
      console.error('Star shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private computeStarPositions(): void {
    const { gl } = this;
    const { latitude, longitude, time, applyRefraction } = this.config;

    // Convert time to Julian Date
    const jd = dateToJD(time);

    // Process each star through the coordinate pipeline
    const processedStars: ProcessedStar[] = [];

    for (const star of BRIGHT_STARS) {
      // 1. Apply proper motion
      const { ra: raPM, dec: decPM } = applyProperMotion(
        star.ra,
        star.dec,
        star.pmRA,
        star.pmDec,
        jd
      );

      // 2. Apply precession (J2000 to current epoch)
      const { ra: raPrec, dec: decPrec } = applyPrecession(raPM, decPM, jd);

      // 3. Convert to Alt/Az and get 3D direction vector
      const direction = starToDirection(
        raPrec,
        decPrec,
        time,
        latitude,
        longitude,
        applyRefraction
      );

      // Skip stars below horizon
      if (!direction) continue;

      // 4. Get star color from B-V index
      const color = this.colorFromBV(star.colorIndex);

      processedStars.push({
        position: [direction.x, direction.y, direction.z],
        magnitude: star.magV,
        color,
      });
    }

    this.starCount = processedStars.length;

    // Create vertex data
    // Layout: [x, y, z, magnitude, r, g, b] per star
    const vertexData = new Float32Array(processedStars.length * 7);

    for (let i = 0; i < processedStars.length; i++) {
      const star = processedStars[i];
      const offset = i * 7;

      vertexData[offset + 0] = star.position[0];
      vertexData[offset + 1] = star.position[1];
      vertexData[offset + 2] = star.position[2];
      vertexData[offset + 3] = star.magnitude;
      vertexData[offset + 4] = star.color[0];
      vertexData[offset + 5] = star.color[1];
      vertexData[offset + 6] = star.color[2];
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
    const aMagnitude = gl.getAttribLocation(this.program!, 'aMagnitude');
    const aColor = gl.getAttribLocation(this.program!, 'aColor');

    const stride = 7 * 4; // 7 floats * 4 bytes

    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, stride, 0);

    gl.enableVertexAttribArray(aMagnitude);
    gl.vertexAttribPointer(aMagnitude, 1, gl.FLOAT, false, stride, 3 * 4);

    gl.enableVertexAttribArray(aColor);
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, stride, 4 * 4);

    gl.bindVertexArray(null);
  }

  /**
   * Convert B-V color index to RGB
   * B-V ranges from about -0.4 (blue) to +2.0 (red)
   */
  private colorFromBV(bv: number): [number, number, number] {
    // Approximate Planckian locus mapping
    // Based on temperature correlation

    // Clamp to reasonable range
    bv = Math.max(-0.4, Math.min(2.0, bv));

    let r: number, g: number, b: number;

    if (bv < 0) {
      // Blue-white stars (O, B type)
      const t = (bv + 0.4) / 0.4;
      r = 0.7 + t * 0.3;
      g = 0.8 + t * 0.2;
      b = 1.0;
    } else if (bv < 0.5) {
      // White stars (A, F type)
      const t = bv / 0.5;
      r = 1.0;
      g = 1.0 - t * 0.1;
      b = 1.0 - t * 0.2;
    } else if (bv < 1.0) {
      // Yellow-white stars (G type)
      const t = (bv - 0.5) / 0.5;
      r = 1.0;
      g = 0.9 - t * 0.2;
      b = 0.8 - t * 0.4;
    } else if (bv < 1.5) {
      // Orange stars (K type)
      const t = (bv - 1.0) / 0.5;
      r = 1.0;
      g = 0.7 - t * 0.2;
      b = 0.4 - t * 0.2;
    } else {
      // Red stars (M type)
      const t = Math.min(1.0, (bv - 1.5) / 0.5);
      r = 1.0;
      g = 0.5 - t * 0.2;
      b = 0.2 - t * 0.1;
    }

    return [r, g, b];
  }
}
