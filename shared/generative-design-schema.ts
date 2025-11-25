import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, uuid, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// ENUMS
// ============================================================================

export const pipelineStageEnum = pgEnum("pipeline_stage", [
  "STAGE_INITIAL_CRITERIA",
  "STAGE_FOLLOWUP_QUESTIONS",
  "STAGE_DOMAIN_CLASSIFIED",
  "STAGE_DOMAIN_ANALYSIS",
  "STAGE_GEOMETRY_AND_TUBES",
  "STAGE_BOM_AND_MASS_ESTIMATE",
  "STAGE_FINAL_REVIEW",
  "STAGE_COMPLETE",
]);

export const designDomainEnum = pgEnum("design_domain", [
  "UNKNOWN",
  "AR", // Apochromatic Refractor
  "NR", // Newtonian Reflector
  "SC", // Schmidt-Cassegrain
  "RASA", // Rowe-Ackermann Schmidt Astrograph
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "active",
  "archived",
  "complete",
]);

export const actorTypeEnum = pgEnum("actor_type", [
  "user",
  "llm",
  "system",
]);

export const stageFlagEnum = pgEnum("stage_flag", [
  "FOLLOW",
  "NEXTPHASE",
  "FINAL",
  "ERROR",
]);

// ============================================================================
// TABLES
// ============================================================================

