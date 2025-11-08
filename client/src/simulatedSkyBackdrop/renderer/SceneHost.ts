/**
 * SceneHost: WebGL2 context and render loop management
 * Orchestrates sky dome and star layer rendering
 */

export interface SceneHostConfig {
  canvas: HTMLCanvasElement;
  enableAntialias?: boolean;
  pixelRatio?: number;
}

export interface RenderContext {
  gl: WebGL2RenderingContext;
  width: number;
  height: number;
  time: number;
  deltaTime: number;
  projectionMatrix: Float32Array;
  viewMatrix: Float32Array;
}

export type RenderLayer = {
  render(ctx: RenderContext): void;
  dispose(): void;
};

export class SceneHost {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private layers: RenderLayer[] = [];
  private rafHandle: number | null = null;
  private lastFrameTime: number = 0;
  private running: boolean = false;

  // Camera matrices
  private projectionMatrix: Float32Array;
  private viewMatrix: Float32Array;

  // Camera orientation (simple orbit for now)
  private cameraYaw: number = 0;
  private cameraPitch: number = 0;
  private cameraFov: number = 60; // degrees

  constructor(config: SceneHostConfig) {
    this.canvas = config.canvas;
    this.projectionMatrix = new Float32Array(16);
    this.viewMatrix = new Float32Array(16);

    // Initialize WebGL2 context
    const gl = this.canvas.getContext('webgl2', {
      antialias: config.enableAntialias ?? true,
      alpha: false,
      depth: true,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      throw new Error('WebGL2 not supported');
    }

    this.gl = gl;

    // Set pixel ratio
    const pixelRatio = config.pixelRatio ?? window.devicePixelRatio ?? 1;
    this.resizeCanvas(pixelRatio);

    // Configure WebGL state
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.0, 0.0, 0.05, 1.0); // Dark blue background

    // Handle context loss
    this.canvas.addEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored);

    // Handle window resize
    window.addEventListener('resize', this.handleResize);
  }

  /**
   * Add a render layer (sky dome, stars, etc.)
   */
  addLayer(layer: RenderLayer): void {
    this.layers.push(layer);
  }

  /**
   * Start the render loop
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = performance.now();
    this.renderLoop(this.lastFrameTime);
  }

  /**
   * Stop the render loop
   */
  stop(): void {
    this.running = false;
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
  }

  /**
   * Set camera orientation
   */
  setCameraOrientation(yaw: number, pitch: number): void {
    console.log(`[SceneHost] setCameraOrientation: yaw=${yaw.toFixed(4)}, pitch=${pitch.toFixed(4)}`);
    this.cameraYaw = yaw;
    this.cameraPitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    console.log(`[SceneHost] Updated camera: yaw=${this.cameraYaw.toFixed(4)}, pitch=${this.cameraPitch.toFixed(4)}`);
    this.updateViewMatrix();
  }

  /**
   * Set camera field of view
   */
  setFieldOfView(fovDegrees: number): void {
    this.cameraFov = Math.max(10, Math.min(120, fovDegrees));
    this.updateProjectionMatrix();
  }

  /**
   * Get current WebGL context
   */
  getContext(): WebGL2RenderingContext | null {
    return this.gl;
  }

  /**
   * Get projection matrix
   */
  getProjectionMatrix(): Float32Array {
    return this.projectionMatrix;
  }

  /**
   * Get view matrix
   */
  getViewMatrix(): Float32Array {
    return this.viewMatrix;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stop();
    this.layers.forEach(layer => layer.dispose());
    this.layers = [];

    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    window.removeEventListener('resize', this.handleResize);

    if (this.gl) {
      const ext = this.gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
      this.gl = null;
    }
  }

  // ===== Private Methods =====

  private renderLoop = (time: number): void => {
    if (!this.running || !this.gl) return;

    const deltaTime = time - this.lastFrameTime;
    this.lastFrameTime = time;

    const ctx: RenderContext = {
      gl: this.gl,
      width: this.canvas.width,
      height: this.canvas.height,
      time: time / 1000, // Convert to seconds
      deltaTime: deltaTime / 1000,
      projectionMatrix: this.projectionMatrix,
      viewMatrix: this.viewMatrix,
    };

    // Clear buffers
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    // Render all layers
    for (const layer of this.layers) {
      layer.render(ctx);
    }

    this.rafHandle = requestAnimationFrame(this.renderLoop);
  };

  private resizeCanvas(pixelRatio: number): void {
    const displayWidth = Math.floor(this.canvas.clientWidth * pixelRatio);
    const displayHeight = Math.floor(this.canvas.clientHeight * pixelRatio);

    if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
      this.updateProjectionMatrix();

      if (this.gl) {
        this.gl.viewport(0, 0, displayWidth, displayHeight);
      }
    }
  }

  private updateProjectionMatrix(): void {
    const aspect = this.canvas.width / this.canvas.height;
    const fovRadians = this.cameraFov * Math.PI / 180;
    const near = 0.1;
    const far = 10000;

    // Create perspective projection matrix
    mat4Perspective(this.projectionMatrix, fovRadians, aspect, near, far);
  }

  private updateViewMatrix(): void {
    // Create view matrix from yaw/pitch
    const cosPitch = Math.cos(this.cameraPitch);
    const sinPitch = Math.sin(this.cameraPitch);
    const cosYaw = Math.cos(this.cameraYaw);
    const sinYaw = Math.sin(this.cameraYaw);

    // Camera direction (looking direction)
    const forwardX = cosPitch * sinYaw;
    const forwardY = sinPitch;
    const forwardZ = cosPitch * cosYaw;

    console.log(`[SceneHost] updateViewMatrix: forward=(${forwardX.toFixed(4)}, ${forwardY.toFixed(4)}, ${forwardZ.toFixed(4)})`);

    // Up vector (always world up for now)
    const upX = 0;
    const upY = 1;
    const upZ = 0;

    // Camera at origin, looking in direction
    mat4LookAt(
      this.viewMatrix,
      0, 0, 0, // eye position
      forwardX, forwardY, forwardZ, // target
      upX, upY, upZ // up
    );
  }

  private handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.stop();
    console.warn('WebGL context lost');
  };

  private handleContextRestored = (): void => {
    console.log('WebGL context restored');
    // Re-initialize layers if needed
    // For now, just restart
    this.start();
  };

  private handleResize = (): void => {
    const pixelRatio = window.devicePixelRatio ?? 1;
    this.resizeCanvas(pixelRatio);
  };
}

