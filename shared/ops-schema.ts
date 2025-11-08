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
  primaryKey,
  smallint,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ===== OPERATIONS & ENVIRONMENT SCHEMA =====

// Site locations
export const site = pgTable('ops_site', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  lat: real('lat').notNull(),
  lon: real('lon').notNull(),
  elevM: real('elev_m').notNull(),
  tz: varchar('tz', { length: 64 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  nameIdx: index('ops_site_name_idx').on(table.name),
  coordIdx: index('ops_site_coord_idx').on(table.lat, table.lon),
}));

// Weather/seeing forecasts
export const meteo = pgTable('ops_meteo', {
  id: serial('id').primaryKey(),
  siteId: uuid('site_id').notNull().references(() => site.id, { onDelete: 'cascade' }),
  ts: timestamp('ts', { withTimezone: true }).notNull(),
  cloudPct: real('cloud_pct').notNull(),
  transparencyIdx: real('transparency_idx'),
  seeingArcsec: real('seeing_arcsec'),
  windMps: real('wind_mps').notNull(),
  gustMps: real('gust_mps'),
  tempC: real('temp_c').notNull(),
  dewpointC: real('dewpoint_c').notNull(),
  rhPct: real('rh_pct').notNull(),
  precipMm: real('precip_mm'),
  pressureHpa: real('pressure_hpa'),
  moonIllum: real('moon_illum').notNull(),
  moonAltDeg: real('moon_alt_deg').notNull(),
  source: varchar('source', { length: 128 }).notNull(),
  modelRun: timestamp('model_run', { withTimezone: true }).notNull(),
}, (table) => ({
  siteTimeIdx: index('ops_meteo_site_ts_idx').on(table.siteId, table.ts),
  tsIdx: index('ops_meteo_ts_idx').on(table.ts),
}));

// Meteo quality flags
export const meteoQuality = pgTable('ops_meteo_quality', {
  id: serial('id').primaryKey(),
  meteoId: integer('meteo_id').notNull().references(() => meteo.id, { onDelete: 'cascade' }),
  flags: jsonb('flags').$type<string[]>().notNull().default([]),
  note: text('note'),
});

// Horizon altitude limits by azimuth
export const horizon = pgTable('ops_horizon', {
  siteId: uuid('site_id').notNull().references(() => site.id, { onDelete: 'cascade' }),
  azDeg: real('az_deg').notNull(),
  altLimitDeg: real('alt_limit_deg').notNull(),
  source: text('source'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.siteId, table.azDeg] }),
}));

// Physical obstacles
export const obstacleTypeEnum = pgEnum('obstacle_type', ['tree', 'building', 'dome', 'other']);

export const obstacle = pgTable('ops_obstacle', {
  id: serial('id').primaryKey(),
  siteId: uuid('site_id').notNull().references(() => site.id, { onDelete: 'cascade' }),
  type: obstacleTypeEnum('type').notNull(),
  geomJson: jsonb('geom_json').$type<any>().notNull(), // GeoJSON polygon
  note: text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  siteIdx: index('ops_obstacle_site_idx').on(table.siteId),
}));

// Dew risk calculations
export const dewRiskEnum = pgEnum('dew_risk', ['low', 'med', 'high']);

export const dewEvent = pgTable('ops_dew_event', {
  id: serial('id').primaryKey(),
  siteId: uuid('site_id').notNull().references(() => site.id, { onDelete: 'cascade' }),
  ts: timestamp('ts', { withTimezone: true }).notNull(),
  tempC: real('temp_c').notNull(),
  dewpointC: real('dewpoint_c').notNull(),
  marginC: real('margin_c').notNull(),
  risk: dewRiskEnum('risk').notNull(),
}, (table) => ({
  siteTimeIdx: index('ops_dew_site_ts_idx').on(table.siteId, table.ts),
}));

// Dew heater profiles
export const dewSensorLocEnum = pgEnum('dew_sensor_loc', ['ota', 'ambient', 'camera']);

export const dewProfile = pgTable('ops_dew_profile', {
  id: serial('id').primaryKey(),
  deviceKey: varchar('device_key', { length: 128 }).notNull().unique(),
  sensorLoc: dewSensorLocEnum('sensor_loc').notNull(),
  tempC: real('temp_c').notNull(),
  rhPct: real('rh_pct').notNull(),
  setpointPwm: integer('setpoint_pwm').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Dew control hints (ML-derived)
export const dewControlHint = pgTable('ops_dew_control_hint', {
  id: serial('id').primaryKey(),
  trainId: uuid('train_id').notNull(),
  ruleMd: text('rule_md').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Light pollution tiles (z/x/y)
export const lpTile = pgTable('ops_lp_tile', {
  z: smallint('z').notNull(),
  x: integer('x').notNull(),
  y: integer('y').notNull(),
  mpsas: real('mpsas').notNull(),
  dataset: varchar('dataset', { length: 64 }).notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.z, table.x, table.y, table.dataset] }),
}));

// Site-specific light pollution estimates
export const siteLp = pgTable('ops_site_lp', {
  siteId: uuid('site_id').primaryKey().references(() => site.id, { onDelete: 'cascade' }),
  mpsasEst: real('mpsas_est').notNull(),
  method: varchar('method', { length: 128 }).notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ===== INSERT SCHEMAS =====

export const insertSiteSchema = createInsertSchema(site).omit({ id: true, createdAt: true });
export const insertMeteoSchema = createInsertSchema(meteo).omit({ id: true });
export const insertHorizonSchema = createInsertSchema(horizon).omit({ createdAt: true });
export const insertObstacleSchema = createInsertSchema(obstacle).omit({ id: true, createdAt: true });
export const insertDewEventSchema = createInsertSchema(dewEvent).omit({ id: true });
export const insertDewProfileSchema = createInsertSchema(dewProfile).omit({ id: true, createdAt: true });
export const insertLpTileSchema = createInsertSchema(lpTile).omit({ updatedAt: true });
export const insertSiteLpSchema = createInsertSchema(siteLp).omit({ updatedAt: true });

// ===== TYPES =====

export type Site = typeof site.$inferSelect;
export type Meteo = typeof meteo.$inferSelect;
export type MeteoQuality = typeof meteoQuality.$inferSelect;
export type Horizon = typeof horizon.$inferSelect;
export type Obstacle = typeof obstacle.$inferSelect;
export type DewEvent = typeof dewEvent.$inferSelect;
export type DewProfile = typeof dewProfile.$inferSelect;
export type LpTile = typeof lpTile.$inferSelect;
export type SiteLp = typeof siteLp.$inferSelect;

export type InsertSite = z.infer<typeof insertSiteSchema>;
export type InsertMeteo = z.infer<typeof insertMeteoSchema>;
export type InsertHorizon = z.infer<typeof insertHorizonSchema>;
