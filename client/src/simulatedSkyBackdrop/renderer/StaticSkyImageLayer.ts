/**
 * StaticSkyImageLayer: Renders a static equirectangular sky image
 * Transforms the image based on observer location and time to show the correct sky orientation
 * Replaces computer-generated stars with a real sky image
 */

import type { RenderContext, RenderLayer } from './SceneHost';
import { calculateLST } from '../math/sidereal';

export interface StaticSkyImageLayerConfig {
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
   * URL or path to the equirectangular sky image
   * Defaults to a placeholder or can be configured via environment variable
   */
  imageUrl?: string;
}

const VERTEX_SHADER = `#version 300 es
precision highp float;

uniform mat4 uProjection;
uniform mat4 uView;
uniform float uLST; // Local Sidereal Time in radians
uniform float uLatitude; // Observer latitude in radians

in vec3 aPosition;

out vec3 vDirection;
out vec2 vTexCoord;

void main() {
  // Pass normalized direction to fragment shader
  vDirection = normalize(aPosition);

  // Remove translation from view matrix (keep only rotation)
  mat4 viewNoTranslation = uView;
  viewNoTranslation[3][0] = 0.0;
  viewNoTranslation[3][1] = 0.0;
  viewNoTranslation[3][2] = 0.0;

  vec4 pos = uProjection * viewNoTranslation * vec4(aPosition, 1.0);

  // Force depth to far plane (z = w)
  gl_Position = pos.xyww;
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D uSkyTexture;
uniform float uLST; // Local Sidereal Time in radians
uniform float uLatitude; // Observer latitude in radians
uniform bool uTextureLoaded;

in vec3 vDirection;
out vec4 fragColor;

// Convert 3D direction vector (horizontal coordinates) to equatorial coordinates (RA, Dec)
vec2 directionToEquatorial(vec3 dir) {
  // Direction vector: x = East, y = Up, z = North
  
  // Calculate altitude and azimuth from direction
  float altitude = asin(clamp(dir.y, -1.0, 1.0));
  float azimuth = atan(dir.x, dir.z);
  if (azimuth < 0.0) azimuth += 2.0 * 3.14159265359;
  
  // Convert Alt/Az to RA/Dec using spherical trigonometry
  float sinAlt = sin(altitude);
  float cosAlt = cos(altitude);
  float sinLat = sin(uLatitude);
  float cosLat = cos(uLatitude);
  float cosAz = cos(azimuth);
  
  // Calculate declination
  float sinDec = sinAlt * sinLat + cosAlt * cosLat * cosAz;
  float dec = asin(clamp(sinDec, -1.0, 1.0));
  
  // Calculate hour angle
  float cosDec = cos(dec);
  if (abs(cosDec) < 0.0001) {
    // Near poles, use simpler calculation
    float ha = 0.0;
    float ra = uLST - ha;
    if (ra < 0.0) ra += 2.0 * 3.14159265359;
    if (ra >= 2.0 * 3.14159265359) ra -= 2.0 * 3.14159265359;
    return vec2(ra, dec);
  }
  
  float cosHA = (sinAlt - sinDec * sinLat) / (cosDec * cosLat);
  float sinHA = -sin(azimuth) * cosAlt / cosDec;
  float ha = atan(sinHA, cosHA);
  
  // Calculate RA from HA and LST
  float ra = uLST - ha;
  
  // Normalize RA to [0, 2π]
  if (ra < 0.0) ra += 2.0 * 3.14159265359;
  if (ra >= 2.0 * 3.14159265359) ra -= 2.0 * 3.14159265359;
  
  return vec2(ra, dec);
}

void main() {
  if (!uTextureLoaded) {
    // Fallback: dark blue gradient if texture not loaded
    float h = vDirection.y;
    vec3 horizonColor = vec3(0.1, 0.15, 0.3);
    vec3 zenithColor = vec3(0.0, 0.0, 0.05);
    float t = smoothstep(-0.2, 0.8, h);
    fragColor = vec4(mix(horizonColor, zenithColor, t), 1.0);
    return;
  }
  
  // Convert view direction to equatorial coordinates
  vec2 equatorial = directionToEquatorial(vDirection);
  float ra = equatorial.x;
  float dec = equatorial.y;
  
  // Map RA/Dec to equirectangular texture coordinates
  // RA: 0 to 2π maps to u: 0 to 1
  // Dec: -π/2 to π/2 maps to v: 1 to 0 (inverted because Dec increases upward)
  float u = ra / (2.0 * 3.14159265359);
  float v = 1.0 - (dec + 3.14159265359 / 2.0) / 3.14159265359;
  
  // Sample the sky texture
  vec4 texColor = texture(uSkyTexture, vec2(u, v));
  
  // Fade near horizon to blend with sky dome
  float altitude = asin(clamp(vDirection.y, -1.0, 1.0));
  float horizonFade = smoothstep(-0.2, 0.1, altitude);
  
  fragColor = vec4(texColor.rgb, texColor.a * horizonFade);
}
`;

