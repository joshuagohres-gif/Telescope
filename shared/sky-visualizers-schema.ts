import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  real,
  integer,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ===== SKY VISUALIZERS SCHEMA =====

// Star Catalog Table
export const starCatalog = pgTable(
  "skyviz_star_catalog",
  {
    id: serial("id").primaryKey(),
    hip: integer("hip").unique(), // Hipparcos number
    tycho: varchar("tycho", { length: 32 }), // Tycho designation
    ra: real("ra").notNull(), // Right Ascension (degrees)
    dec: real("dec").notNull(), // Declination (degrees)
    magnitude: real("magnitude").notNull(), // V Magnitude
    bv: real("bv"), // B-V Color Index
    properName: varchar("proper_name", { length: 128 }),
    bayer: varchar("bayer", { length: 32 }),
    flamsteed: varchar("flamsteed", { length: 32 }),
    constellation: varchar("constellation", { length: 3 }),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    magIdx: index("skyviz_star_mag_idx").on(table.magnitude),
    posIdx: index("skyviz_star_pos_idx").on(table.ra, table.dec),
  })
);

// Object type enum
export const solarSystemObjectTypeEnum = pgEnum("sso_type", [
  "planet",
  "dwarf_planet",
  "moon",
  "asteroid",
  "comet",
  "centaur",
  "tno", // Trans-Neptunian Object
  "trojan",
  "neo", // Near-Earth Object
  "other",
]);

// Solar system object metadata
export const solarSystemObject = pgTable(
  "skyviz_solar_system_object",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 256 }).notNull(),
    designation: varchar("designation", { length: 128 }), // e.g., "1 Ceres", "C/2023 A3"
    type: solarSystemObjectTypeEnum("type").notNull(),
    // Physical properties
    diameter: real("diameter"), // km
    mass: real("mass"), // kg
    albedo: real("albedo"), // geometric albedo
    rotationPeriod: real("rotation_period"), // hours
    // Discovery info
    discoveryDate: timestamp("discovery_date", { withTimezone: true }),
    discoverer: varchar("discoverer", { length: 256 }),
    discoverySite: varchar("discovery_site", { length: 256 }),
    // Visual properties
    color: varchar("color", { length: 32 }), // hex color
    textureUrl: text("texture_url"), // URL to texture/image
    modelUrl: text("model_url"), // URL to 3D model
    // Metadata
    description: text("description"),
    source: varchar("source", { length: 128 }).notNull(), // Data source
    sourceId: varchar("source_id", { length: 256 }), // ID in source system
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: index("skyviz_sso_name_idx").on(table.name),
    designationIdx: index("skyviz_sso_designation_idx").on(table.designation),
    typeIdx: index("skyviz_sso_type_idx").on(table.type),
    sourceIdx: index("skyviz_sso_source_idx").on(table.source),
    uniqueDesignation: uniqueIndex("skyviz_sso_designation_unique").on(
      table.designation
    ),
  })
);

// Orbital data (cached orbital elements)
export const orbitalData = pgTable(
  "skyviz_orbital_data",
  {
    id: serial("id").primaryKey(),
    objectId: integer("object_id")
      .notNull()
      .references(() => solarSystemObject.id, { onDelete: "cascade" }),
    epoch: real("epoch").notNull(), // Julian Date of epoch
    // Orbital elements
    a: real("a").notNull(), // Semi-major axis (AU)
    e: real("e").notNull(), // Eccentricity
    i: real("i").notNull(), // Inclination (degrees)
    omega: real("omega").notNull(), // Longitude of ascending node (degrees)
    w: real("w").notNull(), // Argument of perihelion (degrees)
    m: real("m").notNull(), // Mean anomaly at epoch (degrees)
    n: real("n"), // Mean motion (degrees/day)
    // Additional elements for comets
    q: real("q"), // Perihelion distance (AU) - for comets
    tp: real("tp"), // Time of perihelion passage (JD) - for comets
    // Source and metadata
    source: varchar("source", { length: 128 }).notNull(),
    sourceUrl: text("source_url"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    objectIdx: index("skyviz_orbital_object_idx").on(table.objectId),
    epochIdx: index("skyviz_orbital_epoch_idx").on(table.epoch),
  })
);