// ===== Matrix Math Utilities =====

function mat4Perspective(
  out: Float32Array,
  fovy: number,
  aspect: number,
  near: number,
  far: number
): void {
  const f = 1.0 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);

  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[14] = 2 * far * near * nf;
  out[15] = 0;
}

function mat4LookAt(
  out: Float32Array,
  eyeX: number,
  eyeY: number,
  eyeZ: number,
  targetX: number,
  targetY: number,
  targetZ: number,
  upX: number,
  upY: number,
  upZ: number
): void {
  // Forward = normalize(target - eye)
  let fX = targetX - eyeX;
  let fY = targetY - eyeY;
  let fZ = targetZ - eyeZ;
  let fLen = Math.sqrt(fX * fX + fY * fY + fZ * fZ);
  fX /= fLen;
  fY /= fLen;
  fZ /= fLen;

  // Right = normalize(cross(forward, up))
  let rX = fY * upZ - fZ * upY;
  let rY = fZ * upX - fX * upZ;
  let rZ = fX * upY - fY * upX;
  let rLen = Math.sqrt(rX * rX + rY * rY + rZ * rZ);
  rX /= rLen;
  rY /= rLen;
  rZ /= rLen;

  // Up = cross(right, forward)
  const uX = rY * fZ - rZ * fY;
  const uY = rZ * fX - rX * fZ;
  const uZ = rX * fY - rY * fX;

  // Build view matrix
  out[0] = rX;
  out[1] = uX;
  out[2] = -fX;
  out[3] = 0;
  out[4] = rY;
  out[5] = uY;
  out[6] = -fY;
  out[7] = 0;
  out[8] = rZ;
  out[9] = uZ;
  out[10] = -fZ;
  out[11] = 0;
  out[12] = -(rX * eyeX + rY * eyeY + rZ * eyeZ);
  out[13] = -(uX * eyeX + uY * eyeY + uZ * eyeZ);
  out[14] = fX * eyeX + fY * eyeY + fZ * eyeZ;
  out[15] = 1;
}
