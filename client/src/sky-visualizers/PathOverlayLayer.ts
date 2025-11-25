/**
 * PathOverlayLayer: Renders sky paths as colored lines on the celestial dome
 * Overlays object trajectories on top of the star backdrop
 */

import type { RenderContext, RenderLayer } from '@/simulatedSkyBackdrop/renderer/SceneHost';

interface PathPoint {
  alt: number; // degrees
  az: number; // degrees
  visible: boolean;
}

interface ObjectPath {
  id: number;
  points: PathPoint[];
  color: string; // hex color
}

const VERTEX_SHADER = `#version 300 es
precision highp float;

uniform mat4 uProjection;
uniform mat4 uView;

in vec3 aPosition;
in vec3 aColor;

out vec3 vColor;

void main() {
  vColor = aColor;

  // Remove translation from view matrix (keep only rotation)
  mat4 viewNoTranslation = uView;
  viewNoTranslation[3][0] = 0.0;
  viewNoTranslation[3][1] = 0.0;
  viewNoTranslation[3][2] = 0.0;

  vec4 pos = uProjection * viewNoTranslation * vec4(aPosition, 1.0);
  gl_Position = pos;
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec3 vColor;
out vec4 fragColor;

void main() {
  fragColor = vec4(vColor, 1.0);
}
`;

const MARKER_VERTEX_SHADER = `#version 300 es
precision highp float;

uniform mat4 uProjection;
uniform mat4 uView;
uniform float uPointSize;

in vec3 aPosition;
in vec3 aColor;

out vec3 vColor;

void main() {
  vColor = aColor;

  // Remove translation from view matrix
  mat4 viewNoTranslation = uView;
  viewNoTranslation[3][0] = 0.0;
  viewNoTranslation[3][1] = 0.0;
  viewNoTranslation[3][2] = 0.0;

  vec4 pos = uProjection * viewNoTranslation * vec4(aPosition, 1.0);
  gl_Position = pos;
  gl_PointSize = uPointSize;
}
`;

const MARKER_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec3 vColor;
out vec4 fragColor;

