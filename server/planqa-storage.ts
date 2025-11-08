import { desc, eq, and, gte, lte, sql, isNull } from "drizzle-orm";
import { db } from "@db";
import {
  recipe,
  snrModel,
  session,
  submetric,
  siteProfile,
  userSetting,
  type Recipe,
  type SnrModel,
  type Session,
  type SiteProfile,
  type UserSetting,
} from "../shared/planqa-schema";

// ===== PLANNING, QA & PERSONALIZATION STORAGE =====

export class PlanQaStorage {
  constructor(private db: typeof db) {}

  // ===== RECIPES =====

  async getRecipes(filters: {
    targetType?: string;
    targetClass?: string;
    filterName?: string;
    filter?: string;
    name?: string;
    limit?: number;
  }): Promise<Recipe[]> {
    const conditions = [];
    
    if (filters.targetClass) {
      conditions.push(eq(recipe.targetClass, filters.targetClass));
    } else if (filters.targetType) {
      conditions.push(eq(recipe.targetType, filters.targetType as any));
    }
    if (filters.filter) {
      conditions.push(eq(recipe.filter, filters.filter));
    } else if (filters.filterName) {
      conditions.push(eq(recipe.filterName, filters.filterName));
    }
    if (filters.name) {
      conditions.push(sql`${recipe.name} ILIKE ${'%' + filters.name + '%'}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const limit = filters.limit || 100;

    return await this.db
      .select()
      .from(recipe)
      .where(whereClause)
      .orderBy(desc(recipe.createdAt))
      .limit(limit);
  }

  async findRecipeByRule(filters: {
    targetClass: string;
    sky: number; // Sky brightness in mpsas
    filter: string;
    trainId?: string;
  }): Promise<Recipe | null> {
    // Bin sky brightness (e.g., 20.5 -> "20-21", 21.3 -> "21-22")
    const skyBin = this.binSkyMpsas(filters.sky);
    
    const conditions = [
      eq(recipe.targetClass, filters.targetClass),
      eq(recipe.skyMpsasBin, skyBin),
      eq(recipe.filter, filters.filter),
    ];

    if (filters.trainId) {
      conditions.push(eq(recipe.trainId, filters.trainId));
    }

    const results = await this.db
      .select()
      .from(recipe)
      .where(and(...conditions))
      .orderBy(desc(recipe.createdAt))
      .limit(1);

    return results[0] || null;
  }

  private binSkyMpsas(mpsas: number): string {
    // Bin sky brightness into ranges: 18-19, 19-20, 20-21, 21-22, 22+
    if (mpsas < 19) return "18-19";
    if (mpsas < 20) return "19-20";
    if (mpsas < 21) return "20-21";
    if (mpsas < 22) return "21-22";
    return "22+";
  }

  async getRecipeById(id: number): Promise<Recipe | undefined> {
    const results = await this.db.select().from(recipe).where(eq(recipe.id, id)).limit(1);
    return results[0];
  }

  // ===== SNR MODELS =====

  async getSnrModels(filters: {
    trainId?: string;
    filterName?: string;
    targetType?: string;
  }): Promise<SnrModel[]> {
    const conditions = [];
    
    if (filters.trainId) {
      conditions.push(eq(snrModel.trainId, filters.trainId));
    }
    if (filters.filterName) {
      conditions.push(eq(snrModel.filterName, filters.filterName));
    }
    if (filters.targetType) {
      conditions.push(eq(snrModel.targetType, filters.targetType as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return await this.db
      .select()
      .from(snrModel)
      .where(whereClause)
      .orderBy(desc(snrModel.updatedAt))
      .limit(50);
  }

  async estimateSnr(
    trainId: string,
    filterName: string,
    targetType: string,
    exposureSec: number,
    skyMpsas: number
  ): Promise<{ snr: number; model: string } | null> {
    // Find matching SNR model
    const models = await this.db
      .select()
      .from(snrModel)
      .where(and(
        eq(snrModel.trainId, trainId),
        eq(snrModel.filterName, filterName),
        eq(snrModel.targetType, targetType as any)
      ))
      .orderBy(desc(snrModel.updatedAt))
      .limit(1);

    if (models.length === 0) return null;

    const model = models[0];
    
    // Check if exposure is in valid range
    if (exposureSec < model.validRange.min_exp || exposureSec > model.validRange.max_exp) {
      return null;
    }

    // SNR model: SNR = a * sqrt(exp) * (1 - b * (mpsas_ref - mpsas)) + c
    const a = model.coeffsJson.a;
    const b = model.coeffsJson.b;
    const c = model.coeffsJson.c;
    const mpsas_ref = 21.0; // Reference sky

    const snr = a * Math.sqrt(exposureSec) * (1 - b * (mpsas_ref - skyMpsas)) + c;

    return {
      snr: Math.max(0, snr),
      model: `SNR = ${a.toFixed(2)} * sqrt(t) * (1 - ${b.toFixed(3)} * (21 - SQM)) + ${c.toFixed(2)}`,
    };
  }

  // ===== SESSIONS =====

  async getSessions(filters: {
    trainId?: string;
    siteId?: string;
    from?: Date;
    to?: Date;
    limit?: number;
  }): Promise<Session[]> {
    const conditions = [];
    
    if (filters.trainId) {
      conditions.push(eq(session.trainId, filters.trainId));
    }
    if (filters.siteId) {
      conditions.push(eq(session.siteId, filters.siteId));
    }
    if (filters.from) {
      conditions.push(gte(session.startedAt, filters.from));
    }
    if (filters.to) {
      conditions.push(lte(session.startedAt, filters.to));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const limit = filters.limit || 100;

    return await this.db
      .select()
      .from(session)
      .where(whereClause)
      .orderBy(desc(session.startedAt))
      .limit(limit);
  }

  async getSessionById(id: string): Promise<Session | undefined> {
    const results = await this.db.select().from(session).where(eq(session.id, id)).limit(1);
    return results[0];
  }

  async getSessionMetrics(sessionId: string): Promise<any[]> {
    return await this.db
      .select()
      .from(submetric)
      .where(eq(submetric.sessionId, sessionId))
      .orderBy(submetric.ts);
  }

  async getSessionQaSummary(sessionId: string): Promise<{
    frames: number;
    median_hfr: number;
    reject_rate: number;
    guiding_rms: { ra: number; dec: number } | null;
    notes: string | null;
  } | null> {
    const sess = await this.getSessionById(sessionId);
    if (!sess) return null;

    // Get submetrics (spec format)
    const submetrics = await this.db
      .select()
      .from(submetric)
      .where(eq(submetric.sessionId, sessionId))
      .orderBy(submetric.frameNo);

    if (submetrics.length === 0) {
      // Fallback to legacy metrics format
      const legacyMetrics = await this.getSessionMetrics(sessionId);
      if (legacyMetrics.length === 0) {
        return {
          frames: 0,
          median_hfr: 0,
          reject_rate: 0,
          guiding_rms: null,
          notes: sess.notes,
        };
      }
      // Convert legacy format
      return this.convertLegacyMetrics(sess, legacyMetrics);
    }

    // Calculate stats from submetrics
    const frames = submetrics.length;
    const hfrValues = submetrics.map(m => m.hfr).filter(h => h !== null && h !== undefined) as number[];
    const rejected = submetrics.filter(m => m.reject).length;
    const rejectRate = frames > 0 ? rejected / frames : 0;

    // Calculate median HFR
    let medianHfr = 0;
    if (hfrValues.length > 0) {
      const sorted = [...hfrValues].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      medianHfr = sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
    }

    // Calculate guiding RMS
    const rmsRaValues = submetrics.map(m => m.rmsRa).filter(r => r !== null && r !== undefined) as number[];
    const rmsDecValues = submetrics.map(m => m.rmsDec).filter(r => r !== null && r !== undefined) as number[];
    
    let guidingRms: { ra: number; dec: number } | null = null;
    if (rmsRaValues.length > 0 && rmsDecValues.length > 0) {
      const avgRa = rmsRaValues.reduce((a, b) => a + b, 0) / rmsRaValues.length;
      const avgDec = rmsDecValues.reduce((a, b) => a + b, 0) / rmsDecValues.length;
      guidingRms = { ra: avgRa, dec: avgDec };
    }

    return {
      frames,
      median_hfr: medianHfr,
      reject_rate: rejectRate,
      guiding_rms: guidingRms,
      notes: sess.notes,
    };
  }

  private convertLegacyMetrics(sess: Session, metrics: any[]): {
    frames: number;
    median_hfr: number;
    reject_rate: number;
    guiding_rms: { ra: number; dec: number } | null;
    notes: string | null;
  } {
    const frames = metrics.length;
    const hfrMetrics = metrics.filter(m => m.metricName === 'hfr');
    const hfrValues = hfrMetrics.map(m => m.value);
    
    let medianHfr = 0;
    if (hfrValues.length > 0) {
      const sorted = [...hfrValues].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      medianHfr = sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
    }

    const rejectMetrics = metrics.filter(m => m.metricName === 'reject' && m.value > 0);
    const rejectRate = frames > 0 ? rejectMetrics.length / frames : 0;

    const rmsRaMetrics = metrics.filter(m => m.metricName === 'rms_ra');
    const rmsDecMetrics = metrics.filter(m => m.metricName === 'rms_dec');
    
    let guidingRms: { ra: number; dec: number } | null = null;
    if (rmsRaMetrics.length > 0 && rmsDecMetrics.length > 0) {
      const avgRa = rmsRaMetrics.reduce((sum, m) => sum + m.value, 0) / rmsRaMetrics.length;
      const avgDec = rmsDecMetrics.reduce((sum, m) => sum + m.value, 0) / rmsDecMetrics.length;
      guidingRms = { ra: avgRa, dec: avgDec };
    }

    return {
      frames,
      median_hfr: medianHfr,
      reject_rate: rejectRate,
      guiding_rms: guidingRms,
      notes: sess.notes,
    };
  }

  // ===== USER PROFILES =====

  async getSiteProfiles(userId: string): Promise<SiteProfile[]> {
    return await this.db
      .select()
      .from(siteProfile)
      .where(eq(siteProfile.userId, userId))
      .orderBy(desc(siteProfile.isPrimary), siteProfile.label);
  }

  async getUserSettings(userId: string): Promise<UserSetting | undefined> {
    const results = await this.db
      .select()
      .from(userSetting)
      .where(eq(userSetting.userId, userId))
      .limit(1);
    return results[0];
  }

  // ===== ADMIN/UPSERT METHODS =====

  async upsertRecipe(data: any) {
    return await this.db
      .insert(recipe)
      .values(data)
      .onConflictDoNothing()
      .returning();
  }

  async upsertSnrModel(data: any) {
    return await this.db
      .insert(snrModel)
      .values(data)
      .onConflictDoNothing()
      .returning();
  }

  async upsertSession(data: any) {
    return await this.db
      .insert(session)
      .values(data)
      .onConflictDoUpdate({
        target: [session.id],
        set: data,
      })
      .returning();
  }

  async upsertSubmetric(data: any) {
    return await this.db
      .insert(submetric)
      .values(data)
      .onConflictDoNothing()
      .returning();
  }

  async upsertSiteProfile(data: any) {
    return await this.db
      .insert(siteProfile)
      .values(data)
      .onConflictDoUpdate({
        target: [siteProfile.userId, siteProfile.siteId],
        set: {
          label: data.label,
          isPrimary: data.isPrimary,
          prefsJson: data.prefsJson,
          updatedAt: new Date(),
        },
      })
      .returning();
  }

  async upsertUserSettings(data: any) {
    return await this.db
      .insert(userSetting)
      .values(data)
      .onConflictDoUpdate({
        target: [userSetting.userId],
        set: {
          settingsJson: data.settingsJson,
          updatedAt: new Date(),
        },
      })
      .returning();
  }
}

// Singleton instance
export const planQaStorage = new PlanQaStorage(db);
