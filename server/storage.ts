import { 
  type Command, 
  type InsertCommand,
  type CelestialTarget,
  type InsertCelestialTarget,
  type ImagingSequence,
  type InsertImagingSequence,
  type ImagingSequenceFrame,
  type InsertImagingSequenceFrame,
  commands,
  celestialTargets,
  imagingSequences,
  imagingSequenceFrames
} from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { eq, desc } from "drizzle-orm";
import ws from "ws";

neonConfig.webSocketConstructor = ws as any;

export interface IStorage {
  // Command History
  createCommand(command: InsertCommand): Promise<Command>;
  getCommandHistory(): Promise<Command[]>;
  getCommand(id: string): Promise<Command | undefined>;
  updateCommandStatus(id: string, status: string, result?: string): Promise<void>;
  toggleCommandFavorite(id: string): Promise<void>;
  clearCommandHistory(): Promise<void>;

  // Celestial Targets
  getCelestialTargets(): Promise<CelestialTarget[]>;
  getCelestialTargetByName(name: string): Promise<CelestialTarget | undefined>;
  createCelestialTarget(target: InsertCelestialTarget): Promise<CelestialTarget>;

  // Imaging Sequences
  createImagingSequence(sequence: InsertImagingSequence): Promise<ImagingSequence>;
  getImagingSequences(): Promise<ImagingSequence[]>;
  getImagingSequence(id: string): Promise<ImagingSequence | undefined>;
  updateImagingSequenceStatus(id: string, status: string, completedFrames?: number): Promise<void>;
  deleteImagingSequence(id: string): Promise<void>;

