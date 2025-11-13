/**
 * MoonLayer: Detailed Moon rendering with phase, lighting, and procedural surface detail
 *
 * Features:
 * - Accurate real-time position and phase
 * - Procedural craters and mare using noise functions
 * - Per-pixel lighting with accurate terminator
 * - True angular size based on Earth-Moon distance
 * - TBN matrix for normal mapping
 */

import type { RenderContext, RenderLayer } from './SceneHost';
import { calculateLunarPosition } from '../math/moon';
import { starToDirection, equatorialToHorizontal, horizontalToDirection } from '../math/altaz';

const VERTEX_SHADER = `#version 300 es
precision highp float;

uniform mat4 uProjection;
uniform mat4 uView;
uniform vec3 uMoonPosition;
uniform float uAngularSize; // Angular diameter in radians
uniform float uAspectRatio;

// Output to fragment shader
out vec2 vUV;
out vec3 vNormal;
out vec3 vTangent;
out vec3 vBitangent;
out vec3 vViewDir;
out vec3 vLightDir;
out float vAlpha;

void main() {
  // Create billboard quad vertices (-1 to 1)
  vec2 quadPos = vec2(
    (gl_VertexID == 0 || gl_VertexID == 3) ? -1.0 : 1.0,
    (gl_VertexID == 0 || gl_VertexID == 1) ? -1.0 : 1.0
  );

  vUV = quadPos * 0.5 + 0.5; // Convert to 0-1 range

  // Calculate billboard size based on angular size
  // Angular size is in radians, we need to convert to screen space
  float screenSize = tan(uAngularSize * 0.5);
  vec2 billboardOffset = quadPos * screenSize;
  billboardOffset.x *= uAspectRatio; // Correct for aspect ratio

  // Calculate moon's screen position
  vec4 moonCenter = uProjection * uView * vec4(uMoonPosition, 1.0);
  vec4 billboardPos = moonCenter;
  billboardPos.xy += billboardOffset * moonCenter.w;

  gl_Position = billboardPos;

  // Calculate TBN matrix for normal mapping
  // Billboard faces camera, so normal is towards viewer
  vec3 normal = normalize(uMoonPosition);
  vec3 up = abs(normal.y) < 0.999 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 tangent = normalize(cross(up, normal));
  vec3 bitangent = cross(normal, tangent);

  vNormal = normal;
  vTangent = tangent;
  vBitangent = bitangent;

  // View direction (towards camera)
  vViewDir = normalize(-uMoonPosition);

  // Light direction will be set in fragment shader from uniform
  vLightDir = vec3(0.0); // Placeholder

  // Fade near horizon
  float altitude = uMoonPosition.y;
  vAlpha = smoothstep(-0.1, 0.1, altitude);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec3 uSunDirection; // Direction to Sun
uniform float uIlluminatedFraction; // 0.0 to 1.0
uniform float uPhaseAngle; // Radians
uniform float uPositionAngle; // Position angle of bright limb

in vec2 vUV;
in vec3 vNormal;
in vec3 vTangent;
in vec3 vBitangent;
in vec3 vViewDir;
in vec3 vLightDir;
in float vAlpha;

out vec4 fragColor;

// Simplex noise function for procedural detail
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                      0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                     -0.577350269189626,  // -1.0 + 2.0 * C.x
                      0.024390243902439); // 1.0 / 41.0
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                          + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// FBM (Fractional Brownian Motion) for crater detail
float fbm(vec2 st, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 3.0;

  for (int i = 0; i < octaves; i++) {
    value += amplitude * snoise(st * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// Generate procedural Moon surface with craters and mare
float generateMoonSurface(vec2 uv) {
  // Base surface with large-scale features (mare)
  float mare = fbm(uv * 2.0, 3) * 0.3 + 0.5;

  // Medium craters
  float craters1 = abs(fbm(uv * 8.0, 4)) * 0.15;

  // Small craters and detail
  float craters2 = abs(fbm(uv * 20.0, 5)) * 0.08;

  // Tiny surface roughness
  float roughness = fbm(uv * 50.0, 3) * 0.03;

  return mare - craters1 - craters2 + roughness;
}

// Calculate normal from height map for realistic lighting
vec3 calculateNormal(vec2 uv, float eps) {
  float h = generateMoonSurface(uv);
  float hx = generateMoonSurface(uv + vec2(eps, 0.0));
  float hy = generateMoonSurface(uv + vec2(0.0, eps));

  vec3 va = vec3(eps, 0.0, hx - h);
  vec3 vb = vec3(0.0, eps, hy - h);
  return normalize(cross(va, vb));
}

void main() {
  // Convert UV to sphere coordinates
  vec2 centered = (vUV - 0.5) * 2.0;
  float r = length(centered);

  // Discard pixels outside the circular moon
  if (r > 1.0) {
    discard;
  }

  // Calculate 3D position on sphere
  float z = sqrt(1.0 - r * r);
  vec3 spherePos = vec3(centered.x, centered.y, z);

  // Transform to lunar surface coordinates (for texture mapping)
  vec2 surfaceUV = vec2(
    atan(spherePos.x, spherePos.z) / (2.0 * 3.14159265359) + 0.5,
    asin(spherePos.y) / 3.14159265359 + 0.5
  );

  // Generate surface albedo
  float surface = generateMoonSurface(surfaceUV);
  vec3 baseColor = vec3(0.6, 0.58, 0.52); // Moon's grayish color
  vec3 mareColor = vec3(0.25, 0.24, 0.22); // Darker mare regions

  // Mix highlands and mare based on noise
  float mareAmount = smoothstep(0.4, 0.6, surface);
  vec3 albedo = mix(mareColor, baseColor, mareAmount);

  // Calculate surface normal with perturbations for craters
  vec3 surfaceNormal = calculateNormal(surfaceUV, 0.005);

  // Transform normal from tangent space to world space using TBN
  mat3 TBN = mat3(vTangent, vBitangent, vNormal);
  vec3 worldNormal = normalize(TBN * surfaceNormal);

  // Apply sphere normal
  vec3 sphereNormal = normalize(spherePos);
  vec3 finalNormal = normalize(worldNormal + sphereNormal * 0.5);

  // Calculate lighting
  vec3 lightDir = normalize(uSunDirection);
  float NdotL = dot(finalNormal, lightDir);

  // Phase-accurate terminator calculation
  // The terminator is where the light direction is perpendicular to surface normal
  float lighting = max(NdotL, 0.0);

  // Add subtle ambient light (earthshine and starlight)
  float ambient = 0.05;

  // Combine lighting
  float illumination = lighting + ambient;

  // Apply limb darkening (moon appears darker at edges)
  float limb = dot(sphereNormal, normalize(vViewDir));
  limb = smoothstep(0.0, 1.0, limb);
  illumination *= mix(0.6, 1.0, limb);

  // Phase-based darkening for unlit portion
  // Calculate if this pixel should be lit based on phase angle
  float phaseAngle = acos(spherePos.z);
  float litAmount = smoothstep(uPhaseAngle - 0.1, uPhaseAngle + 0.1, phaseAngle);

  // Final color
  vec3 color = albedo * illumination;

  // Soft edge falloff
  float edgeFalloff = smoothstep(1.0, 0.95, r);

  fragColor = vec4(color, edgeFalloff * vAlpha);
}
`;

