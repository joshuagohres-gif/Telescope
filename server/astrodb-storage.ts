import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
const { Pool } = pg;
import {
  eq, desc, and, or, sql, lte, gte, like, inArray, isNull, between, asc
} from "drizzle-orm";
import {
  manufacturer,
  device,
  specKv,
  capability,
  media,
  catalogObject,
  aka,
  satellite,
  tle,
  event,
  visibility,
  eventTag,
  sourceRef,
  importRun,
  type Device,
  type CatalogObject,
  type Satellite,
  type TLE,
  type Event,
  type ImportRun,
} from "@shared/astrodb-schema";

export interface DeviceWithDetails extends Device {
  manufacturer?: { name: string; website: string | null };
  specs?: Array<{ key: string; value: string; unit: string | null }>;
  capabilities?: Array<{ name: string }>;
  media?: Array<{ url: string; kind: string }>;
}

export interface CatalogObjectWithAka extends CatalogObject {
  alternateNames?: string[];
}

export interface SatelliteWithTLE extends Satellite {
  latestTLE?: TLE;
}

export interface EventWithVisibility extends Event {
  visibility?: Array<{
    scope: string;
    continentCode: string | null;
    countryIso2: string | null;
    regionName: string | null;
  }>;
  tags?: string[];
}

export class AstroDbStorage {
  private db;

  constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.db = drizzle(pool);
  }

  // ===== EQUIPMENT =====

  async getDevices(filters: {
    category?: string;
    interface?: string;
    manufacturer?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ devices: DeviceWithDetails[]; total: number }> {
    const page = filters.page || 1;
    const pageSize = Math.min(filters.pageSize || 20, 100);
    const offset = (page - 1) * pageSize;

    // Build where conditions
    const conditions = [];
    if (filters.category) {
      conditions.push(eq(device.category, filters.category as any));
    }
    if (filters.interface) {
      conditions.push(eq(device.interface, filters.interface as any));
    }
    if (filters.q) {
      conditions.push(
        or(
          like(device.model, `%${filters.q}%`),
          sql`EXISTS (SELECT 1 FROM ${manufacturer} m WHERE m.id = ${device.manufacturerId} AND m.name ILIKE ${`%${filters.q}%`})`
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(device)
      .where(whereClause);
    const total = Number(countResult.count);

    // Get devices with manufacturer info
    const devices = await this.db
      .select({
        device,
        manufacturer,
      })
      .from(device)
      .leftJoin(manufacturer, eq(device.manufacturerId, manufacturer.id))
      .where(whereClause)
      .orderBy(desc(device.createdAt))
      .limit(pageSize)
      .offset(offset);

    // Enrich with specs, capabilities, media
    const enrichedDevices = await Promise.all(
      devices.map(async (row) => {
        const [specs, capabilities, mediaItems] = await Promise.all([
          this.db.select().from(specKv).where(eq(specKv.deviceId, row.device.id)),
          this.db.select().from(capability).where(eq(capability.deviceId, row.device.id)),
          this.db.select().from(media).where(eq(media.deviceId, row.device.id)),
        ]);

        return {
          ...row.device,
          manufacturer: row.manufacturer ? {
            name: row.manufacturer.name,
            website: row.manufacturer.website,
          } : undefined,
          specs: specs.map(s => ({ key: s.key, value: s.value, unit: s.unit })),
          capabilities: capabilities.map(c => ({ name: c.name })),
          media: mediaItems.map(m => ({ url: m.url, kind: m.kind })),
        };
      })
    );

    return { devices: enrichedDevices, total };
  }

  async getDeviceById(id: number): Promise<DeviceWithDetails | null> {
    const [deviceRow] = await this.db
      .select({
        device,
        manufacturer,
      })
      .from(device)
      .leftJoin(manufacturer, eq(device.manufacturerId, manufacturer.id))
      .where(eq(device.id, id))
      .limit(1);

    if (!deviceRow) return null;

    const [specs, capabilities, mediaItems] = await Promise.all([
      this.db.select().from(specKv).where(eq(specKv.deviceId, id)),
      this.db.select().from(capability).where(eq(capability.deviceId, id)),
      this.db.select().from(media).where(eq(media.deviceId, id)),
    ]);

    return {
      ...deviceRow.device,
      manufacturer: deviceRow.manufacturer ? {
        name: deviceRow.manufacturer.name,
        website: deviceRow.manufacturer.website,
      } : undefined,
      specs: specs.map(s => ({ key: s.key, value: s.value, unit: s.unit })),
      capabilities: capabilities.map(c => ({ name: c.name })),
      media: mediaItems.map(m => ({ url: m.url, kind: m.kind })),
    };
  }

  // ===== CATALOG =====

  async getCatalogObjects(filters: {
    class?: string;
    constellation?: string;
    magLte?: number;
    q?: string;
    nearRa?: number;
    nearDec?: number;
    radiusDeg?: number;
    page?: number;
    pageSize?: number;
  }): Promise<{ objects: CatalogObjectWithAka[]; total: number }> {
    const page = filters.page || 1;
    const pageSize = Math.min(filters.pageSize || 20, 100);
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (filters.class) {
      conditions.push(eq(catalogObject.class, filters.class as any));
    }
    if (filters.constellation) {
      conditions.push(eq(catalogObject.constellation, filters.constellation));
    }
    if (filters.magLte !== undefined) {
      conditions.push(lte(catalogObject.mag, filters.magLte));
    }
    if (filters.q) {
      conditions.push(
        or(
          like(catalogObject.primaryName, `%${filters.q}%`),
          sql`EXISTS (SELECT 1 FROM ${aka} a WHERE a.object_id = ${catalogObject.id} AND a.name ILIKE ${`%${filters.q}%`})`
        )
      );
    }
    if (filters.nearRa !== undefined && filters.nearDec !== undefined && filters.radiusDeg) {
      // Cone search - simplified for now (proper spherical distance would use Haversine)
      const radiusDeg = filters.radiusDeg;
      conditions.push(
        and(
          between(
            sql`CAST(${catalogObject.raJ2000Deg} AS NUMERIC)`,
            filters.nearRa - radiusDeg,
            filters.nearRa + radiusDeg
          ),
          between(
            sql`CAST(${catalogObject.decJ2000Deg} AS NUMERIC)`,
            filters.nearDec - radiusDeg,
            filters.nearDec + radiusDeg
          )
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(catalogObject)
      .where(whereClause);
    const total = Number(countResult.count);

    const objects = await this.db
      .select()
      .from(catalogObject)
      .where(whereClause)
      .orderBy(asc(catalogObject.mag))
      .limit(pageSize)
      .offset(offset);

    // Fetch alternate names
    const enrichedObjects = await Promise.all(
      objects.map(async (obj) => {
        const altNames = await this.db
          .select({ name: aka.name })
          .from(aka)
          .where(eq(aka.objectId, obj.id));
        return {
          ...obj,
          alternateNames: altNames.map(a => a.name),
        };
      })
    );

    return { objects: enrichedObjects, total };
  }

  async getCatalogObjectById(id: number): Promise<CatalogObjectWithAka | null> {
    const [obj] = await this.db
      .select()
      .from(catalogObject)
      .where(eq(catalogObject.id, id))
      .limit(1);

    if (!obj) return null;

    const altNames = await this.db
      .select({ name: aka.name })
      .from(aka)
      .where(eq(aka.objectId, id));

    return {
      ...obj,
      alternateNames: altNames.map(a => a.name),
    };
  }

  // ===== SATELLITES =====

  async getSatellites(filters: {
    brightFirst?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<{ satellites: SatelliteWithTLE[]; total: number }> {
    const page = filters.page || 1;
    const pageSize = Math.min(filters.pageSize || 50, 100);
    const offset = (page - 1) * pageSize;

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(satellite);
    const total = Number(countResult.count);

    const orderBy = filters.brightFirst
      ? asc(satellite.visualMagEst)
      : desc(satellite.createdAt);

    const satellites = await this.db
      .select()
      .from(satellite)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset);

    // Fetch latest TLE for each
    const enrichedSatellites = await Promise.all(
      satellites.map(async (sat) => {
        const [latestTLE] = await this.db
          .select()
          .from(tle)
          .where(eq(tle.noradId, sat.noradId))
          .orderBy(desc(tle.epoch))
          .limit(1);
        return {
          ...sat,
          latestTLE,
        };
      })
    );

    return { satellites: enrichedSatellites, total };
  }

  async getSatelliteByNoradId(noradId: number): Promise<SatelliteWithTLE | null> {
    const [sat] = await this.db
      .select()
      .from(satellite)
      .where(eq(satellite.noradId, noradId))
      .limit(1);

    if (!sat) return null;

    const [latestTLE] = await this.db
      .select()
      .from(tle)
      .where(eq(tle.noradId, noradId))
      .orderBy(desc(tle.epoch))
      .limit(1);

    return {
      ...sat,
      latestTLE,
    };
  }

  async getTLEsForSatellite(noradId: number, limit = 10): Promise<TLE[]> {
    return await this.db
      .select()
      .from(tle)
      .where(eq(tle.noradId, noradId))
      .orderBy(desc(tle.epoch))
      .limit(limit);
  }

  // ===== EVENTS =====

  async getEvents(filters: {
    type?: string;
    from?: Date;
    to?: Date;
    country?: string;
    continent?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ events: EventWithVisibility[]; total: number }> {
    const page = filters.page || 1;
    const pageSize = Math.min(filters.pageSize || 20, 100);
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (filters.type) {
      conditions.push(eq(event.type, filters.type as any));
    }
    if (filters.from) {
      conditions.push(gte(event.startUtc, filters.from));
    }
    if (filters.to) {
      conditions.push(lte(event.endUtc, filters.to));
    }
    if (filters.country || filters.continent) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${visibility} v 
          WHERE v.event_id = ${event.id} 
          AND (
            ${filters.country ? sql`v.country_iso2 = ${filters.country}` : sql`TRUE`}
            OR ${filters.continent ? sql`v.continent_code = ${filters.continent}` : sql`TRUE`}
          )
        )`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(event)
      .where(whereClause);
    const total = Number(countResult.count);

    const events = await this.db
      .select()
      .from(event)
      .where(whereClause)
      .orderBy(asc(event.startUtc))
      .limit(pageSize)
      .offset(offset);

    // Enrich with visibility and tags
    const enrichedEvents = await Promise.all(
      events.map(async (evt) => {
        const [visibilityData, tags] = await Promise.all([
          this.db.select().from(visibility).where(eq(visibility.eventId, evt.id)),
          this.db.select({ tag: eventTag.tag }).from(eventTag).where(eq(eventTag.eventId, evt.id)),
        ]);
        return {
          ...evt,
          visibility: visibilityData.map(v => ({
            scope: v.scope,
            continentCode: v.continentCode,
            countryIso2: v.countryIso2,
            regionName: v.regionName,
          })),
          tags: tags.map(t => t.tag),
        };
      })
    );

    return { events: enrichedEvents, total };
  }

  async getEventById(id: number): Promise<EventWithVisibility | null> {
    const [evt] = await this.db
      .select()
      .from(event)
      .where(eq(event.id, id))
      .limit(1);

    if (!evt) return null;

    const [visibilityData, tags] = await Promise.all([
      this.db.select().from(visibility).where(eq(visibility.eventId, id)),
      this.db.select({ tag: eventTag.tag }).from(eventTag).where(eq(eventTag.eventId, id)),
    ]);

    return {
      ...evt,
      visibility: visibilityData.map(v => ({
        scope: v.scope,
        continentCode: v.continentCode,
        countryIso2: v.countryIso2,
        regionName: v.regionName,
      })),
      tags: tags.map(t => t.tag),
    };
  }

  // ===== SOURCE REFERENCES =====

  async getSourcesForEntity(entityType: string, entityId: number) {
    return await this.db
      .select()
      .from(sourceRef)
      .where(and(eq(sourceRef.entityType, entityType), eq(sourceRef.entityId, entityId)));
  }

  // ===== IMPORT RUNS =====

  async createImportRun(domain: string): Promise<ImportRun> {
    const [run] = await this.db
      .insert(importRun)
      .values({ domain, status: 'running' })
      .returning();
    return run;
  }

  async updateImportRun(
    id: number,
    updates: {
      status?: string;
      completedAt?: Date;
      recordsFetched?: number;
      recordsInserted?: number;
      recordsUpdated?: number;
      errorMessage?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    await this.db
      .update(importRun)
      .set(updates)
      .where(eq(importRun.id, id));
  }

  async getImportRuns(domain?: string, limit = 20): Promise<ImportRun[]> {
    const whereClause = domain ? eq(importRun.domain, domain) : undefined;
    return await this.db
      .select()
      .from(importRun)
      .where(whereClause)
      .orderBy(desc(importRun.startedAt))
      .limit(limit);
  }
}

export const astroDbStorage = new AstroDbStorage();