  // Imaging Sequence Frames
  createImagingSequenceFrame(frame: InsertImagingSequenceFrame): Promise<ImagingSequenceFrame>;
  getImagingSequenceFrames(sequenceId: string): Promise<ImagingSequenceFrame[]>;
  updateFrameProgress(frameId: string, completed: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private commands: Map<string, Command>;
  private celestialTargets: Map<string, CelestialTarget>;

  constructor() {
    this.commands = new Map();
    this.celestialTargets = new Map();
    this.initializeCelestialDatabase();
  }

  // Initialize with common celestial objects
  private initializeCelestialDatabase() {
    const targets: InsertCelestialTarget[] = [
      // Planets
      { name: "Mars", type: "planet", ra: 1.5, dec: 15.0, magnitude: -2.0, constellation: "Aries", description: "The Red Planet" },
      { name: "Jupiter", type: "planet", ra: 3.2, dec: 17.5, magnitude: -2.5, constellation: "Taurus", description: "Gas giant with Great Red Spot" },
      { name: "Saturn", type: "planet", ra: 14.5, dec: -12.0, magnitude: 0.5, constellation: "Virgo", description: "The Ringed Planet" },
      { name: "Venus", type: "planet", ra: 22.0, dec: -10.0, magnitude: -4.0, constellation: "Aquarius", description: "Evening Star" },
      
      // Deep Sky Objects
      { name: "Andromeda Galaxy", type: "galaxy", ra: 0.71, dec: 41.27, magnitude: 3.4, constellation: "Andromeda", description: "M31, nearest major galaxy" },
      { name: "Orion Nebula", type: "nebula", ra: 5.59, dec: -5.39, magnitude: 4.0, constellation: "Orion", description: "M42, stellar nursery" },
      { name: "Pleiades", type: "cluster", ra: 3.79, dec: 24.12, magnitude: 1.6, constellation: "Taurus", description: "M45, Seven Sisters" },
      { name: "Whirlpool Galaxy", type: "galaxy", ra: 13.5, dec: 47.2, magnitude: 8.4, constellation: "Canes Venatici", description: "M51, interacting galaxies" },
      { name: "Ring Nebula", type: "nebula", ra: 18.89, dec: 33.03, magnitude: 8.8, constellation: "Lyra", description: "M57, planetary nebula" },
      { name: "Hercules Cluster", type: "cluster", ra: 16.69, dec: 36.46, magnitude: 5.8, constellation: "Hercules", description: "M13, globular cluster" },
      
      // Bright Stars
      { name: "Sirius", type: "star", ra: 6.75, dec: -16.72, magnitude: -1.46, constellation: "Canis Major", description: "Brightest star in the night sky" },
      { name: "Vega", type: "star", ra: 18.62, dec: 38.78, magnitude: 0.03, constellation: "Lyra", description: "Summer Triangle star" },
      { name: "Betelgeuse", type: "star", ra: 5.92, dec: 7.41, magnitude: 0.5, constellation: "Orion", description: "Red supergiant" },
      { name: "Polaris", type: "star", ra: 2.53, dec: 89.26, magnitude: 1.98, constellation: "Ursa Minor", description: "North Star" },
    ];

    targets.forEach(target => {
      const id = randomUUID();
      this.celestialTargets.set(id, { ...target, id });
    });
  }

  // Command methods
  async createCommand(insertCommand: InsertCommand): Promise<Command> {
    const id = randomUUID();
    const command: Command = { 
      ...insertCommand, 
      id,
      timestamp: new Date(),
    };
    this.commands.set(id, command);
    return command;
  }

  async getCommandHistory(): Promise<Command[]> {
    return Array.from(this.commands.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50); // Return last 50 commands
  }

  async getCommand(id: string): Promise<Command | undefined> {
    return this.commands.get(id);
  }

  async updateCommandStatus(id: string, status: string, result?: string): Promise<void> {
    const command = this.commands.get(id);
    if (command) {
      command.status = status;
      if (result !== undefined) {
        command.result = result;
      }
      this.commands.set(id, command);
    }
  }

  async toggleCommandFavorite(id: string): Promise<void> {
    const command = this.commands.get(id);
    if (command) {
      command.isFavorite = !command.isFavorite;
      this.commands.set(id, command);
    }
  }

  async clearCommandHistory(): Promise<void> {
    this.commands.clear();
  }

  // Celestial Target methods
  async getCelestialTargets(): Promise<CelestialTarget[]> {
    return Array.from(this.celestialTargets.values())
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getCelestialTargetByName(name: string): Promise<CelestialTarget | undefined> {
    return Array.from(this.celestialTargets.values())
      .find(target => target.name.toLowerCase() === name.toLowerCase());
  }

  async createCelestialTarget(insertTarget: InsertCelestialTarget): Promise<CelestialTarget> {
    const id = randomUUID();
    const target: CelestialTarget = { ...insertTarget, id };
    this.celestialTargets.set(id, target);
    return target;
  }

  // Imaging Sequence methods (stub - not implemented in MemStorage)
  async createImagingSequence(_sequence: InsertImagingSequence): Promise<ImagingSequence> {
    throw new Error("Imaging sequences not supported in MemStorage");
  }

  async getImagingSequences(): Promise<ImagingSequence[]> {
    return [];
  }

  async getImagingSequence(_id: string): Promise<ImagingSequence | undefined> {
    return undefined;
  }

  async updateImagingSequenceStatus(_id: string, _status: string, _completedFrames?: number): Promise<void> {
    // No-op
  }

  async deleteImagingSequence(_id: string): Promise<void> {
    // No-op
  }

  async createImagingSequenceFrame(_frame: InsertImagingSequenceFrame): Promise<ImagingSequenceFrame> {
    throw new Error("Imaging sequence frames not supported in MemStorage");
  }

  async getImagingSequenceFrames(_sequenceId: string): Promise<ImagingSequenceFrame[]> {
    return [];
  }

  async updateFrameProgress(_frameId: string, _completed: number): Promise<void> {
    // No-op
  }
}

// Database Storage Implementation
export class DbStorage implements IStorage {
  private db;
  private initialized = false;

  constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.db = drizzle(pool);
  }

  async initialize(): Promise<void> {
    if (!this.initialized) {
      await this.seedCelestialTargetsIfEmpty();
      this.initialized = true;
    }
  }

  private async seedCelestialTargetsIfEmpty(): Promise<void> {
    try {
      const existingTargets = await this.getCelestialTargets();
      if (existingTargets.length === 0) {
        console.log("Seeding celestial targets database...");
        const initialTargets: InsertCelestialTarget[] = [
          // Planets
          { name: "Mars", type: "planet", ra: 1.5, dec: 15.0, magnitude: -2.0, constellation: "Aries", description: "The Red Planet" },
          { name: "Jupiter", type: "planet", ra: 3.2, dec: 17.5, magnitude: -2.5, constellation: "Taurus", description: "Gas giant with Great Red Spot" },
          { name: "Saturn", type: "planet", ra: 14.5, dec: -12.0, magnitude: 0.5, constellation: "Virgo", description: "The Ringed Planet" },
          { name: "Venus", type: "planet", ra: 22.0, dec: -10.0, magnitude: -4.0, constellation: "Aquarius", description: "Evening Star" },
          
          // Deep Sky Objects
          { name: "Andromeda Galaxy", type: "galaxy", ra: 0.71, dec: 41.27, magnitude: 3.4, constellation: "Andromeda", description: "M31, nearest major galaxy" },
          { name: "Orion Nebula", type: "nebula", ra: 5.59, dec: -5.39, magnitude: 4.0, constellation: "Orion", description: "M42, stellar nursery" },
          { name: "Pleiades", type: "cluster", ra: 3.79, dec: 24.12, magnitude: 1.6, constellation: "Taurus", description: "M45, Seven Sisters" },
          { name: "Whirlpool Galaxy", type: "galaxy", ra: 13.5, dec: 47.2, magnitude: 8.4, constellation: "Canes Venatici", description: "M51, interacting galaxies" },
          { name: "Ring Nebula", type: "nebula", ra: 18.89, dec: 33.03, magnitude: 8.8, constellation: "Lyra", description: "M57, planetary nebula" },
          { name: "Hercules Cluster", type: "cluster", ra: 16.69, dec: 36.46, magnitude: 5.8, constellation: "Hercules", description: "M13, globular cluster" },
          
          // Bright Stars
          { name: "Sirius", type: "star", ra: 6.75, dec: -16.72, magnitude: -1.46, constellation: "Canis Major", description: "Brightest star in the night sky" },
          { name: "Vega", type: "star", ra: 18.62, dec: 38.78, magnitude: 0.03, constellation: "Lyra", description: "Summer Triangle star" },
          { name: "Betelgeuse", type: "star", ra: 5.92, dec: 7.41, magnitude: 0.5, constellation: "Orion", description: "Red supergiant" },
          { name: "Polaris", type: "star", ra: 2.53, dec: 89.26, magnitude: 1.98, constellation: "Ursa Minor", description: "North Star" },
        ];

        for (const target of initialTargets) {
          try {
            await this.createCelestialTarget(target);
          } catch (error) {
            // Ignore duplicate key errors
            console.log(`Target ${target.name} already exists`);
          }
        }
        console.log(`Seeded ${initialTargets.length} celestial targets`);
      }
    } catch (error) {
      console.error("Error seeding celestial targets:", error);
    }
  }

  // Command methods
  async createCommand(insertCommand: InsertCommand): Promise<Command> {
    const [command] = await this.db
      .insert(commands)
      .values(insertCommand)
      .returning();
    return command;
  }

  async getCommandHistory(): Promise<Command[]> {
    return await this.db
      .select()
      .from(commands)
      .orderBy(desc(commands.timestamp))
      .limit(50);
  }

  async getCommand(id: string): Promise<Command | undefined> {
    const [command] = await this.db
      .select()
      .from(commands)
      .where(eq(commands.id, id))
      .limit(1);
    return command;
  }

  async updateCommandStatus(id: string, status: string, result?: string): Promise<void> {
    await this.db
      .update(commands)
      .set({ status, result })
      .where(eq(commands.id, id));
  }

  async toggleCommandFavorite(id: string): Promise<void> {
    const command = await this.getCommand(id);
    if (command) {
      await this.db
        .update(commands)
        .set({ isFavorite: !command.isFavorite })
        .where(eq(commands.id, id));
    }
  }

  async clearCommandHistory(): Promise<void> {
    await this.db.delete(commands);
  }

  // Celestial Target methods
  async getCelestialTargets(): Promise<CelestialTarget[]> {
    return await this.db
      .select()
      .from(celestialTargets)
      .orderBy(celestialTargets.name);
  }

  async getCelestialTargetByName(name: string): Promise<CelestialTarget | undefined> {
    const targets = await this.db
      .select()
      .from(celestialTargets)
      .where(eq(celestialTargets.name, name))
      .limit(1);
    return targets[0];
  }

  async createCelestialTarget(insertTarget: InsertCelestialTarget): Promise<CelestialTarget> {
    const [target] = await this.db
      .insert(celestialTargets)
      .values(insertTarget)
      .returning();
    return target;
  }

  // Imaging Sequence methods
  async createImagingSequence(sequence: InsertImagingSequence): Promise<ImagingSequence> {
    const [result] = await this.db
      .insert(imagingSequences)
      .values(sequence)
      .returning();
    return result;
  }

  async getImagingSequences(): Promise<ImagingSequence[]> {
    return await this.db
      .select()
      .from(imagingSequences)
      .orderBy(desc(imagingSequences.created));
  }

  async getImagingSequence(id: string): Promise<ImagingSequence | undefined> {
    const [result] = await this.db
      .select()
      .from(imagingSequences)
      .where(eq(imagingSequences.id, id))
      .limit(1);
    return result;
  }

  async updateImagingSequenceStatus(id: string, status: string, completedFrames?: number): Promise<void> {
    const updates: any = { status };
    if (status === "running" && !await this.getImagingSequence(id).then(s => s?.started)) {
      updates.started = new Date();
    }
    if (status === "completed" || status === "failed") {
      updates.completed = new Date();
    }
    if (completedFrames !== undefined) {
      updates.completedFrames = completedFrames;
    }
    await this.db
      .update(imagingSequences)
      .set(updates)
      .where(eq(imagingSequences.id, id));
  }

  async deleteImagingSequence(id: string): Promise<void> {
    await this.db.delete(imagingSequences).where(eq(imagingSequences.id, id));
  }

  // Imaging Sequence Frame methods
  async createImagingSequenceFrame(frame: InsertImagingSequenceFrame): Promise<ImagingSequenceFrame> {
    const [result] = await this.db
      .insert(imagingSequenceFrames)
      .values(frame)
      .returning();
    return result;
  }

  async getImagingSequenceFrames(sequenceId: string): Promise<ImagingSequenceFrame[]> {
    return await this.db
      .select()
      .from(imagingSequenceFrames)
      .where(eq(imagingSequenceFrames.sequenceId, sequenceId))
      .orderBy(imagingSequenceFrames.orderIndex, imagingSequenceFrames.id);
  }

  async updateFrameProgress(frameId: string, completed: number): Promise<void> {
    await this.db
      .update(imagingSequenceFrames)
      .set({ completed })
      .where(eq(imagingSequenceFrames.id, frameId));
  }
}

export const storage = new DbStorage();

// Initialize storage on module load
export async function initializeStorage() {
  await storage.initialize();
  console.log("Database storage initialized");
}
