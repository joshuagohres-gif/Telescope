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

// ===== TARGETING & ALERTS SCHEMA =====

// Transient events (SNe, novae, GRBs, etc.)
export const transientTypeEnum = pgEnum('transient_type', [
  'supernova', 'nova', 'grb', 'cve', 'other'
]);

export const transient = pgTable('targets_transient', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 128 }).notNull().unique(),
  type: transientTypeEnum('type').notNull(),
  ra: real('ra').notNull(),
  dec: real('dec').notNull(),
  discoveryDate: timestamp('discovery_date', { withTimezone: true }).notNull(),
  peakMag: real('peak_mag'),
  currentMag: real('current_mag'),
  filterBand: varchar('filter_band', { length: 16 }),
  hostGalaxy: varchar('host_galaxy', { length: 256 }),
  redshift: real('redshift'),
  classification: varchar('classification', { length: 128 }),
  notes: text('notes'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  nameIdx: index('targets_transient_name_idx').on(table.name),
  coordIdx: index('targets_transient_coord_idx').on(table.ra, table.dec),
  typeIdx: index('targets_transient_type_idx').on(table.type),
}));

// Alert notices (TNS, GCN, ATel, etc.)
export const notice = pgTable('targets_notice', {
  id: serial('id').primaryKey(),
  transientId: integer('transient_id').references(() => transient.id, { onDelete: 'cascade' }),
  source: varchar('source', { length: 64 }).notNull(),
  noticeId: varchar('notice_id', { length: 128 }).notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true }).notNull(),
  title: text('title').notNull(),
  contentUrl: text('content_url'),
  contentText: text('content_text'),
}, (table) => ({
  transientIdx: index('targets_notice_transient_idx').on(table.transientId),
  sourceIdx: index('targets_notice_source_idx').on(table.source),
  uniqueNotice: uniqueIndex('targets_notice_unique').on(table.source, table.noticeId),
}));

// Cross-references to external catalogs
export const noticeXref = pgTable('targets_notice_xref', {
  id: serial('id').primaryKey(),
  noticeId: integer('notice_id').notNull().references(() => notice.id, { onDelete: 'cascade' }),
  catalogName: varchar('catalog_name', { length: 64 }).notNull(),
  objectId: varchar('object_id', { length: 128 }).notNull(),
}, (table) => ({
  noticeIdx: index('targets_xref_notice_idx').on(table.noticeId),
}));

// Minor planets and comets
export const mpBodyTypeEnum = pgEnum('mp_body_type', ['asteroid', 'comet', 'centaur', 'tno']);

export const mpBody = pgTable('targets_mp_body', {
  id: serial('id').primaryKey(),
  designation: varchar('designation', { length: 128 }).notNull().unique(),
  name: varchar('name', { length: 256 }),
  bodyType: mpBodyTypeEnum('body_type').notNull(),
  h: real('h'),
  g: real('g'),
  orbitClass: varchar('orbit_class', { length: 64 }),
  discovery: jsonb('discovery').$type<{ date: string; site: string; discoverer: string }>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  designationIdx: index('targets_mp_designation_idx').on(table.designation),
  nameIdx: index('targets_mp_name_idx').on(table.name),
}));

// Ephemeris cache
export const ephem = pgTable('targets_ephem', {
  id: serial('id').primaryKey(),
  bodyId: integer('body_id').notNull().references(() => mpBody.id, { onDelete: 'cascade' }),
  ts: timestamp('ts', { withTimezone: true }).notNull(),
  ra: real('ra').notNull(),
  dec: real('dec').notNull(),
  vmag: real('vmag'),
  delta: real('delta'),
  rHelio: real('r_helio'),
  phaseAngle: real('phase_angle'),
  elongation: real('elongation'),
  computedAt: timestamp('computed_at').notNull().defaultNow(),
}, (table) => ({
  bodyTsIdx: uniqueIndex('targets_ephem_body_ts_idx').on(table.bodyId, table.ts),
  tsIdx: index('targets_ephem_ts_idx').on(table.ts),
}));