export interface MoonLayerConfig {
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

export class MoonLayer implements RenderLayer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;

  private config: Required<MoonLayerConfig>;
  private needsUpdate = true;

  // Uniforms
  private uniformLocations: {
    projection?: WebGLUniformLocation | null;
    view?: WebGLUniformLocation | null;
    moonPosition?: WebGLUniformLocation | null;
    angularSize?: WebGLUniformLocation | null;
    aspectRatio?: WebGLUniformLocation | null;
    sunDirection?: WebGLUniformLocation | null;
    illuminatedFraction?: WebGLUniformLocation | null;
    phaseAngle?: WebGLUniformLocation | null;
    positionAngle?: WebGLUniformLocation | null;
  } = {};

  // Moon data
  private moonData: {
    position: [number, number, number];
    sunDirection: [number, number, number];
    illuminatedFraction: number;
    phaseAngle: number;
    positionAngle: number;
    angularDiameter: number;
  } | null = null;

  constructor(gl: WebGL2RenderingContext, config: MoonLayerConfig) {
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
      throw new Error('Failed to compile Moon shaders');
    }

    this.program = gl.createProgram();
    if (!this.program) {
      throw new Error('Failed to create Moon shader program');
    }

    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(this.program);
      throw new Error('Failed to link Moon shader program: ' + info);
    }

    // Get uniform locations
    this.uniformLocations = {
      projection: gl.getUniformLocation(this.program, 'uProjection'),
      view: gl.getUniformLocation(this.program, 'uView'),
      moonPosition: gl.getUniformLocation(this.program, 'uMoonPosition'),
      angularSize: gl.getUniformLocation(this.program, 'uAngularSize'),
      aspectRatio: gl.getUniformLocation(this.program, 'uAspectRatio'),
      sunDirection: gl.getUniformLocation(this.program, 'uSunDirection'),
      illuminatedFraction: gl.getUniformLocation(this.program, 'uIlluminatedFraction'),
      phaseAngle: gl.getUniformLocation(this.program, 'uPhaseAngle'),
      positionAngle: gl.getUniformLocation(this.program, 'uPositionAngle'),
    };

    // Create VAO (we'll use gl_VertexID for the billboard quad)
    this.vao = gl.createVertexArray();

    // Initial moon data calculation
    this.updateMoonData();
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

  private updateMoonData(): void {
    const time = this.config.time;

    // Calculate lunar position
    const lunarPos = calculateLunarPosition(time);

    // Convert to horizontal coordinates
    const horizontal = equatorialToHorizontal(
      lunarPos.ra,
      lunarPos.dec,
      time,
      this.config.latitude,
      this.config.longitude,
      this.config.applyRefraction
    );

    // Convert to 3D direction vector
    const directionObj = horizontalToDirection(horizontal.altitude, horizontal.azimuth);
    const direction: [number, number, number] = [directionObj.x, directionObj.y, directionObj.z];

    // Calculate Sun direction for phase lighting
    // For simplicity, calculate Sun's approximate position
    const sunPos = this.calculateSunPosition(time);
    const sunHorizontal = equatorialToHorizontal(
      sunPos.ra,
      sunPos.dec,
      time,
      this.config.latitude,
      this.config.longitude,
      this.config.applyRefraction
    );
    const sunDirectionObj = horizontalToDirection(sunHorizontal.altitude, sunHorizontal.azimuth);
    const sunDirection: [number, number, number] = [sunDirectionObj.x, sunDirectionObj.y, sunDirectionObj.z];

    this.moonData = {
      position: direction,
      sunDirection,
      illuminatedFraction: lunarPos.phase.illuminatedFraction,
      phaseAngle: lunarPos.phase.phaseAngle,
      positionAngle: lunarPos.phase.positionAngle,
      angularDiameter: lunarPos.angularDiameter,
    };
  }

  private calculateSunPosition(time: Date): { ra: number; dec: number } {
    // Simplified Sun position calculation
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

    // Obliquity
    const epsilon = (23.439291 - 0.0130042 * T) * Math.PI / 180;

    // Convert to equatorial
    const ra = Math.atan2(Math.cos(epsilon) * Math.sin(sunLon), Math.cos(sunLon));
    const dec = Math.asin(Math.sin(epsilon) * Math.sin(sunLon));

    return { ra, dec };
  }

  updateConfig(config: Partial<MoonLayerConfig>): void {
    Object.assign(this.config, config);
    this.needsUpdate = true;
  }

  render(ctx: RenderContext): void {
    if (!this.program || !this.vao || !this.moonData) return;

    const { gl } = this;

    // Update moon data if needed (or force update every render for real-time position)
    if (this.needsUpdate || true) {
      this.updateMoonData();
      this.needsUpdate = false;
    }

    // Don't render if below horizon
    if (this.moonData.position[1] < -0.05) {
      return;
    }


    // Use shader program
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    // Set uniforms
    gl.uniformMatrix4fv(this.uniformLocations.projection, false, ctx.projectionMatrix);
    gl.uniformMatrix4fv(this.uniformLocations.view, false, ctx.viewMatrix);
    gl.uniform3fv(this.uniformLocations.moonPosition, this.moonData.position);
    gl.uniform1f(this.uniformLocations.angularSize, this.moonData.angularDiameter);
    gl.uniform1f(this.uniformLocations.aspectRatio, gl.canvas.width / gl.canvas.height);
    gl.uniform3fv(this.uniformLocations.sunDirection, this.moonData.sunDirection);
    gl.uniform1f(this.uniformLocations.illuminatedFraction, this.moonData.illuminatedFraction);
    gl.uniform1f(this.uniformLocations.phaseAngle, this.moonData.phaseAngle);
    gl.uniform1f(this.uniformLocations.positionAngle, this.moonData.positionAngle);

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Draw billboard quad (4 vertices)
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    gl.disable(gl.BLEND);
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
