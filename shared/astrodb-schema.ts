import { sql } from "drizzle-orm";
import { 
  pgSchema, 
  pgTable, 
  serial, 
  text, 
  varchar, 
  timestamp, 
  real, 
  boolean, 
  integer,
  pgEnum,
  jsonb,
  numeric,
  index,
  unique
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ===== EQUIPMENT SCHEMA =====

export const interfaceEnum = pgEnum('interface_type', [
  'ASCOM', 'INDI', 'Alpaca', 'USB', 'Serial', 'Other'
]);

export const deviceCategoryEnum = pgEnum('device_category', [
  'mount', 'camera', 'focuser', 'filter_wheel', 'ota', 'accessory', 'controller'
]);

export const mediaKindEnum = pgEnum('media_kind', [
  'image', 'manual', 'datasheet'
]);

export const manufacturer = pgTable('astrodb_manufacturer', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 256 }).notNull().unique(),
  website: text('website'),
  country: varchar('country', { length: 64 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const device = pgTable('astrodb_device', {
  id: serial('id').primaryKey(),
  manufacturerId: integer('manufacturer_id').notNull().references(() => manufacturer.id),
  model: varchar('model', { length: 256 }).notNull(),
  category: deviceCategoryEnum('category').notNull(),
  interface: interfaceEnum('interface').notNull(),
  releasedOn: timestamp('released_on'),
  discontinuedOn: timestamp('discontinued_on'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  manufacturerIdx: index('device_manufacturer_idx').on(table.manufacturerId),
  categoryIdx: index('device_category_idx').on(table.category),
  modelIdx: index('device_model_idx').on(table.model),
  uniqueManufacturerModel: unique('device_manufacturer_model_unique').on(table.manufacturerId, table.model),
}));

export const specKv = pgTable('astrodb_spec_kv', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id').notNull().references(() => device.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  value: text('value').notNull(),
  unit: text('unit'),
}, (table) => ({
  deviceIdx: index('spec_kv_device_idx').on(table.deviceId),
  keyIdx: index('spec_kv_key_idx').on(table.key),
}));

export const capability = pgTable('astrodb_capability', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id').notNull().references(() => device.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
}, (table) => ({
  deviceIdx: index('capability_device_idx').on(table.deviceId),
}));

export const compat = pgTable('astrodb_compat', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id').notNull().references(() => device.id, { onDelete: 'cascade' }),
  otherDeviceId: integer('other_device_id').notNull().references(() => device.id, { onDelete: 'cascade' }),
  note: text('note'),
}, (table) => ({
  deviceIdx: index('compat_device_idx').on(table.deviceId),
}));

export const media = pgTable('astrodb_media', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id').notNull().references(() => device.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  kind: mediaKindEnum('kind').notNull(),
}, (table) => ({
  deviceIdx: index('media_device_idx').on(table.deviceId),
}));

// ===== CATALOG SCHEMA (Top 500 Night-Sky Objects) =====

export const objectClassEnum = pgEnum('object_class', [
  'open_cluster', 'globular', 'nebula', 'planetary_nebula', 
  'galaxy', 'double_star', 'star', 'asterism', 'other'
]);

export const catalogObject = pgTable('astrodb_object', {
  id: serial('id').primaryKey(),
  primaryName: varchar('primary_name', { length: 128 }).notNull().unique(),
  catalogIds: jsonb('catalog_ids').$type<Record<string, string>>().notNull().default({}),
  class: objectClassEnum('class').notNull(),
  constellation: varchar('constellation', { length: 32 }),
  raJ2000Deg: numeric('ra_j2000_deg', { precision: 12, scale: 8 }).notNull(),
  decJ2000Deg: numeric('dec_j2000_deg', { precision: 12, scale: 8 }).notNull(),
  pmRaMasyr: real('pm_ra_masyr'),
  pmDecMasyr: real('pm_dec_masyr'),
  mag: real('mag'),
  surfBrightness: real('surf_brightness'),
  majorArcmin: real('major_arcmin'),
  minorArcmin: real('minor_arcmin'),
  paDeg: real('pa_deg'),
  distanceLy: real('distance_ly'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  classIdx: index('object_class_idx').on(table.class),
  magIdx: index('object_mag_idx').on(table.mag),
  constellationIdx: index('object_constellation_idx').on(table.constellation),
}));

