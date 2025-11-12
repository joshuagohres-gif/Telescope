/**
 * SunLayer: Renders the Sun with accurate angular size and limb darkening
 *
 * Features:
 * - Accurate real-time position
 * - True angular size (approximately 32 arcminutes)
 * - Limb darkening effect for realism
 * - Corona glow
 */

import type { RenderContext, RenderLayer } from './SceneHost';
import { equatorialToHorizontal, horizontalToDirection } from '../math/altaz';

const VERTEX_SHADER = `#version 300 es
precision highp float;

uniform mat4 uProjection;
uniform mat4 uView;
uniform vec3 uSunPosition;
uniform float uAngularSize; // Angular diameter in radians
uniform float uAspectRatio;

// Output to fragment shader
out vec2 vUV;
out float vAlpha;

void main() {
  // Create billboard quad vertices (-1 to 1)
  vec2 quadPos = vec2(
    (gl_VertexID == 0 || gl_VertexID == 3) ? -1.0 : 1.0,
    (gl_VertexID == 0 || gl_VertexID == 1) ? -1.0 : 1.0
  );

  vUV = quadPos * 0.5 + 0.5; // Convert to 0-1 range

  // Calculate billboard size based on angular size
  float screenSize = tan(uAngularSize * 0.5);
  vec2 billboardOffset = quadPos * screenSize;
  billboardOffset.x *= uAspectRatio; // Correct for aspect ratio

  // Calculate sun's screen position
  vec4 sunCenter = uProjection * uView * vec4(uSunPosition, 1.0);
  vec4 billboardPos = sunCenter;
  billboardPos.xy += billboardOffset * sunCenter.w;

  gl_Position = billboardPos;

  // Fade near horizon
  float altitude = uSunPosition.y;
  vAlpha = smoothstep(-0.1, 0.1, altitude);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 vUV;
in float vAlpha;

out vec4 fragColor;

void main() {
  // Convert UV to centered coordinates
  vec2 centered = (vUV - 0.5) * 2.0;
  float r = length(centered);

  // Discard pixels outside circular sun (with extended corona)
  if (r > 1.2) {
    discard;
  }

  // Base sun color (yellowish-white)
  vec3 sunColor = vec3(1.0, 0.98, 0.9);

  // Calculate limb darkening (sun appears darker at edges)
  // Using a physically-based limb darkening formula
  float limbDarkening = 1.0;
  if (r < 1.0) {
    float mu = sqrt(1.0 - r * r); // Cosine of angle from center
    // Van der Waerden limb darkening coefficients for Sun
    float u1 = 0.6; // Linear coefficient
    float u2 = 0.0; // Quadratic coefficient (simplified)
    limbDarkening = 1.0 - u1 * (1.0 - mu) - u2 * pow(1.0 - mu, 2.0);
    limbDarkening = clamp(limbDarkening, 0.6, 1.0);
  }

  // Apply limb darkening to color
  vec3 color = sunColor * limbDarkening;

  // Add corona glow beyond the disc edge
  float coronaFactor = 0.0;
  if (r > 1.0) {
    // Soft exponential falloff for corona
    coronaFactor = exp(-5.0 * (r - 1.0));
    color = mix(color, sunColor * 0.8, coronaFactor);
  }

  // Alpha calculation
  float alpha = 1.0;
  if (r < 1.0) {
    // Sharp edge for the main disc
    alpha = smoothstep(1.0, 0.98, r);
  } else {
    // Soft corona
    alpha = coronaFactor * 0.5;
  }

  // Apply horizon fade
  alpha *= vAlpha;

  // Make sun very bright (will be blended additively)
  color *= 1.5;

  fragColor = vec4(color, alpha);
}
`;

export interface SunLayerConfig {
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
   * Apply atmospheric refraction
   */
  applyRefraction?: boolean;

  /**
   * Field of view in degrees (for angular size calculation)
   */
  fov?: number;
}