// Users table - future-proof for authentication
export const users = pgTable("gen_design_users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  externalAuthId: varchar("external_auth_id", { length: 255 }), // For future Auth0, etc.
  displayName: varchar("display_name", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Design sessions - one per telescope design journey
export const designSessions = pgTable("gen_design_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: sessionStatusEnum("status").notNull().default("active"),
  currentStage: pipelineStageEnum("current_stage").notNull().default("STAGE_INITIAL_CRITERIA"),
  selectedDomain: designDomainEnum("selected_domain").notNull().default("UNKNOWN"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Design turns - each message/response in the conversation
export const designTurns = pgTable("gen_design_turns", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  designSessionId: uuid("design_session_id").notNull().references(() => designSessions.id, { onDelete: "cascade" }),
  stage: pipelineStageEnum("stage").notNull(),
  actorType: actorTypeEnum("actor_type").notNull(),
  userVisibleText: text("user_visible_text"),
  llmRawResponse: jsonb("llm_raw_response"), // Full LLM JSON envelope
  llmRequestPayload: jsonb("llm_request_payload"), // What we sent to LLM
  categorizationTags: jsonb("categorization_tags").$type<string[]>().default([]), // Array of tags
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Design state snapshots - major stage checkpoints
export const designStateSnapshots = pgTable("gen_design_state_snapshots", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  designSessionId: uuid("design_session_id").notNull().references(() => designSessions.id, { onDelete: "cascade" }),
  stage: pipelineStageEnum("stage").notNull(),
  selectedDomain: designDomainEnum("selected_domain").notNull(),
  opticalDesign: jsonb("optical_design"), // Mirrors, lenses, focal lengths, etc.
  mechanicalDesign: jsonb("mechanical_design"), // Tube dimensions, focuser geometry, etc.
  bom: jsonb("bom"), // Bill of Materials array
  metadata: jsonb("metadata"), // Extra fields (weight, tolerances, notes, etc.)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// BOM items - normalized Bill of Materials
export const bomItems = pgTable("gen_bom_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  designSessionId: uuid("design_session_id").notNull().references(() => designSessions.id, { onDelete: "cascade" }),
  stage: pipelineStageEnum("stage").notNull(),
  category: varchar("category", { length: 100 }).notNull(), // lens, mirror, eyepiece, material, hardware
  name: text("name").notNull(),
  specs: jsonb("specs"), // diameter, focal length, f/ratio, material, etc.
  estimatedQuantity: text("estimated_quantity"),
  estimatedCost: text("estimated_cost"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Stage transitions - audit log of pipeline progression
export const stageTransitions = pgTable("gen_stage_transitions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  designSessionId: uuid("design_session_id").notNull().references(() => designSessions.id, { onDelete: "cascade" }),
  fromStage: pipelineStageEnum("from_stage").notNull(),
  toStage: pipelineStageEnum("to_stage").notNull(),
  reason: text("reason"),
  triggerTurnId: uuid("trigger_turn_id").references(() => designTurns.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============================================================================
// SCHEMA TYPES
// ============================================================================

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDesignSessionSchema = createInsertSchema(designSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDesignTurnSchema = createInsertSchema(designTurns).omit({
  id: true,
  createdAt: true,
});

export const insertDesignStateSnapshotSchema = createInsertSchema(designStateSnapshots).omit({
  id: true,
  createdAt: true,
});

export const insertBomItemSchema = createInsertSchema(bomItems).omit({
  id: true,
  createdAt: true,
});

export const insertStageTransitionSchema = createInsertSchema(stageTransitions).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type DesignSession = typeof designSessions.$inferSelect;
export type InsertDesignSession = z.infer<typeof insertDesignSessionSchema>;

export type DesignTurn = typeof designTurns.$inferSelect;
export type InsertDesignTurn = z.infer<typeof insertDesignTurnSchema>;

export type DesignStateSnapshot = typeof designStateSnapshots.$inferSelect;
export type InsertDesignStateSnapshot = z.infer<typeof insertDesignStateSnapshotSchema>;

export type BomItem = typeof bomItems.$inferSelect;
export type InsertBomItem = z.infer<typeof insertBomItemSchema>;

export type StageTransition = typeof stageTransitions.$inferSelect;
export type InsertStageTransition = z.infer<typeof insertStageTransitionSchema>;

// ============================================================================
// LLM RESPONSE ENVELOPE SCHEMA
// ============================================================================

export const llmResponseEnvelopeSchema = z.object({
  stage: z.enum([
    "STAGE_INITIAL_CRITERIA",
    "STAGE_FOLLOWUP_QUESTIONS",
    "STAGE_DOMAIN_CLASSIFIED",
    "STAGE_DOMAIN_ANALYSIS",
    "STAGE_GEOMETRY_AND_TUBES",
    "STAGE_BOM_AND_MASS_ESTIMATE",
    "STAGE_FINAL_REVIEW",
    "STAGE_COMPLETE",
  ]),
  next_stage: z.enum([
    "STAGE_INITIAL_CRITERIA",
    "STAGE_FOLLOWUP_QUESTIONS",
    "STAGE_DOMAIN_CLASSIFIED",
    "STAGE_DOMAIN_ANALYSIS",
    "STAGE_GEOMETRY_AND_TUBES",
    "STAGE_BOM_AND_MASS_ESTIMATE",
    "STAGE_FINAL_REVIEW",
    "STAGE_COMPLETE",
  ]),
  stage_flag: z.enum(["FOLLOW", "NEXTPHASE", "FINAL", "ERROR"]),
  domain: z.enum(["UNKNOWN", "AR", "NR", "SC", "RASA"]),
  status: z.string(), // "needs_user_input", "in_progress", "complete_for_stage", etc.
  followup_required: z.boolean(),
  followup_questions: z.array(z.string()),
  user_facing_text: z.string(),
  design_data: z.object({
    classification: z.any().nullable(),
    optical_design: z.any().nullable(),
    mechanical_design: z.any().nullable(),
  }),
  bom: z.array(z.any()),
  metadata: z.object({
    notes: z.array(z.string()).optional().default([]),
    warnings: z.array(z.string()).optional().default([]),
    assumptions: z.array(z.string()).optional().default([]),
    suggested_ui_actions: z.array(z.string()).optional().default([]),
  }),
});

export type LLMResponseEnvelope = z.infer<typeof llmResponseEnvelopeSchema>;

// ============================================================================
// API REQUEST/RESPONSE SCHEMAS
// ============================================================================

export const createDesignSessionRequestSchema = z.object({
  title: z.string().min(1).max(500),
  initialPrompt: z.string().min(1).max(5000),
});

export const addDesignTurnRequestSchema = z.object({
  userMessage: z.string().min(1).max(5000),
});

export type CreateDesignSessionRequest = z.infer<typeof createDesignSessionRequestSchema>;
export type AddDesignTurnRequest = z.infer<typeof addDesignTurnRequestSchema>;

// ============================================================================
// STAGE AND DOMAIN CONSTANTS
// ============================================================================

export const PIPELINE_STAGES = [
  "STAGE_INITIAL_CRITERIA",
  "STAGE_FOLLOWUP_QUESTIONS",
  "STAGE_DOMAIN_CLASSIFIED",
  "STAGE_DOMAIN_ANALYSIS",
  "STAGE_GEOMETRY_AND_TUBES",
  "STAGE_BOM_AND_MASS_ESTIMATE",
  "STAGE_FINAL_REVIEW",
  "STAGE_COMPLETE",
] as const;

export const DESIGN_DOMAINS = [
  "UNKNOWN",
  "AR",
  "NR",
  "SC",
  "RASA",
] as const;

export type PipelineStage = typeof PIPELINE_STAGES[number];
export type DesignDomain = typeof DESIGN_DOMAINS[number];