export const aka = pgTable('astrodb_aka', {
  id: serial('id').primaryKey(),
  objectId: integer('object_id').notNull().references(() => catalogObject.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
}, (table) => ({
  objectIdx: index('aka_object_idx').on(table.objectId),
  nameIdx: index('aka_name_idx').on(table.name),
}));

// ===== SATOBS SCHEMA (Man-Made Space Objects) =====

export const satelliteCategoryEnum = pgEnum('satellite_category', [
  'station', 'comm', 'nav', 'earth_obs', 'constellation', 'debris', 'rocket_body'
]);

export const satellite = pgTable('astrodb_satellite', {
  id: serial('id').primaryKey(),
  noradId: integer('norad_id').notNull().unique(),
  name: text('name').notNull(),
  operator: text('operator'),
  category: satelliteCategoryEnum('category').notNull(),
  visualMagEst: real('visual_mag_est'),
  firstLaunch: timestamp('first_launch'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  noradIdx: index('satellite_norad_idx').on(table.noradId),
  magIdx: index('satellite_mag_idx').on(table.visualMagEst),
}));

export const tle = pgTable('astrodb_tle', {
  id: serial('id').primaryKey(),
  noradId: integer('norad_id').notNull().references(() => satellite.noradId),
  line1: text('line1').notNull(),
  line2: text('line2').notNull(),
  epoch: timestamp('epoch').notNull(),
  source: text('source').notNull(),
  fetchedAt: timestamp('fetched_at').notNull().defaultNow(),
}, (table) => ({
  noradEpochIdx: index('tle_norad_epoch_idx').on(table.noradId, table.epoch),
  uniqueTLE: unique('tle_norad_epoch_unique').on(table.noradId, table.epoch),
}));

export const ephem = pgTable('astrodb_ephem', {
  id: serial('id').primaryKey(),
  noradId: integer('norad_id').notNull().references(() => satellite.noradId),
  ts: timestamp('ts').notNull(),
  geodeticLat: real('geodetic_lat').notNull(),
  geodeticLon: real('geodetic_lon').notNull(),
  altKm: real('alt_km').notNull(),
  rangeKm: real('range_km'),
  rangeRateKms: real('range_rate_kms'),
  raDeg: real('ra_deg'),
  decDeg: real('dec_deg'),
  azDeg: real('az_deg'),
  elDeg: real('el_deg'),
  sunlit: boolean('sunlit'),
  magEst: real('mag_est'),
}, (table) => ({
  noradTsIdx: index('ephem_norad_ts_idx').on(table.noradId, table.ts),
}));

// ===== EVENTS SCHEMA (2025-2026 Major Events) =====

export const eventTypeEnum = pgEnum('event_type', [
  'solar_eclipse', 'lunar_eclipse', 'meteor_shower_peak', 
  'planetary_conjunction', 'planetary_opposition', 'occultation',
  'comet_perihelion', 'supermoon', 'other'
]);

export const visibilityScopeEnum = pgEnum('visibility_scope', [
  'global', 'continent', 'country', 'bbox'
]);

export const event = pgTable('astrodb_event', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 256 }).notNull(),
  type: eventTypeEnum('type').notNull(),
  startUtc: timestamp('start_utc').notNull(),
  endUtc: timestamp('end_utc').notNull(),
  summary250: text('summary_250').notNull(),
  url: text('url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  typeIdx: index('event_type_idx').on(table.type),
  startIdx: index('event_start_idx').on(table.startUtc),
}));

export const visibility = pgTable('astrodb_visibility', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').notNull().references(() => event.id, { onDelete: 'cascade' }),
  scope: visibilityScopeEnum('scope').notNull(),
  continentCode: text('continent_code'),
  countryIso2: varchar('country_iso2', { length: 2 }),
  regionName: text('region_name'),
  // For simplicity, we'll use bounding box instead of full geography polygon
  bboxMinLat: real('bbox_min_lat'),
  bboxMaxLat: real('bbox_max_lat'),
  bboxMinLon: real('bbox_min_lon'),
  bboxMaxLon: real('bbox_max_lon'),
}, (table) => ({
  eventIdx: index('visibility_event_idx').on(table.eventId),
  countryIdx: index('visibility_country_idx').on(table.countryIso2),
}));

export const eventTag = pgTable('astrodb_event_tag', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').notNull().references(() => event.id, { onDelete: 'cascade' }),
  tag: text('tag').notNull(),
}, (table) => ({
  eventIdx: index('event_tag_event_idx').on(table.eventId),
  tagIdx: index('event_tag_tag_idx').on(table.tag),
}));

