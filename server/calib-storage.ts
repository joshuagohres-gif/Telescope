import { desc, eq, and, gte, lte, sql, isNull } from "drizzle-orm";
import { db } from "@db";
import {
  opticalTrain,
  masterFrame,
  frameIndex,
  focusSample,
  focusProfile,
  backfocusOffset,
  pointingModel,
  pecProfile,
  filter,
  filterCurve,
  sensor,
  sensorQe,
  type OpticalTrain,
  type MasterFrame,
  type FocusSample,
  type FocusProfile,
  type PointingModel,
  type PecProfile,
  type Filter,
  type Sensor,
} from "../shared/calib-schema";

// ===== CALIBRATION STORAGE =====

export class CalibStorage {
  constructor(private db: typeof db) {}

  // ===== OPTICAL TRAINS =====

  async getOpticalTrains(filters: { name?: string }): Promise<OpticalTrain[]> {
    const conditions = [];
    
    if (filters.name) {
      conditions.push(sql`${opticalTrain.name} ILIKE ${'%' + filters.name + '%'}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return await this.db
      .select()
      .from(opticalTrain)
      .where(whereClause)
      .orderBy(desc(opticalTrain.updatedAt));
  }

  async getOpticalTrainById(id: string): Promise<OpticalTrain | undefined> {
    const results = await this.db.select().from(opticalTrain).where(eq(opticalTrain.id, id)).limit(1);
    return results[0];
  }

  // ===== MASTER FRAMES =====

  async getMasterFrames(filters: {
    trainId?: string;
    frameType?: 'bias' | 'dark' | 'flat' | 'darkflat';
    filterName?: string;
    binning?: string;
    limit?: number;
  }): Promise<(MasterFrame & { tags?: any[] })[]> {
    const conditions = [];
    
    if (filters.trainId) {
      conditions.push(eq(masterFrame.trainId, filters.trainId));
    }
    if (filters.frameType) {
      conditions.push(eq(masterFrame.frameType, filters.frameType));
    }
    if (filters.filterName) {
      conditions.push(eq(masterFrame.filterName, filters.filterName));
    }
    if (filters.binning) {
      conditions.push(eq(masterFrame.binning, filters.binning));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const limit = filters.limit || 50;

    const frames = await this.db
      .select()
      .from(masterFrame)
      .where(whereClause)
      .orderBy(desc(masterFrame.capturedAt))
      .limit(limit);

    // Enrich with tags
    const enriched = await Promise.all(
      frames.map(async (frame) => {
        const tags = await this.db
          .select()
          .from(frameIndex)
          .where(eq(frameIndex.masterId, frame.id));
        return { ...frame, tags };
      })
    );

    return enriched;
  }

  // ===== FOCUS DATA =====

  async getFocusSamples(filters: {
    trainId?: string;
    sessionId?: string;
    from?: Date;
    to?: Date;
    limit?: number;
  }): Promise<FocusSample[]> {
    const conditions = [];
    
    if (filters.trainId) {
      conditions.push(eq(focusSample.trainId, filters.trainId));
    }
    if (filters.sessionId) {
      conditions.push(eq(focusSample.sessionId, filters.sessionId));
    }
    if (filters.from) {
      conditions.push(gte(focusSample.ts, filters.from));
    }
    if (filters.to) {
      conditions.push(lte(focusSample.ts, filters.to));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const limit = filters.limit || 200;

    return await this.db
      .select()
      .from(focusSample)
      .where(whereClause)
      .orderBy(focusSample.ts)
      .limit(limit);
  }

  async getFocusProfiles(filters: {
    trainId?: string;
    filterName?: string;
  }): Promise<FocusProfile[]> {
    const conditions = [];
    
    if (filters.trainId) {
      conditions.push(eq(focusProfile.trainId, filters.trainId));
    }
    if (filters.filterName) {
      conditions.push(eq(focusProfile.filterName, filters.filterName));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return await this.db
      .select()
      .from(focusProfile)
      .where(whereClause)
      .orderBy(desc(focusProfile.createdAt))
      .limit(50);
  }

  async getBackfocusOffsets(trainId: string): Promise<any[]> {
    return await this.db
      .select()
      .from(backfocusOffset)
      .where(eq(backfocusOffset.trainId, trainId))
      .orderBy(backfocusOffset.filterName);
  }

  async estimateFocus(trainId: string, filterName: string, tempC: number): Promise<{ estimatedPos: number; confidence: string } | null> {
    // Get latest focus profile for this train/filter
    const profiles = await this.db
      .select()
      .from(focusProfile)
      .where(and(
        eq(focusProfile.trainId, trainId),
        eq(focusProfile.filterName, filterName)
      ))
      .orderBy(desc(focusProfile.createdAt))
      .limit(1);

    if (profiles.length === 0) return null;

    const profile = profiles[0];
    
    // Simple linear temperature compensation
    // Assume 1 tick per degree C (typical for most focusers)
    const tempDelta = tempC - (profile.tempC || 15.0);
    const tempCompensation = Math.round(tempDelta * 1.0);
    
    const estimatedPos = profile.optimalPos + tempCompensation;
    
    // Confidence based on R² and sample count
    let confidence = 'low';
    if (profile.r2 > 0.95 && profile.sampleCount >= 7) {
      confidence = 'high';
    } else if (profile.r2 > 0.85 && profile.sampleCount >= 5) {
      confidence = 'medium';
    }

    return { estimatedPos, confidence };
  }

  // ===== POINTING MODELS =====

  async getPointingModels(trainId?: string): Promise<PointingModel[]> {
    const conditions = trainId ? [eq(pointingModel.trainId, trainId)] : [];

    return await this.db
      .select()
      .from(pointingModel)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(pointingModel.createdAt))
      .limit(50);
  }

  // ===== PEC PROFILES =====

  async getPecProfiles(filters: {
    mountModel?: string;
    axis?: string;
  }): Promise<PecProfile[]> {
    const conditions = [];
    
    if (filters.mountModel) {
      conditions.push(eq(pecProfile.mountModel, filters.mountModel));
    }
    if (filters.axis) {
      conditions.push(eq(pecProfile.axis, filters.axis));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return await this.db
      .select()
      .from(pecProfile)
      .where(whereClause)
      .orderBy(desc(pecProfile.capturedAt))
      .limit(50);
  }

  // ===== FILTERS & SENSORS =====

  async getFilters(name?: string): Promise<Filter[]> {
    const conditions = name ? [sql`${filter.name} ILIKE ${'%' + name + '%'}`] : [];

    return await this.db
      .select()
      .from(filter)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(filter.name);
  }

  async getFilterWithCurve(filterId: number): Promise<{ filter: Filter; curve: any[] } | null> {
    const filters = await this.db.select().from(filter).where(eq(filter.id, filterId)).limit(1);
    if (filters.length === 0) return null;

    const curve = await this.db
      .select()
      .from(filterCurve)
      .where(eq(filterCurve.filterId, filterId))
      .orderBy(filterCurve.wavelengthNm);

    return { filter: filters[0], curve };
  }

  async getSensors(model?: string): Promise<Sensor[]> {
    const conditions = model ? [sql`${sensor.model} ILIKE ${'%' + model + '%'}`] : [];

    return await this.db
      .select()
      .from(sensor)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sensor.model);
  }

  async getSensorWithQe(sensorId: number): Promise<{ sensor: Sensor; qeCurve: any[] } | null> {
    const sensors = await this.db.select().from(sensor).where(eq(sensor.id, sensorId)).limit(1);
    if (sensors.length === 0) return null;

    const qeCurve = await this.db
      .select()
      .from(sensorQe)
      .where(eq(sensorQe.sensorId, sensorId))
      .orderBy(sensorQe.wavelengthNm);

    return { sensor: sensors[0], qeCurve };
  }

  // ===== ADMIN/UPSERT METHODS =====

  async upsertOpticalTrain(data: any) {
    return await this.db
      .insert(opticalTrain)
      .values(data)
      .onConflictDoUpdate({
        target: [opticalTrain.id],
        set: {
          ...data,
          updatedAt: new Date(),
        },
      })
      .returning();
  }

  async upsertMasterFrame(data: any) {
    return await this.db
      .insert(masterFrame)
      .values(data)
      .onConflictDoNothing()
      .returning();
  }

  async upsertFocusSample(data: any) {
    return await this.db
      .insert(focusSample)
      .values(data)
      .onConflictDoNothing()
      .returning();
  }

  async upsertFocusProfile(data: any) {
    return await this.db
      .insert(focusProfile)
      .values(data)
      .onConflictDoNothing()
      .returning();
  }

  async upsertBackfocusOffset(data: any) {
    return await this.db
      .insert(backfocusOffset)
      .values(data)
      .onConflictDoUpdate({
        target: [backfocusOffset.trainId, backfocusOffset.filterName],
        set: {
          offsetMm: data.offsetMm,
          confidencePct: data.confidencePct,
          measurementCount: data.measurementCount,
          updatedAt: new Date(),
        },
      })
      .returning();
  }

  async upsertPointingModel(data: any) {
    return await this.db
      .insert(pointingModel)
      .values(data)
      .onConflictDoNothing()
      .returning();
  }

  async upsertPecProfile(data: any) {
    return await this.db
      .insert(pecProfile)
      .values(data)
      .onConflictDoNothing()
      .returning();
  }

  async upsertFilter(data: any) {
    return await this.db
      .insert(filter)
      .values(data)
      .onConflictDoUpdate({
        target: [filter.name],
        set: data,
      })
      .returning();
  }

  async upsertSensor(data: any) {
    return await this.db
      .insert(sensor)
      .values(data)
      .onConflictDoUpdate({
        target: [sensor.model],
        set: data,
      })
      .returning();
  }
}

// Singleton instance
export const calibStorage = new CalibStorage(db);
