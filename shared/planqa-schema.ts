import { sql } from "drizzle-orm";
import { 
  pgTable, 
  serial, 
  text, 
  varchar, 
  timestamp, 
  real, 
  integer,
  uuid,
  pgEnum,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ===== PLANNING, QA & PERSONALIZATION SCHEMA =====

// Exposure recipes
export const recipeTargetTypeEnum = pgEnum('recipe_target_type', [
  'dso', 'planetary', 'lunar', 'solar', 'widefield', 'other'
]);

export const recipe = pgTable('planqa_recipe', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 256 }).notNull(),
  targetType: recipeTargetTypeEnum('target_type').notNull(),
  filterName: varchar('filter_name', { length: 64 }).notNull(),
  exposureSec: real('exposure_sec').notNull(),
  frameCount: integer('frame_count').notNull(),
  totalExpMin: real('total_exp_min').notNull(),
  binning: varchar('binning', { length: 16 }).notNull().default('1x1'),
  gain: integer('gain'),
  offset: integer('offset'),
  temp_c: real('temp_c'),
  ditherPx: integer('dither_px'),
  notes: text('notes'),
  createdBy: varchar('created_by', { length: 128 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  nameIdx: index('planqa_recipe_name_idx').on(table.name),
  targetTypeIdx: index('planqa_recipe_target_type_idx').on(table.targetType),
}));

// SNR (Signal-to-Noise Ratio) models
export const snrModel = pgTable('planqa_snr_model', {
  id: serial('id').primaryKey(),
  trainId: uuid('train_id').notNull(),
  filterName: varchar('filter_name', { length: 64 }).notNull(),
  targetType: recipeTargetTypeEnum('target_type').notNull(),
  skyMpsas: real('sky_mpsas').notNull(),
  coeffsJson: jsonb('coeffs_json').$type<{ a: number; b: number; c: number }>().notNull(),
  validRange: jsonb('valid_range').$type<{ min_exp: number; max_exp: number }>().notNull(),
  r2: real('r2').notNull(),
  sampleCount: integer('sample_count').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  trainFilterIdx: index('planqa_snr_train_filter_idx').on(table.trainId, table.filterName),
}));

// Imaging sessions
export const session = pgTable('planqa_session', {
  id: uuid('id').primaryKey().defaultRandom(),
  trainId: uuid('train_id').notNull(),
  siteId: uuid('site_id').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  targetName: varchar('target_name', { length: 256 }),
  filterName: varchar('filter_name', { length: 64 }),
  frameCount: integer('frame_count').notNull().default(0),
  totalExpSec: real('total_exp_sec').notNull().default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  trainIdx: index('planqa_session_train_idx').on(table.trainId),
  siteIdx: index('planqa_session_site_idx').on(table.siteId),
  startedIdx: index('planqa_session_started_idx').on(table.startedAt),
}));

// Session quality sub-metrics
export const submetric = pgTable('planqa_submetric', {
  id: serial('id').primaryKey(),
  sessionId: uuid('session_id').notNull().references(() => session.id, { onDelete: 'cascade' }),
  metricName: varchar('metric_name', { length: 64 }).notNull(),
  value: real('value').notNull(),
  unit: varchar('unit', { length: 32 }),
  ts: timestamp('ts', { withTimezone: true }).notNull(),
}, (table) => ({
  sessionMetricIdx: index('planqa_submetric_session_metric_idx').on(table.sessionId, table.metricName),
}));

// User site registry (simple site list for planning)
export const userSiteRegistry = pgTable('planqa_site_profile', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  lat: real('lat').notNull(),
  lon: real('lon').notNull(),
  elevM: real('elev_m').notNull(),
  tz: text('tz').notNull(),
}, (table) => ({
  nameIdx: index('planqa_site_profile_name_idx').on(table.name),
}));

// User site profiles (personalization)
export const siteProfile = pgTable('planqa_user_site_profile', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 128 }).notNull(),
  siteId: uuid('site_id').notNull(),
  label: varchar('label', { length: 128 }).notNull(),
  isPrimary: integer('is_primary').notNull().default(0),
  prefsJson: jsonb('prefs_json').$type<{
    auto_focus_interval_min?: number;
    auto_dither_interval?: number;
    guide_settle_sec?: number;
    max_session_duration_min?: number;
  }>(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userSiteIdx: uniqueIndex('planqa_user_site_profile_user_site_idx').on(table.userId, table.siteId),
}));

// User preferences and settings
export const userSetting = pgTable('planqa_user_setting', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 128 }).notNull().unique(),
  settingsJson: jsonb('settings_json').$type<{
    ui_theme?: string;
    default_exposure_sec?: number;
    default_gain?: number;
    default_offset?: number;
    notifications?: {
      session_start?: boolean;
      session_end?: boolean;
      qa_alert?: boolean;
    };
  }>().notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ===== INSERT SCHEMAS =====

export const insertRecipeSchema = createInsertSchema(recipe).omit({ id: true, createdAt: true });
export const insertSnrModelSchema = createInsertSchema(snrModel).omit({ id: true, updatedAt: true });
export const insertSessionSchema = createInsertSchema(session).omit({ id: true, createdAt: true });
export const insertSubmetricSchema = createInsertSchema(submetric).omit({ id: true });
export const insertUserSiteRegistrySchema = createInsertSchema(userSiteRegistry).omit({ id: true });
export const insertSiteProfileSchema = createInsertSchema(siteProfile).omit({ id: true, updatedAt: true });
export const insertUserSettingSchema = createInsertSchema(userSetting).omit({ id: true, updatedAt: true });

// ===== TYPES =====

export type Recipe = typeof recipe.$inferSelect;
export type SnrModel = typeof snrModel.$inferSelect;
export type Session = typeof session.$inferSelect;
export type Submetric = typeof submetric.$inferSelect;
export type UserSiteRegistry = typeof userSiteRegistry.$inferSelect;
export type SiteProfile = typeof siteProfile.$inferSelect;
export type UserSetting = typeof userSetting.$inferSelect;