// Orbital elements
export const orbitElem = pgTable('targets_orbit_elem', {
  id: serial('id').primaryKey(),
  bodyId: integer('body_id').notNull().references(() => mpBody.id, { onDelete: 'cascade' }),
  epoch: real('epoch').notNull(),
  a: real('a').notNull(),
  e: real('e').notNull(),
  i: real('i').notNull(),
  omega: real('omega').notNull(),
  w: real('w').notNull(),
  m: real('m').notNull(),
  n: real('n'),
  source: varchar('source', { length: 128 }).notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  bodyIdx: index('targets_orbit_body_idx').on(table.bodyId),
}));

// Lunar and planetary features gazetteer
export const featureBodyEnum = pgEnum('feature_body', [
  'moon', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'venus', 'mercury'
]);

export const featureTypeEnum = pgEnum('feature_type', [
  'crater', 'mare', 'mountain', 'valley', 'storm', 'band', 'spot', 'other'
]);

export const feature = pgTable('targets_feature', {
  id: serial('id').primaryKey(),
  body: featureBodyEnum('body').notNull(),
  name: varchar('name', { length: 256 }).notNull(),
  featureType: featureTypeEnum('feature_type').notNull(),
  lat: real('lat'),
  lon: real('lon'),
  diameter: real('diameter'),
  description: text('description'),
  observabilityNotes: text('observability_notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  bodyNameIdx: uniqueIndex('targets_feature_body_name_idx').on(table.body, table.name),
  bodyTypeIdx: index('targets_feature_body_type_idx').on(table.body, table.featureType),
}));

// Feature aliases
export const featureAka = pgTable('targets_feature_aka', {
  id: serial('id').primaryKey(),
  featureId: integer('feature_id').notNull().references(() => feature.id, { onDelete: 'cascade' }),
  alias: varchar('alias', { length: 256 }).notNull(),
}, (table) => ({
  featureIdx: index('targets_aka_feature_idx').on(table.featureId),
}));

// Star-hop waypoints for constellation navigation
export const hop = pgTable('targets_hop', {
  id: serial('id').primaryKey(),
  targetName: varchar('target_name', { length: 256 }).notNull(),
  targetRa: real('target_ra').notNull(),
  targetDec: real('target_dec').notNull(),
  waypointIdx: integer('waypoint_idx').notNull(),
  waypointName: varchar('waypoint_name', { length: 256 }).notNull(),
  waypointRa: real('waypoint_ra').notNull(),
  waypointDec: real('waypoint_dec').notNull(),
  waypointMag: real('waypoint_mag'),
  bearingDeg: real('bearing_deg'),
  distanceDeg: real('distance_deg'),
  notes: text('notes'),
}, (table) => ({
  targetIdx: index('targets_hop_target_idx').on(table.targetName),
  waypointIdx: index('targets_hop_waypoint_idx').on(table.waypointIdx),
}));

// ===== INSERT SCHEMAS =====

export const insertTransientSchema = createInsertSchema(transient).omit({ id: true, updatedAt: true });
export const insertNoticeSchema = createInsertSchema(notice).omit({ id: true });
export const insertMpBodySchema = createInsertSchema(mpBody).omit({ id: true, createdAt: true });
export const insertEphemSchema = createInsertSchema(ephem).omit({ id: true, computedAt: true });
export const insertOrbitElemSchema = createInsertSchema(orbitElem).omit({ id: true, updatedAt: true });
export const insertFeatureSchema = createInsertSchema(feature).omit({ id: true, createdAt: true });
export const insertHopSchema = createInsertSchema(hop).omit({ id: true });

// ===== TYPES =====

export type Transient = typeof transient.$inferSelect;
export type Notice = typeof notice.$inferSelect;
export type MpBody = typeof mpBody.$inferSelect;
export type Ephem = typeof ephem.$inferSelect;
export type OrbitElem = typeof orbitElem.$inferSelect;
export type Feature = typeof feature.$inferSelect;
export type FeatureAka = typeof featureAka.$inferSelect;
export type Hop = typeof hop.$inferSelect;
