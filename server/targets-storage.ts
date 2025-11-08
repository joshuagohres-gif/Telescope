import { desc, eq, and, gte, lte, sql, isNull, between } from "drizzle-orm";
import { db } from "@db";
import {
  transient,
  notice,
  noticeXref,
  mpBody,
  ephem,
  orbitElem,
  feature,
  featureAka,
  hop,
  type Transient,
  type Notice,
  type MpBody,
  type Ephem,
  type Feature,
  type Hop,
} from "../shared/targets-schema";
import { catalogObject, satellite, tle } from "../shared/astrodb-schema";
import { hourlyAltAz, peakAltitude } from "../lib/astro/altaz";
import { findVisiblePasses, type TLE as TLEType } from "../lib/sat/propagate";

// ===== TARGETING & ALERTS STORAGE =====

export class TargetsStorage {
  constructor(private db: typeof db) {}

  // ===== TRANSIENTS =====

  async getTransients(filters: {
    type?: string;
    name?: string;
    minMag?: number;
    maxMag?: number;
    since?: Date;
    limit?: number;
  }): Promise<Transient[]> {
    const conditions = [];
    
    if (filters.type) {
      conditions.push(eq(transient.type, filters.type as any));
    }
    if (filters.name) {
      conditions.push(sql`${transient.name} ILIKE ${'%' + filters.name + '%'}`);
    }
    if (filters.minMag !== undefined) {
      conditions.push(lte(transient.currentMag, filters.minMag));
    }
    if (filters.maxMag !== undefined) {
      conditions.push(gte(transient.currentMag, filters.maxMag));
    }
    if (filters.since) {
      conditions.push(gte(transient.discoveryDate, filters.since));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const limit = filters.limit || 100;

    return await this.db
      .select()
      .from(transient)
      .where(whereClause)
      .orderBy(desc(transient.discoveryDate))
      .limit(limit);
  }

  async getTransientById(id: number): Promise<Transient | undefined> {
    const results = await this.db.select().from(transient).where(eq(transient.id, id)).limit(1);
    return results[0];
  }

  async getTransientByName(name: string): Promise<Transient | undefined> {
    const results = await this.db.select().from(transient).where(eq(transient.name, name)).limit(1);
    return results[0];
  }

  // ===== NOTICES =====

  async getNotices(filters: {
    transientId?: number;
    source?: string;
    since?: Date;
    limit?: number;
  }): Promise<(Notice & { xrefs?: any[] })[]> {
    const conditions = [];
    
    if (filters.transientId) {
      conditions.push(eq(notice.transientId, filters.transientId));
    }
    if (filters.source) {
      conditions.push(eq(notice.source, filters.source));
    }
    if (filters.since) {
      conditions.push(gte(notice.issuedAt, filters.since));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const limit = filters.limit || 100;

    const notices = await this.db
      .select()
      .from(notice)
      .where(whereClause)
      .orderBy(desc(notice.issuedAt))
      .limit(limit);

    // Enrich with cross-references
    const enriched = await Promise.all(
      notices.map(async (n) => {
        const xrefs = await this.db
          .select()
          .from(noticeXref)
          .where(eq(noticeXref.noticeId, n.id));
        return { ...n, xrefs };
      })
    );

    return enriched;
  }

  // ===== MINOR PLANETS =====

  async getMpBodies(filters: {
    designation?: string;
    name?: string;
    bodyType?: string;
    limit?: number;
  }): Promise<MpBody[]> {
    const conditions = [];
    
    if (filters.designation) {
      conditions.push(sql`${mpBody.designation} ILIKE ${'%' + filters.designation + '%'}`);
    }
    if (filters.name) {
      conditions.push(sql`${mpBody.name} ILIKE ${'%' + filters.name + '%'}`);
    }
    if (filters.bodyType) {
      conditions.push(eq(mpBody.bodyType, filters.bodyType as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const limit = filters.limit || 100;

    return await this.db
      .select()
      .from(mpBody)
      .where(whereClause)
      .orderBy(mpBody.designation)
      .limit(limit);
  }

  async getMpBodyById(id: number): Promise<MpBody | undefined> {
    const results = await this.db.select().from(mpBody).where(eq(mpBody.id, id)).limit(1);
    return results[0];
  }

  async getEphemeris(filters: {
    bodyId: number;
    from?: Date;
    to?: Date;
  }): Promise<Ephem[]> {
    const conditions = [eq(ephem.bodyId, filters.bodyId)];
    
    if (filters.from) {
      conditions.push(gte(ephem.ts, filters.from));
    }
    if (filters.to) {
      conditions.push(lte(ephem.ts, filters.to));
    }

    return await this.db
      .select()
      .from(ephem)
      .where(and(...conditions))
      .orderBy(ephem.ts)
      .limit(500);
  }

  async getOrbitElements(bodyId: number): Promise<any[]> {
    return await this.db
      .select()
      .from(orbitElem)
      .where(eq(orbitElem.bodyId, bodyId))
      .orderBy(desc(orbitElem.updatedAt))
      .limit(10);
  }

  // ===== FEATURES =====

  async getFeatures(filters: {
    body?: string;
    featureType?: string;
    name?: string;
    limit?: number;
  }): Promise<(Feature & { aliases?: string[] })[]> {
    const conditions = [];
    
    if (filters.body) {
      conditions.push(eq(feature.body, filters.body as any));
    }
    if (filters.featureType) {
      conditions.push(eq(feature.featureType, filters.featureType as any));
    }
    if (filters.name) {
      conditions.push(sql`${feature.name} ILIKE ${'%' + filters.name + '%'}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const limit = filters.limit || 100;

    const features = await this.db
      .select()
      .from(feature)
      .where(whereClause)
      .orderBy(feature.name)
      .limit(limit);

    // Enrich with aliases
    const enriched = await Promise.all(
      features.map(async (f) => {
        const aliases = await this.db
          .select()
          .from(featureAka)
          .where(eq(featureAka.featureId, f.id));
        return { ...f, aliases: aliases.map(a => a.alias) };
      })
    );

    return enriched;
  }

  async getFeaturesNear(
    body: string,
    lat: number,
    lon: number,
    radiusKm: number
  ): Promise<Feature[]> {
    // Use haversine formula to find features within radius
    const features = await this.db
      .select()
      .from(feature)
      .where(eq(feature.body, body.toLowerCase() as any));

    // Filter by distance
    const R = 6371; // Earth radius in km
    const nearby = features.filter((f) => {
      if (f.lat === null || f.lon === null) return false;
      
      const dLat = ((f.lat - lat) * Math.PI) / 180;
      const dLon = ((f.lon - lon) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat * Math.PI) / 180) *
          Math.cos((f.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;
      
      return distance <= radiusKm;
    });

    return nearby;
  }

  // ===== SHOWPIECES =====

  async getShowpiecesTonight(
    lat: number,
    lon: number,
    from: Date,
    to: Date,
    stepMinutes: number = 60
  ): Promise<Array<{
    name: string;
    class: string;
    ra: number;
    dec: number;
    mag: number;
    hourly: Array<{ time: Date; alt: number; az: number }>;
    peak_alt_deg: number;
  }>> {
    // Get all showpiece objects (bright objects)
    const objects = await this.db
      .select()
      .from(catalogObject)
      .where(
        and(
          lte(catalogObject.mag, 10.0), // Bright objects only
          isNull(catalogObject.mag) === false
        )
      )
      .limit(100);

    const results = [];

    for (const obj of objects) {
      const ra = parseFloat(obj.raJ2000Deg);
      const dec = parseFloat(obj.decJ2000Deg);
      
      if (isNaN(ra) || isNaN(dec)) continue;

      const hourly = hourlyAltAz(ra, dec, lat, lon, from, to, stepMinutes);
      const { peakAlt } = peakAltitude(ra, dec, lat, lon, from, to);

      // Only include objects that rise above horizon
      if (peakAlt > 0) {
        results.push({
          name: obj.primaryName,
          class: obj.class,
          ra,
          dec,
          mag: obj.mag || 99,
          hourly,
          peak_alt_deg: peakAlt,
        });
      }
    }

    // Sort by peak altitude (descending)
    results.sort((a, b) => b.peak_alt_deg - a.peak_alt_deg);

    return results;
  }

  // ===== SATELLITE PASSES =====

  async getSatellitePasses(
    noradId: number,
    lat: number,
    lon: number,
    altM: number,
    from: Date,
    to: Date
  ): Promise<Array<{
    start: Date;
    peak: Date;
    end: Date;
    max_el_deg: number;
    az_start: number;
    az_peak: number;
  }>> {
    // Get satellite record
    const sat = await this.db
      .select()
      .from(satellite)
      .where(eq(satellite.noradId, noradId))
      .limit(1);

    if (sat.length === 0) {
      throw new Error(`Satellite with NORAD ID ${noradId} not found`);
    }

    // Get latest TLE
    const tles = await this.db
      .select()
      .from(tle)
      .where(eq(tle.noradId, noradId))
      .orderBy(desc(tle.epoch))
      .limit(1);

    if (tles.length === 0) {
      throw new Error(`No TLE data found for satellite ${noradId}`);
    }

    const tleData: TLEType = {
      line1: tles[0].line1,
      line2: tles[0].line2,
      epoch: tles[0].epoch,
    };

    const observer = { lat, lon, alt: altM };
    const passes = findVisiblePasses(tleData, observer, from, to);

    return passes.map((p) => ({
      start: p.start,
      peak: p.peak,
      end: p.end,
      max_el_deg: p.maxElDeg,
      az_start: p.azStart,
      az_peak: p.azPeak,
    }));
  }

  // ===== STAR HOPS =====

  async getStarHops(targetName: string): Promise<Hop[]> {
    return await this.db
      .select()
      .from(hop)
      .where(eq(hop.targetName, targetName))
      .orderBy(hop.waypointIdx);
  }

  async searchStarHops(query: string, limit: number = 50): Promise<{ target: string; hopCount: number }[]> {
    // Find targets with matching names
    const results = await this.db
      .select({
        target: hop.targetName,
      })
      .from(hop)
      .where(sql`${hop.targetName} ILIKE ${'%' + query + '%'}`)
      .groupBy(hop.targetName)
      .limit(limit);

    // Count hops for each target
    const enriched = await Promise.all(
      results.map(async (r) => {
        const hops = await this.db
          .select({ count: sql<number>`count(*)` })
          .from(hop)
          .where(eq(hop.targetName, r.target));
        return { target: r.target, hopCount: hops[0]?.count || 0 };
      })
    );

    return enriched;
  }

  // ===== ADMIN/UPSERT METHODS =====

  async upsertTransient(data: any) {
    return await this.db
      .insert(transient)
      .values(data)
      .onConflictDoUpdate({
        target: [transient.name],
        set: {
          ...data,
          updatedAt: new Date(),
        },
      })
      .returning();
  }

  async upsertNotice(data: any) {
    return await this.db
      .insert(notice)
      .values(data)
      .onConflictDoUpdate({
        target: [notice.source, notice.noticeId],
        set: data,
      })
      .returning();
  }

  async upsertMpBody(data: any) {
    return await this.db
      .insert(mpBody)
      .values(data)
      .onConflictDoUpdate({
        target: [mpBody.designation],
        set: data,
      })
      .returning();
  }

  async upsertEphemeris(data: any) {
    return await this.db
      .insert(ephem)
      .values(data)
      .onConflictDoUpdate({
        target: [ephem.bodyId, ephem.ts],
        set: {
          ra: data.ra,
          dec: data.dec,
          vmag: data.vmag,
          delta: data.delta,
          rHelio: data.rHelio,
          phaseAngle: data.phaseAngle,
          elongation: data.elongation,
          computedAt: new Date(),
        },
      })
      .returning();
  }

  async upsertOrbitElements(data: any) {
    return await this.db
      .insert(orbitElem)
      .values(data)
      .onConflictDoNothing()
      .returning();
  }

  async upsertFeature(data: any) {
    return await this.db
      .insert(feature)
      .values(data)
      .onConflictDoUpdate({
        target: [feature.body, feature.name],
        set: data,
      })
      .returning();
  }

  async upsertHop(data: any) {
    return await this.db
      .insert(hop)
      .values(data)
      .onConflictDoNothing()
      .returning();
  }
}

// Singleton instance
export const targetsStorage = new TargetsStorage(db);
