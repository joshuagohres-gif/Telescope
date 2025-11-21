import { db } from "@db";
import {
  solarSystemObject,
  orbitalData,
  trajectoryCache,
  skyPathCache,
  visualizationAsset,
  type SolarSystemObject,
  type OrbitalData,
  type TrajectoryCache,
  type SkyPathCache,
  type VisualizationAsset,
} from "@shared/sky-visualizers-schema";
import { eq, and, gte, lte, or, ilike, desc } from "drizzle-orm";

/**
 * Storage layer for Sky Visualizers feature
 */
export class SkyVisualizersStorage {
  // ===== SOLAR SYSTEM OBJECTS =====

  async getObjects(filters?: {
    type?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<SolarSystemObject[]> {
    let query = db.select().from(solarSystemObject);

    const conditions = [];

    if (filters?.type) {
      conditions.push(eq(solarSystemObject.type, filters.type as any));
    }

    if (filters?.search) {
      conditions.push(
        or(
          ilike(solarSystemObject.name, `%${filters.search}%`),
          ilike(solarSystemObject.designation, `%${filters.search}%`)
        )!
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(solarSystemObject.name));

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.offset(filters.offset);
    }

    return await query;
  }

  async getObjectById(id: number): Promise<SolarSystemObject | null> {
    const result = await db
      .select()
      .from(solarSystemObject)
      .where(eq(solarSystemObject.id, id))
      .limit(1);

    return result[0] || null;
  }

  async getObjectByName(name: string): Promise<SolarSystemObject | null> {
    const result = await db
      .select()
      .from(solarSystemObject)
      .where(eq(solarSystemObject.name, name))
      .limit(1);

    return result[0] || null;
  }

  async upsertObject(
    data: Omit<SolarSystemObject, "id" | "createdAt" | "updatedAt">
  ): Promise<SolarSystemObject> {
    // Try to find existing object by designation or name
    const existing = data.designation
      ? await db
          .select()
          .from(solarSystemObject)
          .where(eq(solarSystemObject.designation, data.designation))
          .limit(1)
      : await db
          .select()
          .from(solarSystemObject)
          .where(eq(solarSystemObject.name, data.name))
          .limit(1);

    if (existing[0]) {
      // Update existing
      const [updated] = await db
        .update(solarSystemObject)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(solarSystemObject.id, existing[0].id))
        .returning();

      return updated;
    } else {
      // Insert new
      const [inserted] = await db
        .insert(solarSystemObject)
        .values(data)
        .returning();

      return inserted;
    }
  }

  // ===== ORBITAL DATA =====

  async getOrbitalData(
    objectId: number,
    epoch?: number
  ): Promise<OrbitalData | null> {
    let query = db
      .select()
      .from(orbitalData)
      .where(eq(orbitalData.objectId, objectId));

    if (epoch) {
      query = query.where(
        and(eq(orbitalData.objectId, objectId), eq(orbitalData.epoch, epoch))
      ) as any;
    }

    query = query.orderBy(desc(orbitalData.epoch)).limit(1);

    const result = await query;
    return result[0] || null;
  }

  async upsertOrbitalData(
    data: Omit<OrbitalData, "id" | "createdAt" | "updatedAt">
  ): Promise<OrbitalData> {
    // Check if orbital data exists for this object and epoch
    const existing = await db
      .select()
      .from(orbitalData)
      .where(
        and(
          eq(orbitalData.objectId, data.objectId),
          eq(orbitalData.epoch, data.epoch)
        )
      )
      .limit(1);

    if (existing[0]) {
      const [updated] = await db
        .update(orbitalData)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(orbitalData.id, existing[0].id))
        .returning();

      return updated;
    } else {
      const [inserted] = await db
        .insert(orbitalData)
        .values(data)
        .returning();

      return inserted;
    }
  }

  // ===== TRAJECTORY CACHE =====

  async getTrajectoryCache(
    objectId: number,
    startDate: Date,
    endDate: Date,
    stepDays: number
  ): Promise<TrajectoryCache | null> {
    const result = await db
      .select()
      .from(trajectoryCache)
      .where(
        and(
          eq(trajectoryCache.objectId, objectId),
          eq(trajectoryCache.startDate, startDate),
          eq(trajectoryCache.endDate, endDate),
          eq(trajectoryCache.stepDays, stepDays)
        )
      )
      .limit(1);

    return result[0] || null;
  }

  async saveTrajectoryCache(
    data: Omit<TrajectoryCache, "id" | "computedAt">
  ): Promise<TrajectoryCache> {
    // Check for existing cache
    const existing = await this.getTrajectoryCache(
      data.objectId,
      data.startDate,
      data.endDate,
      data.stepDays
    );

    if (existing) {
      const [updated] = await db
        .update(trajectoryCache)
        .set({
          ...data,
          computedAt: new Date(),
        })
        .where(eq(trajectoryCache.id, existing.id))
        .returning();

      return updated;
    } else {
      const [inserted] = await db
        .insert(trajectoryCache)
        .values(data)
        .returning();

      return inserted;
    }
  }

  // ===== SKY PATH CACHE =====

  async getSkyPathCache(
    objectId: number,
    observerLat: number,
    observerLon: number,
    startDate: Date,
    endDate: Date,
    stepHours: number
  ): Promise<SkyPathCache | null> {
    const result = await db
      .select()
      .from(skyPathCache)
      .where(
        and(
          eq(skyPathCache.objectId, objectId),
          eq(skyPathCache.observerLat, observerLat),
          eq(skyPathCache.observerLon, observerLon),
          eq(skyPathCache.startDate, startDate),
          eq(skyPathCache.endDate, endDate),
          eq(skyPathCache.stepHours, stepHours)
        )
      )
      .limit(1);

    return result[0] || null;
  }

  async saveSkyPathCache(
    data: Omit<SkyPathCache, "id" | "computedAt">
  ): Promise<SkyPathCache> {
    // Check for existing cache
    const existing = await this.getSkyPathCache(
      data.objectId,
      data.observerLat,
      data.observerLon,
      data.startDate,
      data.endDate,
      data.stepHours
    );

    if (existing) {
      const [updated] = await db
        .update(skyPathCache)
        .set({
          ...data,
          computedAt: new Date(),
        })
        .where(eq(skyPathCache.id, existing.id))
        .returning();

      return updated;
    } else {
      const [inserted] = await db
        .insert(skyPathCache)
        .values(data)
        .returning();

      return inserted;
    }
  }

  // ===== VISUALIZATION ASSETS =====

  async getAssets(objectId?: number): Promise<VisualizationAsset[]> {
    let query = db.select().from(visualizationAsset);

    if (objectId) {
      query = query.where(eq(visualizationAsset.objectId, objectId)) as any;
    }

    return await query;
  }

  async upsertAsset(
    data: Omit<VisualizationAsset, "id" | "createdAt">
  ): Promise<VisualizationAsset> {
    // For simplicity, always insert new assets
    // In production, you might want to check for duplicates
    const [inserted] = await db
      .insert(visualizationAsset)
      .values(data)
      .returning();

    return inserted;
  }
}

export const skyVisualizersStorage = new SkyVisualizersStorage();