export class StaticSkyImageLayer implements RenderLayer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private vertexBuffer: WebGLBuffer | null = null;
  private indexBuffer: WebGLBuffer | null = null;
  private indexCount: number = 0;
  private texture: WebGLTexture | null = null;
  private textureLoaded: boolean = false;

  // Configuration
  private config: Required<Omit<StaticSkyImageLayerConfig, 'imageUrl'>> & { imageUrl?: string };
  private imageUrl: string;

  // Uniform locations
  private uProjection: WebGLUniformLocation | null = null;
  private uView: WebGLUniformLocation | null = null;
  private uSkyTexture: WebGLUniformLocation | null = null;
  private uLST: WebGLUniformLocation | null = null;
  private uLatitude: WebGLUniformLocation | null = null;
  private uTextureLoaded: WebGLUniformLocation | null = null;

  constructor(gl: WebGL2RenderingContext, config: StaticSkyImageLayerConfig) {
    this.gl = gl;

    // Fill in defaults
    this.config = {
      latitude: config.latitude,
      longitude: config.longitude,
      time: config.time ?? new Date(),
      imageUrl: config.imageUrl,
    };

    // Get image URL from config or environment variable
    const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
    this.imageUrl = config.imageUrl ||
                    (env.VITE_SKY_IMAGE_URL as string | undefined) ||
                    undefined; // No default - will show fallback gradient if not provided

    console.log('[StaticSkyImageLayer] Constructor called');
    console.log('[StaticSkyImageLayer] Config imageUrl:', config.imageUrl);
    console.log('[StaticSkyImageLayer] import.meta.env:', import.meta?.env);
    console.log('[StaticSkyImageLayer] VITE_SKY_IMAGE_URL:', env.VITE_SKY_IMAGE_URL);
    console.log('[StaticSkyImageLayer] Final imageUrl:', this.imageUrl);

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
  }

  /**
   * Update the sky image URL
   */
  setImageUrl(url: string): void {
    if (url === this.imageUrl) return;
    this.imageUrl = url;
    this.loadTexture();
  }

  render(ctx: RenderContext): void {
    if (!this.program || !this.vao) {
      console.warn('[StaticSkyImageLayer] Render skipped - program or VAO not initialized');
      return;
    }

    const { gl } = this;

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    // Calculate Local Sidereal Time
    const lst = calculateLST(this.config.time, this.config.longitude);
    const latRad = this.config.latitude * Math.PI / 180;

    // Set uniforms
    if (this.uProjection) {
      gl.uniformMatrix4fv(this.uProjection, false, ctx.projectionMatrix);
    }
    if (this.uView) {
      gl.uniformMatrix4fv(this.uView, false, ctx.viewMatrix);
    }
    if (this.uLST) {
      gl.uniform1f(this.uLST, lst);
    }
    if (this.uLatitude) {
      gl.uniform1f(this.uLatitude, latRad);
    }
    if (this.uTextureLoaded) {
      gl.uniform1i(this.uTextureLoaded, this.textureLoaded ? 1 : 0);
    }

    // Bind texture
    if (this.texture && this.textureLoaded) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      if (this.uSkyTexture) {
        gl.uniform1i(this.uSkyTexture, 0);
      }
    }

    // Render sky dome with texture
    gl.disable(gl.DEPTH_TEST); // Always draw behind everything
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    gl.enable(gl.DEPTH_TEST);

    gl.bindVertexArray(null);
  }

  dispose(): void {
    const { gl } = this;

    if (this.texture) {
      gl.deleteTexture(this.texture);
      this.texture = null;
    }

    if (this.vao) {
      gl.deleteVertexArray(this.vao);
      this.vao = null;
    }
    if (this.vertexBuffer) {
      gl.deleteBuffer(this.vertexBuffer);
      this.vertexBuffer = null;
    }
    if (this.indexBuffer) {
      gl.deleteBuffer(this.indexBuffer);
      this.indexBuffer = null;
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
      throw new Error('Failed to create static sky image layer shader program');
    }

    // Get uniform locations
    this.uProjection = this.gl.getUniformLocation(this.program, 'uProjection');
    this.uView = this.gl.getUniformLocation(this.program, 'uView');
    this.uSkyTexture = this.gl.getUniformLocation(this.program, 'uSkyTexture');
    this.uLST = this.gl.getUniformLocation(this.program, 'uLST');
    this.uLatitude = this.gl.getUniformLocation(this.program, 'uLatitude');
    this.uTextureLoaded = this.gl.getUniformLocation(this.program, 'uTextureLoaded');

    // Create sphere geometry (same as SkyDome)
    this.createSphereGeometry(100, 64, 32); // radius, segments, rings

    // Load texture
    this.loadTexture();
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
      console.error('Static sky image shader program link error:', gl.getProgramInfoLog(program));
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
      console.error('Static sky image shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private createSphereGeometry(radius: number, segments: number, rings: number): void {
    const { gl } = this;

    const vertices: number[] = [];
    const indices: number[] = [];

    // Generate sphere vertices (inverted, so normals point inward)
    for (let ring = 0; ring <= rings; ring++) {
      const phi = (ring / rings) * Math.PI; // 0 to π
      const y = Math.cos(phi);
      const ringRadius = Math.sin(phi);

      for (let seg = 0; seg <= segments; seg++) {
        const theta = (seg / segments) * 2 * Math.PI; // 0 to 2π
        const x = ringRadius * Math.cos(theta);
        const z = ringRadius * Math.sin(theta);

        // Invert the sphere (negative radius) so we're inside it
        vertices.push(-x * radius, -y * radius, -z * radius);
      }
    }

    // Generate indices
    for (let ring = 0; ring < rings; ring++) {
      for (let seg = 0; seg < segments; seg++) {
        const current = ring * (segments + 1) + seg;
        const next = current + segments + 1;

        // Two triangles per quad (reversed winding for inverted sphere)
        indices.push(current, next, current + 1);
        indices.push(current + 1, next, next + 1);
      }
    }

    this.indexCount = indices.length;

    // Create VAO
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    // Create and bind vertex buffer
    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    // Set up vertex attribute
    const aPosition = gl.getAttribLocation(this.program!, 'aPosition');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);

    // Create and bind index buffer
    this.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    gl.bindVertexArray(null);
  }

  private loadTexture(): void {
    const { gl } = this;

    // If no image URL provided, skip loading and use fallback gradient
    if (!this.imageUrl) {
      console.log('[StaticSkyImageLayer] No sky image URL provided, using fallback gradient');
      this.textureLoaded = false;
      return;
    }

    // Create texture
    this.texture = gl.createTexture();
    if (!this.texture) {
      console.error('Failed to create sky texture');
      return;
    }

    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    // Set placeholder pixel while loading
    const placeholder = new Uint8Array([20, 30, 50, 255]); // Dark blue
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, placeholder);

    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Load image
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Allow CORS

    img.onload = () => {
      if (!this.texture) return;

      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      this.textureLoaded = true;
      console.log('[StaticSkyImageLayer] Sky texture loaded successfully');
    };

    img.onerror = (error) => {
      console.error('[StaticSkyImageLayer] Failed to load sky texture:', this.imageUrl, error);
      this.textureLoaded = false;
    };

    img.src = this.imageUrl;
  }
}
