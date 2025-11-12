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
  boolean,
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
  // Spec columns
  trainId: uuid('train_id'), // Spec: UUID NULL
  targetClass: text('target_class'), // Spec: TEXT
  skyMpsasBin: varchar('sky_mpsas_bin', { length: 32 }), // Spec: TEXT (e.g., "20-21", "21-22")
  filter: varchar('filter', { length: 64 }), // Spec: TEXT
  subExposureS: real('sub_exposure_s'), // Spec: REAL
  subs: integer('subs'), // Spec: INT
  ditherPix: real('dither_pix'), // Spec: REAL NULL
  bin: integer('bin'), // Spec: INT NULL
  gain: varchar('gain', { length: 32 }), // Spec: TEXT NULL
  iso: varchar('iso', { length: 32 }), // Spec: TEXT NULL
  rationaleMd: text('rationale_md'), // Spec: TEXT
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), // Spec: TIMESTAMPTZ
  // Legacy columns
  name: varchar('name', { length: 256 }),
  targetType: recipeTargetTypeEnum('target_type'),
  filterName: varchar('filter_name', { length: 64 }),
  exposureSec: real('exposure_sec'),
  frameCount: integer('frame_count'),
  totalExpMin: real('total_exp_min'),
  binning: varchar('binning', { length: 16 }).default('1x1'),
  gainInt: integer('gain_int'),
  offset: integer('offset'),
  temp_c: real('temp_c'),
  ditherPx: integer('dither_px'),
  notes: text('notes'),
  createdBy: varchar('created_by', { length: 128 }),
}, (table) => ({
  nameIdx: index('planqa_recipe_name_idx').on(table.name),
  targetTypeIdx: index('planqa_recipe_target_type_idx').on(table.targetType),
  specIdx: index('planqa_recipe_spec_idx').on(table.targetClass, table.skyMpsasBin, table.filter),
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
  // Spec columns
  userId: uuid('user_id'), // Spec: UUID NULL
  siteId: uuid('site_id'), // Spec: UUID NULL
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(), // Spec: TIMESTAMPTZ
  endedAt: timestamp('ended_at', { withTimezone: true }), // Spec: TIMESTAMPTZ NULL
  notes: text('notes'), // Spec: TEXT
  // Legacy columns
  trainId: uuid('train_id'),
  targetName: varchar('target_name', { length: 256 }),
  filterName: varchar('filter_name', { length: 64 }),
  frameCount: integer('frame_count').notNull().default(0),
  totalExpSec: real('total_exp_sec').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  trainIdx: index('planqa_session_train_idx').on(table.trainId),
  siteIdx: index('planqa_session_site_idx').on(table.siteId),
  startedIdx: index('planqa_session_started_idx').on(table.startedAt),
  userIdx: index('planqa_session_user_idx').on(table.userId),
}));

// Session quality sub-metrics
export const submetric = pgTable('planqa_submetric', {
  id: serial('id').primaryKey(),
  sessionId: uuid('session_id').notNull().references(() => session.id, { onDelete: 'cascade' }),
  // Spec columns
  frameNo: integer('frame_no'), // Spec: INT
  ts: timestamp('ts', { withTimezone: true }).notNull(), // Spec: TIMESTAMPTZ
  hfr: real('hfr'), // Spec: REAL
  ecc: real('ecc'), // Spec: REAL
  skyAdu: real('sky_adu'), // Spec: REAL
  rmsRa: real('rms_ra'), // Spec: REAL NULL
  rmsDec: real('rms_dec'), // Spec: REAL NULL
  reject: boolean('reject').default(false), // Spec: BOOL DEFAULT false
  // Legacy columns
  metricName: varchar('metric_name', { length: 64 }),
  value: real('value'),
  unit: varchar('unit', { length: 32 }),
}, (table) => ({
  sessionMetricIdx: index('planqa_submetric_session_metric_idx').on(table.sessionId, table.metricName),
  sessionFrameIdx: index('planqa_submetric_session_frame_idx').on(table.sessionId, table.frameNo),
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