// ===== SOURCE REFERENCES (Common for all domains) =====

export const sourceRef = pgTable('astrodb_source_ref', {
  id: serial('id').primaryKey(),
  entityType: varchar('entity_type', { length: 64 }).notNull(), // 'device', 'object', 'satellite', 'event', etc.
  entityId: integer('entity_id').notNull(),
  sourceName: varchar('source_name', { length: 256 }).notNull(),
  sourceUrl: text('source_url').notNull(),
  license: varchar('license', { length: 128 }),
  fetchedAt: timestamp('fetched_at').notNull().defaultNow(),
  hash: varchar('hash', { length: 64 }),
}, (table) => ({
  entityIdx: index('source_ref_entity_idx').on(table.entityType, table.entityId),
}));

// ===== IMPORT HISTORY & OBSERVABILITY =====

export const importRun = pgTable('astrodb_import_run', {
  id: serial('id').primaryKey(),
  domain: varchar('domain', { length: 64 }).notNull(), // 'equipment', 'catalog', 'satobs', 'events'
  status: varchar('status', { length: 32 }).notNull(), // 'running', 'completed', 'failed'
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  recordsFetched: integer('records_fetched').default(0),
  recordsInserted: integer('records_inserted').default(0),
  recordsUpdated: integer('records_updated').default(0),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
}, (table) => ({
  domainIdx: index('import_run_domain_idx').on(table.domain),
  startedIdx: index('import_run_started_idx').on(table.startedAt),
}));

// ===== INSERT SCHEMAS =====

export const insertManufacturerSchema = createInsertSchema(manufacturer).omit({ id: true, createdAt: true });
export const insertDeviceSchema = createInsertSchema(device).omit({ id: true, createdAt: true });
export const insertSpecKvSchema = createInsertSchema(specKv).omit({ id: true });
export const insertCapabilitySchema = createInsertSchema(capability).omit({ id: true });
export const insertCompatSchema = createInsertSchema(compat).omit({ id: true });
export const insertMediaSchema = createInsertSchema(media).omit({ id: true });

export const insertCatalogObjectSchema = createInsertSchema(catalogObject).omit({ id: true, createdAt: true });
export const insertAkaSchema = createInsertSchema(aka).omit({ id: true });

export const insertSatelliteSchema = createInsertSchema(satellite).omit({ id: true, createdAt: true });
export const insertTleSchema = createInsertSchema(tle).omit({ id: true, fetchedAt: true });
export const insertEphemSchema = createInsertSchema(ephem).omit({ id: true });

export const insertEventSchema = createInsertSchema(event).omit({ id: true, createdAt: true });
export const insertVisibilitySchema = createInsertSchema(visibility).omit({ id: true });
export const insertEventTagSchema = createInsertSchema(eventTag).omit({ id: true });

export const insertSourceRefSchema = createInsertSchema(sourceRef).omit({ id: true, fetchedAt: true });
export const insertImportRunSchema = createInsertSchema(importRun).omit({ id: true, startedAt: true });

// ===== TYPES =====

export type Manufacturer = typeof manufacturer.$inferSelect;
export type Device = typeof device.$inferSelect;
export type SpecKv = typeof specKv.$inferSelect;
export type Capability = typeof capability.$inferSelect;
export type Compat = typeof compat.$inferSelect;
export type Media = typeof media.$inferSelect;

export type CatalogObject = typeof catalogObject.$inferSelect;
export type Aka = typeof aka.$inferSelect;

export type Satellite = typeof satellite.$inferSelect;
export type TLE = typeof tle.$inferSelect;
export type Ephem = typeof ephem.$inferSelect;

export type Event = typeof event.$inferSelect;
export type Visibility = typeof visibility.$inferSelect;
export type EventTag = typeof eventTag.$inferSelect;

export type SourceRef = typeof sourceRef.$inferSelect;
export type ImportRun = typeof importRun.$inferSelect;

export type InsertManufacturer = z.infer<typeof insertManufacturerSchema>;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type InsertCatalogObject = z.infer<typeof insertCatalogObjectSchema>;
export type InsertSatellite = z.infer<typeof insertSatelliteSchema>;
export type InsertEvent = z.infer<typeof insertEventSchema>;