void main() {
  // Draw circular points
  vec2 coord = gl_PointCoord - vec2(0.5);
  if (length(coord) > 0.5) {
    discard;
  }
  fragColor = vec4(vColor, 1.0);
}
`;

interface PathSegment {
  startIndex: number;
  count: number;
  color: { r: number; g: number; b: number };
}

export class PathOverlayLayer implements RenderLayer {
  private gl: WebGL2RenderingContext;
  private lineProgram: WebGLProgram | null = null;
  private markerProgram: WebGLProgram | null = null;
  private lineVao: WebGLVertexArrayObject | null = null;
  private markerVao: WebGLVertexArrayObject | null = null;
  private lineVertexBuffer: WebGLBuffer | null = null;
  private markerVertexBuffer: WebGLBuffer | null = null;

  private paths: ObjectPath[] = [];
  private pathSegments: PathSegment[] = [];
  private markerVertexCount: number = 0;

  // Uniform locations
  private lineUProjection: WebGLUniformLocation | null = null;
  private lineUView: WebGLUniformLocation | null = null;
  private markerUProjection: WebGLUniformLocation | null = null;
  private markerUView: WebGLUniformLocation | null = null;
  private markerUPointSize: WebGLUniformLocation | null = null;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.initialize();
  }

  /**
   * Update the paths to render
   */
  updatePaths(paths: ObjectPath[]): void {
    this.paths = paths;
    this.rebuildGeometry();
  }

  render(ctx: RenderContext): void {
    const { gl } = this;

    // Render path lines - each path segment separately
    if (this.lineProgram && this.lineVao && this.pathSegments.length > 0) {
      gl.useProgram(this.lineProgram);
      gl.bindVertexArray(this.lineVao);

      if (this.lineUProjection) {
        gl.uniformMatrix4fv(this.lineUProjection, false, ctx.projectionMatrix);
      }
      if (this.lineUView) {
        gl.uniformMatrix4fv(this.lineUView, false, ctx.viewMatrix);
      }

      // Disable depth test so paths render on top of sky
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.lineWidth(2.0);

      // Render each path segment separately
      for (const segment of this.pathSegments) {
        if (segment.count > 1) {
          gl.drawArrays(gl.LINE_STRIP, segment.startIndex, segment.count);
        }
      }

      gl.enable(gl.DEPTH_TEST);
      gl.bindVertexArray(null);
    }

    // Render markers (current positions)
    if (this.markerProgram && this.markerVao && this.markerVertexCount > 0) {
      gl.useProgram(this.markerProgram);
      gl.bindVertexArray(this.markerVao);

      if (this.markerUProjection) {
        gl.uniformMatrix4fv(this.markerUProjection, false, ctx.projectionMatrix);
      }
      if (this.markerUView) {
        gl.uniformMatrix4fv(this.markerUView, false, ctx.viewMatrix);
      }
      if (this.markerUPointSize) {
        gl.uniform1f(this.markerUPointSize, 12.0);
      }

      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.POINTS, 0, this.markerVertexCount);

      gl.enable(gl.DEPTH_TEST);
      gl.bindVertexArray(null);
    }
  }

  dispose(): void {
    const { gl } = this;

    if (this.lineVao) {
      gl.deleteVertexArray(this.lineVao);
      this.lineVao = null;
    }
    if (this.markerVao) {
      gl.deleteVertexArray(this.markerVao);
      this.markerVao = null;
    }
    if (this.lineVertexBuffer) {
      gl.deleteBuffer(this.lineVertexBuffer);
      this.lineVertexBuffer = null;
    }
    if (this.markerVertexBuffer) {
      gl.deleteBuffer(this.markerVertexBuffer);
      this.markerVertexBuffer = null;
    }
    if (this.lineProgram) {
      gl.deleteProgram(this.lineProgram);
      this.lineProgram = null;
    }
    if (this.markerProgram) {
      gl.deleteProgram(this.markerProgram);
      this.markerProgram = null;
    }
  }

  // ===== Private Methods =====

  private initialize(): void {
    console.log('[PathOverlayLayer] Initializing...');

    this.lineProgram = this.createShaderProgram(VERTEX_SHADER, FRAGMENT_SHADER);
    this.markerProgram = this.createShaderProgram(MARKER_VERTEX_SHADER, MARKER_FRAGMENT_SHADER);

    if (!this.lineProgram) {
      console.error('[PathOverlayLayer] Failed to create line shader program');
      throw new Error('Failed to create path overlay line shader program');
    }

    if (!this.markerProgram) {
      console.error('[PathOverlayLayer] Failed to create marker shader program');
      throw new Error('Failed to create path overlay marker shader program');
    }

    // Get uniform locations for line program
    this.lineUProjection = this.gl.getUniformLocation(this.lineProgram, 'uProjection');
    this.lineUView = this.gl.getUniformLocation(this.lineProgram, 'uView');

    // Get uniform locations for marker program
    this.markerUProjection = this.gl.getUniformLocation(this.markerProgram, 'uProjection');
    this.markerUView = this.gl.getUniformLocation(this.markerProgram, 'uView');
    this.markerUPointSize = this.gl.getUniformLocation(this.markerProgram, 'uPointSize');

    // Create VAOs
    this.createLineVAO();
    this.createMarkerVAO();

    console.log('[PathOverlayLayer] Initialization complete');
  }

  private createShaderProgram(vertexSource: string, fragmentSource: string): WebGLProgram | null {
    const { gl } = this;

    const vertShader = this.compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);

    if (!vertShader || !fragShader) {
      return null;
    }

    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Path overlay shader program link error:', gl.getProgramInfoLog(program));
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
      console.error('Path overlay shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private createLineVAO(): void {
    const { gl } = this;

    this.lineVao = gl.createVertexArray();
    gl.bindVertexArray(this.lineVao);

    this.lineVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineVertexBuffer);

    // Set up vertex attributes (position + color)
    const aPosition = gl.getAttribLocation(this.lineProgram!, 'aPosition');
    const aColor = gl.getAttribLocation(this.lineProgram!, 'aColor');

    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 24, 0);

    gl.enableVertexAttribArray(aColor);
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 24, 12);

    gl.bindVertexArray(null);
  }

  private createMarkerVAO(): void {
    const { gl } = this;

    this.markerVao = gl.createVertexArray();
    gl.bindVertexArray(this.markerVao);

    this.markerVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.markerVertexBuffer);

    // Set up vertex attributes (position + color)
    const aPosition = gl.getAttribLocation(this.markerProgram!, 'aPosition');
    const aColor = gl.getAttribLocation(this.markerProgram!, 'aColor');

    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 24, 0);

    gl.enableVertexAttribArray(aColor);
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 24, 12);

    gl.bindVertexArray(null);
  }

  private rebuildGeometry(): void {
    const { gl } = this;

    // Build line geometry
    const lineVertices: number[] = [];
    const markerVertices: number[] = [];
    this.pathSegments = [];

    console.log('[PathOverlayLayer] Rebuilding geometry for', this.paths.length, 'paths');

    for (const path of this.paths) {
      const color = this.hexToRgb(path.color);
      const segmentStart = lineVertices.length / 6; // Track start index for this path
      let segmentVertexCount = 0;

      for (let i = 0; i < path.points.length; i++) {
        const point = path.points[i];

        if (!point.visible) {
          continue;
        }

        const pos = this.altAzToCartesian(point.alt, point.az);

        // Add to line vertices
        lineVertices.push(
          pos.x, pos.y, pos.z,
          color.r, color.g, color.b
        );
        segmentVertexCount++;

        // If this is the first point (current position), add a marker
        if (i === 0 && point.visible) {
          markerVertices.push(
            pos.x, pos.y, pos.z,
            color.r, color.g, color.b
          );
        }
      }

      // Add this path as a segment if it has vertices
      if (segmentVertexCount > 0) {
        this.pathSegments.push({
          startIndex: segmentStart,
          count: segmentVertexCount,
          color: color,
        });
        console.log(`[PathOverlayLayer] Path ${path.id}: ${segmentVertexCount} visible points from ${path.points.length} total`);
      }
    }

    // Update line buffer
    if (lineVertices.length > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.lineVertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineVertices), gl.DYNAMIC_DRAW);
      console.log('[PathOverlayLayer] Created line buffer with', lineVertices.length / 6, 'vertices');
    } else {
      console.log('[PathOverlayLayer] No line vertices to render');
    }

    // Update marker buffer
    if (markerVertices.length > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.markerVertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(markerVertices), gl.DYNAMIC_DRAW);
      this.markerVertexCount = markerVertices.length / 6;
      console.log('[PathOverlayLayer] Created marker buffer with', this.markerVertexCount, 'markers');
    } else {
      this.markerVertexCount = 0;
    }
  }

  /**
   * Convert Alt/Az to 3D Cartesian coordinates on unit sphere
   * Sphere radius is slightly larger than sky dome to render on top
   */
  private altAzToCartesian(altDeg: number, azDeg: number): { x: number; y: number; z: number } {
    const radius = 95; // Slightly smaller than sky dome (100) to render inside

    const altRad = altDeg * (Math.PI / 180);
    const azRad = azDeg * (Math.PI / 180);

    // Convert to Cartesian (standard spherical coordinates)
    // x = East, y = Up, z = North
    const x = radius * Math.cos(altRad) * Math.sin(azRad);
    const y = radius * Math.sin(altRad);
    const z = radius * Math.cos(altRad) * Math.cos(azRad);

    return { x, y, z };
  }

  /**
   * Convert hex color to RGB floats
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
      return { r: 1.0, g: 1.0, b: 1.0 };
    }
    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
    };
  }
}
