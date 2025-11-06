import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, real, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Telescope Commands
export const commands = pgTable("commands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  naturalLanguage: text("natural_language").notNull(),
  structuredCommand: text("structured_command").notNull(), // JSON stringified command
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  status: text("status").notNull().default("pending"), // pending, executing, completed, failed
  result: text("result"), // JSON stringified result or error
  isFavorite: boolean("is_favorite").notNull().default(false),
});

export const insertCommandSchema = createInsertSchema(commands).omit({
  id: true,
  timestamp: true,
});

export type InsertCommand = z.infer<typeof insertCommandSchema>;
export type Command = typeof commands.$inferSelect;

// Celestial Targets Database
export const celestialTargets = pgTable("celestial_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  type: text("type").notNull(), // planet, star, galaxy, nebula, cluster
  ra: real("ra").notNull(), // Right Ascension in hours (0-24)
  dec: real("dec").notNull(), // Declination in degrees (-90 to +90)
  magnitude: real("magnitude"), // Visual magnitude
  constellation: text("constellation"),
  description: text("description"),
});

export const insertCelestialTargetSchema = createInsertSchema(celestialTargets).omit({
  id: true,
});

export type InsertCelestialTarget = z.infer<typeof insertCelestialTargetSchema>;
export type CelestialTarget = typeof celestialTargets.$inferSelect;

// Imaging Sequences
export const imagingSequences = pgTable("imaging_sequences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  targetId: varchar("target_id").references(() => celestialTargets.id),
  targetName: text("target_name"), // For manual targets not in database
  ra: real("ra"), // Override target RA if specified
  dec: real("dec"), // Override target Dec if specified
  status: text("status").notNull().default("pending"), // pending, running, paused, completed, failed
  created: timestamp("created").notNull().defaultNow(),
  started: timestamp("started"),
  completed: timestamp("completed"),
  totalFrames: integer("total_frames").notNull(),
  completedFrames: integer("completed_frames").notNull().default(0),
  estimatedDuration: integer("estimated_duration"), // in seconds
  notes: text("notes"),
});

export const imagingSequenceFrames = pgTable("imaging_sequence_frames", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sequenceId: varchar("sequence_id").notNull().references(() => imagingSequences.id, { onDelete: "cascade" }),
  frameType: text("frame_type").notNull(), // light, dark, flat, bias
  filter: text("filter"), // L, R, G, B, Ha, OIII, SII, etc.
  exposureTime: real("exposure_time").notNull(), // in seconds
  gain: integer("gain").notNull(),
  binning: integer("binning").notNull().default(1),
  count: integer("count").notNull(), // number of frames to capture
  completed: integer("completed").notNull().default(0),
  temperature: real("temperature"), // target sensor temperature
  dither: boolean("dither").notNull().default(false),
  ditherPixels: integer("dither_pixels").default(3),
  orderIndex: integer("order_index").notNull(), // execution order
});

export const insertImagingSequenceSchema = createInsertSchema(imagingSequences).omit({
  id: true,
  created: true,
});

export const insertImagingSequenceFrameSchema = createInsertSchema(imagingSequenceFrames).omit({
  id: true,
});

export type InsertImagingSequence = z.infer<typeof insertImagingSequenceSchema>;
export type ImagingSequence = typeof imagingSequences.$inferSelect;
export type InsertImagingSequenceFrame = z.infer<typeof insertImagingSequenceFrameSchema>;
export type ImagingSequenceFrame = typeof imagingSequenceFrames.$inferSelect;

// TypeScript interfaces for runtime state (not stored in DB)

export interface TelescopePosition {
  ra: number; // Right Ascension in hours
  dec: number; // Declination in degrees
  alt: number; // Altitude in degrees
  az: number; // Azimuth in degrees
}

export interface TelescopeState {
  connected: boolean;
  connectionType: "mock" | "ascom";
  tracking: boolean;
  slewing: boolean;
  parked: boolean;
  position: TelescopePosition;
  targetPosition?: TelescopePosition;
  currentTarget?: string; // Target name
  slewRate?: number; // 1-4, where 4 is fastest
  pierSide?: "east" | "west" | "unknown";
}

export interface CameraState {
  connected: boolean;
  exposing: boolean;
  temperature?: number; // in Celsius
  coolerOn: boolean;
  exposureTime: number; // in seconds
  gain: number; // 0-100
  binning: 1 | 2 | 3 | 4;
  progress?: number; // 0-100 for exposure progress
}

export interface FocuserState {
  connected: boolean;
  moving: boolean;
  position: number; // absolute position
  temperature?: number; // in Celsius
  maxPosition: number;
}

export interface CalibrationData {
  polarAlignmentError?: number; // in arcminutes
  polarAlignmentAz?: number; // azimuth correction in degrees
  polarAlignmentAlt?: number; // altitude correction in degrees
  lastCalibration?: string; // ISO timestamp
}

export interface SystemStatus {
  telescope: TelescopeState;
  camera: CameraState;
  focuser: FocuserState;
  calibration: CalibrationData;
  lastUpdate: string; // ISO timestamp
}

// Command schemas for API
export const telescopeCommandSchema = z.object({
  action: z.enum([
    "goto",
    "slew",
    "track",
    "stop_tracking",
    "park",
    "unpark",
    "home",
    "stop",
    "set_slew_rate",
  ]),
  target: z.string().optional(),
  ra: z.number().min(0).max(24).optional(),
  dec: z.number().min(-90).max(90).optional(),
  alt: z.number().min(0).max(90).optional(),
  az: z.number().min(0).max(360).optional(),
  slewRate: z.number().min(1).max(4).optional(),
});

export type TelescopeCommand = z.infer<typeof telescopeCommandSchema>;

export const cameraCommandSchema = z.object({
  action: z.enum(["capture", "abort", "configure", "set_cooler"]),
  exposureTime: z.number().min(0.001).max(3600).optional(),
  gain: z.number().min(0).max(100).optional(),
  binning: z.number().min(1).max(4).optional(),
  coolerOn: z.boolean().optional(),
});

export type CameraCommand = z.infer<typeof cameraCommandSchema>;

export const focuserCommandSchema = z.object({
  action: z.enum(["move_absolute", "move_relative", "stop"]),
  position: z.number().optional(),
  steps: z.number().optional(),
});

export type FocuserCommand = z.infer<typeof focuserCommandSchema>;

export const calibrationCommandSchema = z.object({
  action: z.enum(["start_polar_alignment", "complete_polar_alignment", "plate_solve"]),
  azCorrection: z.number().optional(),
  altCorrection: z.number().optional(),
});

export type CalibrationCommand = z.infer<typeof calibrationCommandSchema>;

// Natural Language Processing result
export const nlpResultSchema = z.object({
  intent: z.enum([
    "goto_target",
    "track_object",
    "stop_tracking",
    "park",
    "home",
    "capture_image",
    "adjust_focus",
    "calibrate",
    "get_status",
    "unknown",
  ]),
  parameters: z.record(z.any()).optional(),
  confidence: z.number().min(0).max(1),
  explanation: z.string(),
});

export type NLPResult = z.infer<typeof nlpResultSchema>;