export class SunLayer implements RenderLayer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;

  private config: Required<SunLayerConfig>;
  private needsUpdate = true;

  // Uniforms
  private uniformLocations: {
    projection?: WebGLUniformLocation | null;
    view?: WebGLUniformLocation | null;
    sunPosition?: WebGLUniformLocation | null;
    angularSize?: WebGLUniformLocation | null;
    aspectRatio?: WebGLUniformLocation | null;
  } = {};

  // Sun data
  private sunData: {
    position: [number, number, number];
    angularDiameter: number;
  } | null = null;

  // Sun physical constants
  private static readonly SUN_DIAMETER_KM = 1392700; // km
  private static readonly AU_TO_KM = 149597870.7; // 1 AU in km
  private static readonly MEAN_DISTANCE_AU = 1.0; // Sun-Earth distance

  constructor(gl: WebGL2RenderingContext, config: SunLayerConfig) {
    this.gl = gl;
    this.config = {
      latitude: config.latitude,
      longitude: config.longitude,
      time: config.time || new Date(),
      applyRefraction: config.applyRefraction ?? true,
      fov: config.fov ?? 60,
    };

    this.initialize();
  }

  private initialize(): void {
    const { gl } = this;

    // Create shader program
    const vertexShader = this.compileShader(VERTEX_SHADER, gl.VERTEX_SHADER);
    const fragmentShader = this.compileShader(FRAGMENT_SHADER, gl.FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) {
      throw new Error('Failed to compile Sun shaders');
    }

    this.program = gl.createProgram();
    if (!this.program) {
      throw new Error('Failed to create Sun shader program');
    }

    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(this.program);
      throw new Error('Failed to link Sun shader program: ' + info);
    }

    // Get uniform locations
    this.uniformLocations = {
      projection: gl.getUniformLocation(this.program, 'uProjection'),
      view: gl.getUniformLocation(this.program, 'uView'),
      sunPosition: gl.getUniformLocation(this.program, 'uSunPosition'),
      angularSize: gl.getUniformLocation(this.program, 'uAngularSize'),
      aspectRatio: gl.getUniformLocation(this.program, 'uAspectRatio'),
    };

    // Create VAO (we'll use gl_VertexID for the billboard quad)
    this.vao = gl.createVertexArray();

    // Initial sun data calculation
    this.updateSunData();
  }

  private compileShader(source: string, type: number): WebGLShader | null {
    const { gl } = this;
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private updateSunData(): void {
    const time = this.config.time;

    // Calculate Sun's position (simplified)
    const sunPos = this.calculateSunPosition(time);

    // Convert to horizontal coordinates
    const horizontal = equatorialToHorizontal(
      sunPos.ra,
      sunPos.dec,
      time,
      this.config.latitude,
      this.config.longitude,
      this.config.applyRefraction
    );

    // Convert to 3D direction vector
    const directionObj = horizontalToDirection(horizontal.altitude, horizontal.azimuth);
    const direction: [number, number, number] = [directionObj.x, directionObj.y, directionObj.z];

    // Calculate angular diameter
    // Sun's angular size varies slightly due to Earth's elliptical orbit
    // At 1 AU: angular_diameter = 2 * arctan(sun_diameter / (2 * distance))
    const distanceAU = sunPos.distance || SunLayer.MEAN_DISTANCE_AU;
    const distanceKm = distanceAU * SunLayer.AU_TO_KM;
    const angularDiameter = 2 * Math.atan(SunLayer.SUN_DIAMETER_KM / (2 * distanceKm));

    this.sunData = {
      position: direction,
      angularDiameter,
    };

    // Log Sun angular size
    const angularDiameterArcmin = (angularDiameter * 180 * 60) / Math.PI;
    console.log(`[SunLayer] Sun angular diameter: ${angularDiameterArcmin.toFixed(2)} arcminutes (${angularDiameter.toFixed(6)} rad)`);
  }

  private calculateSunPosition(time: Date): { ra: number; dec: number; distance: number } {
    // Simplified Sun position calculation (good to ~1 arcminute)
    const jd = 2440587.5 + time.getTime() / 86400000.0;
    const T = (jd - 2451545.0) / 36525.0;

    // Mean longitude
    const L0 = (280.46646 + 36000.76983 * T + 0.0003032 * T * T) * Math.PI / 180;

    // Mean anomaly
    const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * Math.PI / 180;

    // Equation of center
    const C = ((1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
      + (0.019993 - 0.000101 * T) * Math.sin(2 * M)
      + 0.000289 * Math.sin(3 * M)) * Math.PI / 180;

    // True longitude
    const sunLon = L0 + C;

    // Distance (AU) - Earth-Sun distance varies due to eccentricity
    const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
    const distance = 1.000001018 * (1 - e * e) / (1 + e * Math.cos(M + C));

    // Obliquity
    const epsilon = (23.439291 - 0.0130042 * T) * Math.PI / 180;

    // Convert to equatorial
    const ra = Math.atan2(Math.cos(epsilon) * Math.sin(sunLon), Math.cos(sunLon));
    const dec = Math.asin(Math.sin(epsilon) * Math.sin(sunLon));

    return { ra, dec, distance };
  }

  updateConfig(config: Partial<SunLayerConfig>): void {
    Object.assign(this.config, config);
    this.needsUpdate = true;
  }

  render(ctx: RenderContext): void {
    if (!this.program || !this.vao || !this.sunData) return;

    const { gl } = this;

    // Update sun data if needed
    if (this.needsUpdate) {
      this.updateSunData();
      this.needsUpdate = false;
    }

    // Don't render if below horizon (with some margin for refraction)
    if (this.sunData.position[1] < -0.1) {
      return;
    }

    // Use shader program
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    // Set uniforms
    gl.uniformMatrix4fv(this.uniformLocations.projection, false, ctx.projectionMatrix);
    gl.uniformMatrix4fv(this.uniformLocations.view, false, ctx.viewMatrix);
    gl.uniform3fv(this.uniformLocations.sunPosition, this.sunData.position);
    gl.uniform1f(this.uniformLocations.angularSize, this.sunData.angularDiameter);
    gl.uniform1f(this.uniformLocations.aspectRatio, gl.canvas.width / gl.canvas.height);

    // Enable additive blending for bright sun
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    // Draw billboard quad (4 vertices)
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    // Restore normal blending
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  dispose(): void {
    const { gl } = this;

    if (this.program) {
      gl.deleteProgram(this.program);
      this.program = null;
    }

    if (this.vao) {
      gl.deleteVertexArray(this.vao);
      this.vao = null;
    }
  }
}