// Trajectory cache (pre-computed orbital trajectories)
export const trajectoryCache = pgTable(
  "skyviz_trajectory_cache",
  {
    id: serial("id").primaryKey(),
    objectId: integer("object_id")
      .notNull()
      .references(() => solarSystemObject.id, { onDelete: "cascade" }),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }).notNull(),
    stepDays: real("step_days").notNull(), // Step size in days
    // Trajectory points: array of {t, x, y, z, ra, dec, distance}
    points: jsonb("points").notNull().$type<
      Array<{
        t: number; // Julian Date
        x: number; // Heliocentric X (AU)
        y: number; // Heliocentric Y (AU)
        z: number; // Heliocentric Z (AU)
        ra?: number; // Right Ascension (radians)
        dec?: number; // Declination (radians)
        distance?: number; // Distance from Sun (AU)
      }>
    >(),
    computedAt: timestamp("computed_at").notNull().defaultNow(),
  },
  (table) => ({
    objectIdx: index("skyviz_traj_object_idx").on(table.objectId),
    dateRangeIdx: index("skyviz_traj_daterange_idx").on(
      table.startDate,
      table.endDate
    ),
  })
);

// Sky path cache (pre-computed sky paths from Earth observer)
export const skyPathCache = pgTable(
  "skyviz_sky_path_cache",
  {
    id: serial("id").primaryKey(),
    objectId: integer("object_id")
      .notNull()
      .references(() => solarSystemObject.id, { onDelete: "cascade" }),
    observerLat: real("observer_lat").notNull(), // Observer latitude (degrees)
    observerLon: real("observer_lon").notNull(), // Observer longitude (degrees)
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }).notNull(),
    stepHours: real("step_hours").notNull(), // Step size in hours
    // Path points: array of {t, ra, dec, alt, az, magnitude, distance, visible}
    pathPoints: jsonb("path_points")
      .notNull()
      .$type<
        Array<{
          t: number; // Julian Date
          ra: number; // Right Ascension (radians)
          dec: number; // Declination (radians)
          alt: number; // Altitude (degrees)
          az: number; // Azimuth (degrees)
          magnitude?: number; // Apparent magnitude
          distance?: number; // Distance from Earth (AU)
          visible: boolean; // Above horizon
        }>
      >(),
    computedAt: timestamp("computed_at").notNull().defaultNow(),
  },
  (table) => ({
    objectIdx: index("skyviz_path_object_idx").on(table.objectId),
    locationIdx: index("skyviz_path_location_idx").on(
      table.observerLat,
      table.observerLon
    ),
    dateRangeIdx: index("skyviz_path_daterange_idx").on(
      table.startDate,
      table.endDate
    ),
  })
);

// Visualization assets (textures, images, 3D models)
export const visualizationAsset = pgTable(
  "skyviz_asset",
  {
    id: serial("id").primaryKey(),
    objectId: integer("object_id")
      .references(() => solarSystemObject.id, { onDelete: "cascade" }),
    assetType: varchar("asset_type", { length: 64 }).notNull(), // texture, image, model, icon
    url: text("url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    metadata: jsonb("metadata").$type<{
      width?: number;
      height?: number;
      format?: string;
      source?: string;
      license?: string;
      [key: string]: any;
    }>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    objectIdx: index("skyviz_asset_object_idx").on(table.objectId),
    typeIdx: index("skyviz_asset_type_idx").on(table.assetType),
  })
);

// ===== INSERT SCHEMAS =====

export const insertSolarSystemObjectSchema = createInsertSchema(
  solarSystemObject
).omit({ id: true, createdAt: true, updatedAt: true });

export const insertOrbitalDataSchema = createInsertSchema(orbitalData).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTrajectoryCacheSchema = createInsertSchema(
  trajectoryCache
).omit({ id: true, computedAt: true });

export const insertSkyPathCacheSchema = createInsertSchema(
  skyPathCache
).omit({ id: true, computedAt: true });

export const insertVisualizationAssetSchema = createInsertSchema(
  visualizationAsset
).omit({ id: true, createdAt: true });

// ===== TYPES =====

export type SolarSystemObject = typeof solarSystemObject.$inferSelect;
export type OrbitalData = typeof orbitalData.$inferSelect;
export type TrajectoryCache = typeof trajectoryCache.$inferSelect;
export type SkyPathCache = typeof skyPathCache.$inferSelect;
export type VisualizationAsset = typeof visualizationAsset.$inferSelect;
export type StarCatalog = typeof starCatalog.$inferSelect;

export const insertStarCatalogSchema = createInsertSchema(starCatalog).omit({
  id: true,
  updatedAt: true,
});
