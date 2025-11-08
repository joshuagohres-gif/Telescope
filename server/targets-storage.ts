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
