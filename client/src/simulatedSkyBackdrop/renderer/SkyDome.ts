/**
 * SkyDome: Inverted sphere for sky background
 * Renders a gradient sky (placeholder until panorama textures are added)
 */

import type { RenderContext, RenderLayer } from './SceneHost';

const VERTEX_SHADER = `#version 300 es
precision highp float;

uniform mat4 uProjection;
uniform mat4 uView;

in vec3 aPosition;

out vec3 vDirection;

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

in vec3 vDirection;
out vec4 fragColor;

// Simple gradient from horizon to zenith
void main() {
  // Height above horizon (-1 to 1)
  float h = vDirection.y;

  // Horizon color (darker blue)
  vec3 horizonColor = vec3(0.1, 0.15, 0.3);

  // Zenith color (dark blue-black)
  vec3 zenithColor = vec3(0.0, 0.0, 0.05);

  // Smooth gradient
  float t = smoothstep(-0.2, 0.8, h);
  vec3 skyColor = mix(horizonColor, zenithColor, t);

  fragColor = vec4(skyColor, 1.0);
}
`;

export class SkyDome implements RenderLayer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private vertexBuffer: WebGLBuffer | null = null;
  private indexBuffer: WebGLBuffer | null = null;
  private indexCount: number = 0;

  // Uniform locations
  private uProjection: WebGLUniformLocation | null = null;
  private uView: WebGLUniformLocation | null = null;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.initialize();
  }

  render(ctx: RenderContext): void {
    if (!this.program || !this.vao) return;

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

    // Render sky dome
    gl.disable(gl.DEPTH_TEST); // Always draw behind everything
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    gl.enable(gl.DEPTH_TEST);

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
      throw new Error('Failed to create sky dome shader program');
    }

    // Get uniform locations
    this.uProjection = this.gl.getUniformLocation(this.program, 'uProjection');
    this.uView = this.gl.getUniformLocation(this.program, 'uView');

    // Create sphere geometry
    this.createSphereGeometry(100, 32, 16); // radius, segments, rings
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
      console.error('Shader program link error:', gl.getProgramInfoLog(program));
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
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
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
}
