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

// ===== EQUIPMENT & CALIBRATION SCHEMA =====

// Optical train configurations
export const opticalTrain = pgTable('calib_optical_train', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  scopeModel: varchar('scope_model', { length: 256 }).notNull(),
  cameraModel: varchar('camera_model', { length: 256 }).notNull(),
  focuserModel: varchar('focuser_model', { length: 256 }),
  filterWheelModel: varchar('filter_wheel_model', { length: 256 }),
  reducerFlattener: varchar('reducer_flattener', { length: 256 }),
  focalLengthMm: integer('focal_length_mm').notNull(),
  apertureMm: integer('aperture_mm').notNull(),
  pixelSizeUm: real('pixel_size_um').notNull(),
  plateScaleArcsecPx: real('plate_scale_arcsec_px').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  nameIdx: uniqueIndex('calib_train_name_idx').on(table.name),
}));

// Master calibration frames
export const frameTypeEnum = pgEnum('frame_type', ['bias', 'dark', 'flat', 'darkflat']);
export const kindEnum = pgEnum('frame_kind', ['dark', 'bias', 'flat', 'darkflat']);

export const masterFrame = pgTable('calib_master_frame', {
  id: uuid('id').primaryKey().defaultRandom(),
  trainId: uuid('train_id').notNull().references(() => opticalTrain.id, { onDelete: 'cascade' }),
  kind: kindEnum('kind').notNull(), // Spec column name
  frameType: frameTypeEnum('frame_type'), // Legacy column
  filter: varchar('filter', { length: 64 }), // Spec column name
  filterName: varchar('filter_name', { length: 64 }), // Legacy column
  sensorTempC: real('sensor_temp_c'), // Spec column name
  tempC: real('temp_c'), // Legacy column
  gain: varchar('gain', { length: 32 }), // Spec: TEXT
  gainInt: integer('gain_int'), // Legacy integer gain
  exposureS: real('exposure_s'), // Spec column name
  exposureSec: real('exposure_sec'), // Legacy column
  hash: varchar('hash', { length: 256 }).unique(), // Spec column
  s3Url: text('s3_url'), // Spec column name
  s3Key: text('s3_key'), // Legacy column
  binning: varchar('binning', { length: 16 }).notNull().default('1x1'),
  offset: integer('offset'),
  frameCount: integer('frame_count').notNull(),
  capturedAt: timestamp('captured_at', { withTimezone: true }).notNull(),
  statsJson: jsonb('stats_json').$type<{ mean: number; median: number; stddev: number; min: number; max: number }>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  trainIdx: index('calib_master_train_idx').on(table.trainId),
  typeIdx: index('calib_master_type_idx').on(table.frameType),
  filterIdx: index('calib_master_filter_idx').on(table.filter),
  // Spec index: (train_id, kind, filter, sensor_temp_c, gain, exposure_s)
  specIdx: index('calib_master_spec_idx').on(table.trainId, table.kind, table.filter, table.sensorTempC, table.gain, table.exposureS),
}));

// Frame quality index
export const frameIndex = pgTable('calib_frame_index', {
  id: serial('id').primaryKey(),
  masterId: uuid('master_id').notNull().references(() => masterFrame.id, { onDelete: 'cascade' }),
  tag: varchar('tag', { length: 128 }).notNull(),
  value: text('value').notNull(),
}, (table) => ({
  masterTagIdx: uniqueIndex('calib_frame_idx_master_tag').on(table.masterId, table.tag),
}));

// Autofocus data points
export const focusSample = pgTable('calib_focus_sample', {
  id: serial('id').primaryKey(),
  trainId: uuid('train_id').notNull().references(() => opticalTrain.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id'),
  ts: timestamp('ts', { withTimezone: true }).notNull(),
  filter: varchar('filter', { length: 64 }), // Spec column name
  filterName: varchar('filter_name', { length: 64 }), // Legacy column
  tempC: real('temp_c').notNull(), // Spec column
  position: integer('position').notNull(), // Spec column name
  focuserPos: integer('focuser_pos'), // Legacy column
  hfr: real('hfr').notNull(), // Spec column
  exposureS: real('exposure_s'), // Spec column
  fwhm: real('fwhm'),
  starCount: integer('star_count').notNull(),
}, (table) => ({
  trainIdx: index('calib_focus_train_idx').on(table.trainId),
  sessionIdx: index('calib_focus_session_idx').on(table.sessionId),
  tsIdx: index('calib_focus_ts_idx').on(table.ts),
}));

// Focus curve fits (V-curve or hyperbolic)
export const focusProfile = pgTable('calib_focus_profile', {
  id: serial('id').primaryKey(),
  trainId: uuid('train_id').notNull().references(() => opticalTrain.id, { onDelete: 'cascade' }),
  filter: varchar('filter', { length: 64 }), // Spec column name
  filterName: varchar('filter_name', { length: 64 }), // Legacy column
  model: jsonb('model').$type<any>().notNull(), // Spec column: JSONB model
  r2: real('r2').notNull(), // Spec column
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(), // Spec column
  // Legacy columns
  tempC: real('temp_c'),
  optimalPos: integer('optimal_pos'),
  criticalZone: integer('critical_zone'),
  fitType: varchar('fit_type', { length: 32 }),
  coeffsJson: jsonb('coeffs_json').$type<number[]>(),
  sampleCount: integer('sample_count'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  trainFilterIdx: index('calib_focus_prof_train_filter_idx').on(table.trainId, table.filter),
}));

// Backfocus offsets per filter
export const backfocusOffset = pgTable('calib_backfocus_offset', {
  id: serial('id').primaryKey(),
  trainId: uuid('train_id').notNull().references(() => opticalTrain.id, { onDelete: 'cascade' }),
  filterName: varchar('filter_name', { length: 64 }).notNull(),
  offsetMm: real('offset_mm').notNull(),
  confidencePct: real('confidence_pct').notNull(),
  measurementCount: integer('measurement_count').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  trainFilterIdx: uniqueIndex('calib_backfocus_train_filter_idx').on(table.trainId, table.filterName),
}));

