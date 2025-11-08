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
    filterName?: string;
    name?: string;
    limit?: number;
  }): Promise<Recipe[]> {
    const conditions = [];
    
    if (filters.targetType) {
      conditions.push(eq(recipe.targetType, filters.targetType as any));
    }
    if (filters.filterName) {
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
    session: Session;
    metrics: Record<string, { avg: number; min: number; max: number; unit: string }>;
  } | null> {
    const sess = await this.getSessionById(sessionId);
    if (!sess) return null;

    const metrics = await this.getSessionMetrics(sessionId);

    // Group by metric name and compute stats
    const summary: Record<string, { avg: number; min: number; max: number; unit: string }> = {};
    
    for (const m of metrics) {
      if (!summary[m.metricName]) {
        summary[m.metricName] = {
          avg: 0,
          min: m.value,
          max: m.value,
          unit: m.unit || '',
        };
      }
      summary[m.metricName].min = Math.min(summary[m.metricName].min, m.value);
      summary[m.metricName].max = Math.max(summary[m.metricName].max, m.value);
    }

    // Calculate averages
    for (const metricName in summary) {
      const values = metrics.filter(m => m.metricName === metricName).map(m => m.value);
      summary[metricName].avg = values.reduce((a, b) => a + b, 0) / values.length;
    }

    return { session: sess, metrics: summary };
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
