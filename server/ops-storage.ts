import { desc, eq, and, gte, lte, sql, isNull, between } from "drizzle-orm";
import { db } from "@db";
import {
  site,
  meteo,
  meteoQuality,
  horizon,
  obstacle,
  dewEvent,
  dewProfile,
  dewControlHint,
  lpTile,
  siteLp,
  type Site,
  type Meteo,
  type Horizon,
  type Obstacle,
  type DewEvent,
  type LpTile,
  type SiteLp,
} from "../shared/ops-schema";
import { userSiteRegistry, type UserSiteRegistry } from "../shared/planqa-schema";

// ===== OPERATIONS & ENVIRONMENT STORAGE =====

export class OpsStorage {
  constructor(private db: typeof db) {}

  // ===== SITES =====

  async getSites(filters: {
    name?: string;
    near?: { lat: number; lon: number; radiusKm: number };
  }): Promise<Site[]> {
    const conditions = [];
    
    if (filters.name) {
      conditions.push(sql`${site.name} ILIKE ${'%' + filters.name + '%'}`);
    }

    // If near filter provided, use haversine formula
    if (filters.near) {
      const { lat, lon, radiusKm } = filters.near;
      conditions.push(sql`(
        6371 * acos(
          cos(radians(${lat})) * cos(radians(${site.lat})) * 
          cos(radians(${site.lon}) - radians(${lon})) + 
          sin(radians(${lat})) * sin(radians(${site.lat}))
        )
      ) <= ${radiusKm}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return await this.db
      .select()
      .from(site)
      .where(whereClause)
      .orderBy(site.name);
  }

  async getSiteById(id: string): Promise<Site | undefined> {
    const results = await this.db.select().from(site).where(eq(site.id, id)).limit(1);
    return results[0];
  }

  // ===== WEATHER/METEO =====

  async getMeteo(filters: {
    siteId: string;
    from?: Date;
    to?: Date;
    maxCloud?: number;
    minTransparency?: number;
    maxSeeing?: number;
  }): Promise<(Meteo & { quality?: any })[]> {
    const conditions = [eq(meteo.siteId, filters.siteId)];

    if (filters.from) {
      conditions.push(gte(meteo.ts, filters.from));
    }
    if (filters.to) {
      conditions.push(lte(meteo.ts, filters.to));
    }
    if (filters.maxCloud !== undefined) {
      conditions.push(lte(meteo.cloudPct, filters.maxCloud));
    }
    if (filters.minTransparency !== undefined) {
      conditions.push(gte(meteo.transparencyIdx, filters.minTransparency));
    }
    if (filters.maxSeeing !== undefined) {
      conditions.push(lte(meteo.seeingArcsec, filters.maxSeeing));
    }

    const results = await this.db
      .select({
        meteo,
        quality: meteoQuality,
      })
      .from(meteo)
      .leftJoin(meteoQuality, eq(meteo.id, meteoQuality.meteoId))
      .where(and(...conditions))
      .orderBy(meteo.ts)
      .limit(200);

    return results.map(r => ({
      ...r.meteo,
      quality: r.quality,
    }));
  }

  // ===== HORIZON =====

  async getHorizon(siteId: string): Promise<Horizon[]> {
    return await this.db
      .select()
      .from(horizon)
      .where(eq(horizon.siteId, siteId))
      .orderBy(horizon.azDeg);
  }

  async interpolateHorizonAlt(siteId: string, azDeg: number): Promise<number> {
    const points = await this.getHorizon(siteId);
    if (points.length === 0) return 0;

    // Normalize azimuth to 0-360
    let normalizedAz = azDeg;
    while (normalizedAz < 0) normalizedAz += 360;
    while (normalizedAz >= 360) normalizedAz -= 360;

    // Simple linear interpolation
    const sorted = points.sort((a, b) => a.azDeg - b.azDeg);
    
    // Find bracketing points (handle wrap-around at 360/0)
    let before = sorted[sorted.length - 1];
    let after = sorted[0];
    
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].azDeg <= normalizedAz) {
        before = sorted[i];
      }
      if (sorted[i].azDeg >= normalizedAz) {
        after = sorted[i];
        break;
      }
    }

    // Handle wrap-around case
    if (before.azDeg > normalizedAz) {
      // We're wrapping around 360/0
      const beforeAz = before.azDeg - 360;
      const fraction = (normalizedAz - beforeAz) / (after.azDeg - beforeAz);
      return before.altLimitDeg + fraction * (after.altLimitDeg - before.altLimitDeg);
    }

    if (before.azDeg === after.azDeg) return before.altLimitDeg;

    const fraction = (normalizedAz - before.azDeg) / (after.azDeg - before.azDeg);
    return before.altLimitDeg + fraction * (after.altLimitDeg - before.altLimitDeg);
  }

  async getHorizonInterpolated(siteId: string): Promise<Array<{ az_deg: number; alt_limit_deg: number }>> {
    // Return 360 points (0-359 degrees) with interpolated altitude limits
    const result = [];
    for (let az = 0; az < 360; az++) {
      const altLimit = await this.interpolateHorizonAlt(siteId, az);
      result.push({ az_deg: az, alt_limit_deg: altLimit });
    }
    return result;
  }

  // ===== OBSTACLES =====

  async getObstacles(siteId: string): Promise<Obstacle[]> {
    return await this.db
      .select()
      .from(obstacle)
      .where(eq(obstacle.siteId, siteId))
      .orderBy(desc(obstacle.createdAt));
  }

  // ===== DEW RISK =====

  async getDewRisk(filters: {
    siteId: string;
    from?: Date;
    to?: Date;
    minRisk?: 'low' | 'med' | 'high';
  }): Promise<DewEvent[]> {
    const conditions = [eq(dewEvent.siteId, filters.siteId)];

    if (filters.from) {
      conditions.push(gte(dewEvent.ts, filters.from));
    }
    if (filters.to) {
      conditions.push(lte(dewEvent.ts, filters.to));
    }

    const results = await this.db
      .select()
      .from(dewEvent)
      .where(and(...conditions))
      .orderBy(dewEvent.ts)
      .limit(200);

    // Filter by risk level if specified
    if (filters.minRisk) {
      const riskLevels = ['low', 'med', 'high'];
      const minIndex = riskLevels.indexOf(filters.minRisk);
      return results.filter(e => riskLevels.indexOf(e.risk) >= minIndex);
    }

    return results;
  }

  async calculateDewRisk(siteId: string, ts: Date): Promise<{ margin_c: number; risk: 'LOW' | 'MED' | 'HIGH' }> {
    // Get meteo data for the specified time (find closest within 1 hour)
    const oneHourAgo = new Date(ts.getTime() - 3600000);
    const oneHourLater = new Date(ts.getTime() + 3600000);
    
    const allMeteo = await this.db
      .select()
      .from(meteo)
      .where(
        and(
          eq(meteo.siteId, siteId),
          gte(meteo.ts, oneHourAgo),
          lte(meteo.ts, oneHourLater)
        )
      );

    if (allMeteo.length === 0) {
      throw new Error(`No meteo data found for site ${siteId} near time ${ts.toISOString()}`);
    }

    // Find closest by time difference
    let closest = allMeteo[0];
    let minDiff = Math.abs(closest.ts.getTime() - ts.getTime());
    for (const m of allMeteo) {
      const diff = Math.abs(m.ts.getTime() - ts.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closest = m;
      }
    }

    const marginC = closest.tempC - closest.dewpointC;
    
    let risk: 'LOW' | 'MED' | 'HIGH';
    if (marginC > 4) {
      risk = 'LOW';
    } else if (marginC >= 2) {
      risk = 'MED';
    } else {
      risk = 'HIGH';
    }

    return { margin_c: marginC, risk };
  }

  async getDewProfiles(deviceKey?: string): Promise<any[]> {
    const conditions = deviceKey ? [eq(dewProfile.deviceKey, deviceKey)] : [];

    return await this.db
      .select()
      .from(dewProfile)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(dewProfile.createdAt))
      .limit(100);
  }

  async getDewControlHints(trainId?: string): Promise<any[]> {
    const conditions = trainId ? [eq(dewControlHint.trainId, trainId)] : [];

    return await this.db
      .select()
      .from(dewControlHint)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(dewControlHint.updatedAt))
      .limit(50);
  }

  // ===== LIGHT POLLUTION =====

  async getLpTiles(filters: {
    z: number;
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    dataset?: string;
  }): Promise<LpTile[]> {
    const conditions = [
      eq(lpTile.z, filters.z),
      between(lpTile.x, filters.xMin, filters.xMax),
      between(lpTile.y, filters.yMin, filters.yMax),
    ];

    if (filters.dataset) {
      conditions.push(eq(lpTile.dataset, filters.dataset));
    }

    return await this.db
      .select()
      .from(lpTile)
      .where(and(...conditions))
      .limit(1000);
  }

  async getSiteLp(siteId: string): Promise<SiteLp | undefined> {
    const results = await this.db
      .select()
      .from(siteLp)
      .where(eq(siteLp.siteId, siteId))
      .limit(1);
    return results[0];
  }

  async findNearestSiteLp(lat: number, lon: number): Promise<{ mpsas_est: number } | null> {
    // Find nearest site with LP data using haversine formula
    const sitesWithLp = await this.db
      .select({
        siteId: site.id,
        lat: site.lat,
        lon: site.lon,
        mpsasEst: siteLp.mpsasEst,
      })
      .from(site)
      .innerJoin(siteLp, eq(site.id, siteLp.siteId));

    if (sitesWithLp.length === 0) {
      return null;
    }

    // Calculate distances and find nearest
    let nearest = sitesWithLp[0];
    let minDistance = Infinity;

    for (const s of sitesWithLp) {
      const distance = this.haversineDistance(lat, lon, s.lat, s.lon);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = s;
      }
    }

    return { mpsas_est: nearest.mpsasEst };
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // ===== USER SITE REGISTRY =====

  async getUserSites(): Promise<UserSiteRegistry[]> {
    return await this.db
      .select()
      .from(userSiteRegistry)
      .orderBy(userSiteRegistry.name);
  }

  // ===== ADMIN/UPSERT METHODS =====

  async upsertSite(data: any) {
    return await this.db
      .insert(site)
      .values(data)
      .onConflictDoUpdate({
        target: [site.id],
        set: {
          name: data.name,
          lat: data.lat,
          lon: data.lon,
          elevM: data.elevM,
          tz: data.tz,
        },
      })
      .returning();
  }

  async upsertMeteo(data: any) {
    return await this.db
      .insert(meteo)
      .values(data)
      .onConflictDoNothing()
      .returning();
  }

  async upsertHorizon(siteId: string, points: Array<{ azDeg: number; altLimitDeg: number; source?: string }>) {
    // Delete existing for site
    await this.db.delete(horizon).where(eq(horizon.siteId, siteId));
    
    // Insert new points
    if (points.length > 0) {
      await this.db.insert(horizon).values(
        points.map(p => ({ siteId, ...p }))
      );
    }
  }

  async upsertDewEvent(data: any) {
    return await this.db
      .insert(dewEvent)
      .values(data)
      .onConflictDoNothing()
      .returning();
  }

  async upsertLpTile(data: any) {
    return await this.db
      .insert(lpTile)
      .values(data)
      .onConflictDoUpdate({
        target: [lpTile.z, lpTile.x, lpTile.y, lpTile.dataset],
        set: {
          mpsas: data.mpsas,
          updatedAt: new Date(),
        },
      })
      .returning();
  }

  async upsertSiteLp(data: any) {
    return await this.db
      .insert(siteLp)
      .values(data)
      .onConflictDoUpdate({
        target: [siteLp.siteId],
        set: {
          mpsasEst: data.mpsasEst,
          method: data.method,
          updatedAt: new Date(),
        },
      })
      .returning();
  }
}

// Singleton instance
export const opsStorage = new OpsStorage(db);