// Pointing model terms
export const pointingModel = pgTable('calib_pointing_model', {
  id: serial('id').primaryKey(),
  trainId: uuid('train_id').notNull().references(() => opticalTrain.id, { onDelete: 'cascade' }),
  termsJson: jsonb('terms_json').$type<Record<string, number>>().notNull(),
  rmsArcsec: real('rms_arcsec').notNull(),
  pointCount: integer('point_count').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  trainIdx: index('calib_pointing_train_idx').on(table.trainId),
}));

// PEC (Periodic Error Correction) waveforms
export const pecProfile = pgTable('calib_pec_profile', {
  id: serial('id').primaryKey(),
  mountModel: varchar('mount_model', { length: 256 }).notNull(),
  axis: varchar('axis', { length: 16 }).notNull(),
  waveformJson: jsonb('waveform_json').$type<number[]>().notNull(),
  periodSec: real('period_sec').notNull(),
  pkToPkArcsec: real('pk_to_pk_arcsec').notNull(),
  rmsArcsec: real('rms_arcsec').notNull(),
  capturedAt: timestamp('captured_at', { withTimezone: true }).notNull(),
}, (table) => ({
  mountAxisIdx: index('calib_pec_mount_axis_idx').on(table.mountModel, table.axis),
}));

// Filter transmission curves
export const filter = pgTable('calib_filter', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 128 }).notNull().unique(),
  manufacturer: varchar('manufacturer', { length: 128 }),
  filterType: varchar('filter_type', { length: 64 }).notNull(),
  centralWavelengthNm: real('central_wavelength_nm'),
  bandwidthNm: real('bandwidth_nm'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const filterCurve = pgTable('calib_filter_curve', {
  id: serial('id').primaryKey(),
  filterId: integer('filter_id').notNull().references(() => filter.id, { onDelete: 'cascade' }),
  wavelengthNm: real('wavelength_nm').notNull(),
  transmission: real('transmission').notNull(),
}, (table) => ({
  filterWlIdx: index('calib_filter_curve_wl_idx').on(table.filterId, table.wavelengthNm),
}));

// Sensor QE curves
export const sensor = pgTable('calib_sensor', {
  id: serial('id').primaryKey(),
  model: varchar('model', { length: 256 }).notNull().unique(),
  manufacturer: varchar('manufacturer', { length: 128 }),
  pixelSizeUm: real('pixel_size_um').notNull(),
  resolutionX: integer('resolution_x').notNull(),
  resolutionY: integer('resolution_y').notNull(),
  isColor: boolean('is_color').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const sensorQe = pgTable('calib_sensor_qe', {
  id: serial('id').primaryKey(),
  sensorId: integer('sensor_id').notNull().references(() => sensor.id, { onDelete: 'cascade' }),
  wavelengthNm: real('wavelength_nm').notNull(),
  qe: real('qe').notNull(),
}, (table) => ({
  sensorWlIdx: index('calib_sensor_qe_wl_idx').on(table.sensorId, table.wavelengthNm),
}));

// ===== INSERT SCHEMAS =====

export const insertOpticalTrainSchema = createInsertSchema(opticalTrain).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMasterFrameSchema = createInsertSchema(masterFrame).omit({ id: true, createdAt: true });
export const insertFocusSampleSchema = createInsertSchema(focusSample).omit({ id: true });
export const insertFocusProfileSchema = createInsertSchema(focusProfile).omit({ id: true, createdAt: true });
export const insertBackfocusOffsetSchema = createInsertSchema(backfocusOffset).omit({ id: true, updatedAt: true });
export const insertPointingModelSchema = createInsertSchema(pointingModel).omit({ id: true, createdAt: true });
export const insertPecProfileSchema = createInsertSchema(pecProfile).omit({ id: true });
export const insertFilterSchema = createInsertSchema(filter).omit({ id: true, createdAt: true });
export const insertSensorSchema = createInsertSchema(sensor).omit({ id: true, createdAt: true });

// ===== TYPES =====

export type OpticalTrain = typeof opticalTrain.$inferSelect;
export type MasterFrame = typeof masterFrame.$inferSelect;
export type FocusSample = typeof focusSample.$inferSelect;
export type FocusProfile = typeof focusProfile.$inferSelect;
export type BackfocusOffset = typeof backfocusOffset.$inferSelect;
export type PointingModel = typeof pointingModel.$inferSelect;
export type PecProfile = typeof pecProfile.$inferSelect;
export type Filter = typeof filter.$inferSelect;
export type FilterCurve = typeof filterCurve.$inferSelect;
export type Sensor = typeof sensor.$inferSelect;
export type SensorQe = typeof sensorQe.$inferSelect;
