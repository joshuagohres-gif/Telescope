import { storage } from "../storage";
import { type ImagingSequence, type ImagingSequenceFrame } from "@shared/schema";
import { telescopeSimulator } from "./telescope-simulator";

export class ImagingSequenceExecutor {
  private activeSequence: ImagingSequence | null = null;
  private currentFrameIndex: number = 0;
  private isPaused: boolean = false;
  private isRunning: boolean = false;

  async startSequence(sequenceId: string): Promise<void> {
    const sequence = await storage.getImagingSequence(sequenceId);
    if (!sequence) {
      throw new Error("Sequence not found");
    }

    if (this.isRunning) {
      throw new Error("Another sequence is already running");
    }

    this.activeSequence = sequence;
    this.currentFrameIndex = 0;
    this.isPaused = false;
    this.isRunning = true;

    await storage.updateImagingSequenceStatus(sequenceId, "running", 0);
    
    // Reload to sync cached object after status update
    const refreshed = await storage.getImagingSequence(sequenceId);
    if (refreshed) {
      this.activeSequence = refreshed;
    }
    
    // Start execution asynchronously with error handling
    this.executeSequence(sequenceId).catch(error => {
      console.error("Sequence execution failed:", error);
      // Error already handled in executeSequence
    });
  }

  async pauseSequence(): Promise<void> {
    this.isPaused = true;
    if (this.activeSequence) {
      await storage.updateImagingSequenceStatus(this.activeSequence.id, "paused");
      
      // Reload to sync cached object
      const updated = await storage.getImagingSequence(this.activeSequence.id);
      if (updated) {
        this.activeSequence = updated;
      }
    }
  }

  async resumeSequence(): Promise<void> {
    this.isPaused = false;
    if (this.activeSequence) {
      await storage.updateImagingSequenceStatus(this.activeSequence.id, "running");
      
      // Reload to sync cached object after status update
      const refreshed = await storage.getImagingSequence(this.activeSequence.id);
      if (refreshed) {
        this.activeSequence = refreshed;
      }
      
      // Resume execution asynchronously with error handling
      this.executeSequence(this.activeSequence.id).catch(error => {
        console.error("Sequence execution failed on resume:", error);
        // Error already handled in executeSequence
      });
    }
  }

  async stopSequence(): Promise<void> {
    this.isPaused = true;
    this.isRunning = false;
    if (this.activeSequence) {
      // Mark as stopped (cancelled by user)
      await storage.updateImagingSequenceStatus(this.activeSequence.id, "stopped");
      this.activeSequence = null;
    }
  }

  getActiveSequence(): ImagingSequence | null {
    return this.activeSequence;
  }

  getCurrentProgress(): { sequenceId: string; currentFrame: number; totalFrames: number } | null {
    if (!this.activeSequence) return null;
    return {
      sequenceId: this.activeSequence.id,
      currentFrame: this.currentFrameIndex,
      totalFrames: this.activeSequence.totalFrames,
    };
  }

  private async executeSequence(sequenceId: string): Promise<void> {
    const MAX_RETRIES = 3;
    
    try {
      const frames = await storage.getImagingSequenceFrames(sequenceId);
      const sequence = await storage.getImagingSequence(sequenceId);
      if (!sequence) {
        return;
      }

      // Initialize totalCompleted from already-completed frames (for resume support)
      let totalCompleted = frames.reduce((sum, frame) => sum + frame.completed, 0);
      let currentFrameIndex = 0;

      for (const frame of frames) {
        if (this.isPaused || !this.isRunning) {
          return; // Stop execution if paused or stopped
        }

        // Execute each sub-frame with error handling and retry logic
        for (let i = frame.completed; i < frame.count; i++) {
          if (this.isPaused || !this.isRunning) {
            return;
          }

          let retries = 0;
          let frameSuccess = false;

          while (!frameSuccess && retries < MAX_RETRIES) {
            try {
              // Configure camera
              await this.configureCamera(frame);

              // Dither if needed (simple offset)
              if (frame.dither && i > 0) {
                await this.performDither(frame.ditherPixels || 3);
              }

              // Capture frame
              await this.captureFrame(frame);

              // Success - update progress
              await storage.updateFrameProgress(frame.id, i + 1);
              totalCompleted++;
              this.currentFrameIndex = currentFrameIndex;
              await storage.updateImagingSequenceStatus(sequenceId, "running", totalCompleted);
              
              // Reload active sequence to keep cached object in sync
              const updated = await storage.getImagingSequence(sequenceId);
              if (updated) {
                this.activeSequence = updated;
              }

              frameSuccess = true;

              // Small delay between frames
              await this.delay(1000);
            } catch (error) {
              retries++;
              console.error(`Error capturing frame ${i + 1} of ${frame.count} (attempt ${retries}/${MAX_RETRIES}):`, error);
              
              if (retries >= MAX_RETRIES) {
                // Max retries exceeded - mark sequence as failed and stop
                console.error(`Frame capture failed after ${MAX_RETRIES} attempts - marking sequence as failed`);
                this.isRunning = false;
                await storage.updateImagingSequenceStatus(sequenceId, "failed", totalCompleted);
                
                // Reload to sync before clearing
                const failedSeq = await storage.getImagingSequence(sequenceId);
                if (failedSeq) {
                  this.activeSequence = failedSeq;
                }
                
                await this.delay(500);
                this.activeSequence = null;
                return; // Stop execution
              } else {
                // Wait before retry
                await this.delay(2000);
              }
            }
          }
        }
        
        currentFrameIndex++;
      }

      // Sequence complete
      this.isRunning = false;
      await storage.updateImagingSequenceStatus(sequenceId, "completed", totalCompleted);
      
      // Reload one final time before clearing
      const final = await storage.getImagingSequence(sequenceId);
      if (final) {
        this.activeSequence = final;
      }
      
      // Small delay to allow clients to fetch final status
      await this.delay(500);
      this.activeSequence = null;
    } catch (error) {
      // Sequence-level error
      console.error(`Fatal error executing sequence ${sequenceId}:`, error);
      this.isRunning = false;
      this.activeSequence = null;
      await storage.updateImagingSequenceStatus(sequenceId, "failed");
      // Don't rethrow - let the .catch() handler in startSequence/resumeSequence handle it
    }
  }

  private async configureCamera(frame: ImagingSequenceFrame): Promise<void> {
    // Camera configuration happens in the capture method
    // No direct access to camera state needed
  }

  private async captureFrame(frame: ImagingSequenceFrame): Promise<void> {
    // Start exposure
    await telescopeSimulator.startExposure(
      frame.exposureTime,
      frame.gain,
      frame.binning as 1 | 2 | 3 | 4
    );

    // Wait for exposure to complete
    const duration = frame.exposureTime * 1000;
    await this.delay(duration);
  }

  private async performDither(pixels: number): Promise<void> {
    // Simple dither: small random offset in RA/Dec
    const offsetRA = (Math.random() - 0.5) * pixels * 0.0001; // Convert pixels to degrees (approx)
    const offsetDec = (Math.random() - 0.5) * pixels * 0.0001;
    
    const currentRA = telescopeSimulator.telescope.position.ra;
    const currentDec = telescopeSimulator.telescope.position.dec;
    
    await telescopeSimulator.gotoCoordinates(
      currentRA + offsetRA,
      currentDec + offsetDec
    );

    // Wait for settle
    await this.delay(2000);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const imagingSequenceExecutor = new ImagingSequenceExecutor();
