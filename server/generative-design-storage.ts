import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import {
  users,
  designSessions,
  designTurns,
  designStateSnapshots,
  bomItems,
  stageTransitions,
  type User,
  type DesignSession,
  type DesignTurn,
  type DesignStateSnapshot,
  type BomItem,
  type StageTransition,
  type InsertUser,
  type InsertDesignSession,
  type InsertDesignTurn,
  type InsertDesignStateSnapshot,
  type InsertBomItem,
  type InsertStageTransition,
  type PipelineStage,
} from "@shared/generative-design-schema";

// ============================================================================
// MOCK STORAGE (used when no DATABASE_URL is set)
// ============================================================================

interface MockStorage {
  users: Map<string, User>;
  designSessions: Map<string, DesignSession>;
  designTurns: Map<string, DesignTurn>;
  designStateSnapshots: Map<string, DesignStateSnapshot>;
  bomItems: Map<string, BomItem>;
  stageTransitions: Map<string, StageTransition>;
}

const mockStorage: MockStorage = {
  users: new Map(),
  designSessions: new Map(),
  designTurns: new Map(),
  designStateSnapshots: new Map(),
  bomItems: new Map(),
  stageTransitions: new Map(),
};

// Default anonymous user for mock mode
const DEFAULT_ANONYMOUS_USER: User = {
  id: "00000000-0000-0000-0000-000000000000",
  externalAuthId: null,
  displayName: "Anonymous User",
  createdAt: new Date(),
  updatedAt: new Date(),
};

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ============================================================================
// STORAGE CLASS
// ============================================================================

export class GenerativeDesignStorage {
  private useDatabase: boolean;

  constructor() {
    this.useDatabase = !!db;
    if (!this.useDatabase) {
      console.log("⚠️  GenerativeDesignStorage: Using mock storage (no DATABASE_URL)");
      // Initialize default user in mock storage
      mockStorage.users.set(DEFAULT_ANONYMOUS_USER.id, DEFAULT_ANONYMOUS_USER);
    }
  }

  // ==========================================================================
  // USER METHODS
  // ==========================================================================

  async getOrCreateAnonymousUser(): Promise<User> {
    if (!this.useDatabase) {
      return DEFAULT_ANONYMOUS_USER;
    }

    try {
      // Try to find an existing anonymous user
      const existing = await db!
        .select()
        .from(users)
        .where(eq(users.displayName, "Anonymous User"))
        .limit(1);

      if (existing.length > 0) {
        return existing[0];
      }

      // Create new anonymous user
      const [newUser] = await db!.insert(users).values({
        displayName: "Anonymous User",
      }).returning();

      return newUser;
    } catch (error) {
      console.error("Error in getOrCreateAnonymousUser:", error);
      throw error;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    if (!this.useDatabase) {
      return mockStorage.users.get(userId) || null;
    }

    try {
      const result = await db!.select().from(users).where(eq(users.id, userId)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error("Error in getUserById:", error);
      throw error;
    }
  }

  async createUser(data: InsertUser): Promise<User> {
    if (!this.useDatabase) {
      const newUser: User = {
        id: generateUUID(),
        externalAuthId: data.externalAuthId || null,
        displayName: data.displayName || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockStorage.users.set(newUser.id, newUser);
      return newUser;
    }

    try {
      const [newUser] = await db!.insert(users).values(data).returning();
      return newUser;
    } catch (error) {
      console.error("Error in createUser:", error);
      throw error;
    }
  }

  // ==========================================================================
  // DESIGN SESSION METHODS
  // ==========================================================================

  async createDesignSession(data: InsertDesignSession): Promise<DesignSession> {
    if (!this.useDatabase) {
      const newSession: DesignSession = {
        id: generateUUID(),
        userId: data.userId,
        title: data.title,
        status: data.status || "active",
        currentStage: data.currentStage || "STAGE_INITIAL_CRITERIA",
        selectedDomain: data.selectedDomain || "UNKNOWN",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockStorage.designSessions.set(newSession.id, newSession);
      return newSession;
    }

    try {
      const [newSession] = await db!.insert(designSessions).values(data).returning();
      return newSession;
    } catch (error) {
      console.error("Error in createDesignSession:", error);
      throw error;
    }
  }

  async getDesignSessionById(sessionId: string): Promise<DesignSession | null> {
    if (!this.useDatabase) {
      return mockStorage.designSessions.get(sessionId) || null;
    }

    try {
      const result = await db!.select().from(designSessions).where(eq(designSessions.id, sessionId)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error("Error in getDesignSessionById:", error);
      throw error;
    }
  }

  async getDesignSessionsByUserId(userId: string): Promise<DesignSession[]> {
    if (!this.useDatabase) {
      return Array.from(mockStorage.designSessions.values())
        .filter(s => s.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    try {
      return await db!
        .select()
        .from(designSessions)
        .where(eq(designSessions.userId, userId))
        .orderBy(desc(designSessions.createdAt));
    } catch (error) {
      console.error("Error in getDesignSessionsByUserId:", error);
      throw error;
    }
  }

  async updateDesignSession(
    sessionId: string,
    updates: Partial<Omit<DesignSession, "id" | "createdAt">>
  ): Promise<DesignSession> {
    if (!this.useDatabase) {
      const existing = mockStorage.designSessions.get(sessionId);
      if (!existing) {
        throw new Error(`Design session ${sessionId} not found`);
      }
      const updated = { ...existing, ...updates, updatedAt: new Date() };
      mockStorage.designSessions.set(sessionId, updated);
      return updated;
    }

    try {
      const [updated] = await db!
        .update(designSessions)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(designSessions.id, sessionId))
        .returning();

      if (!updated) {
        throw new Error(`Design session ${sessionId} not found`);
      }

      return updated;
    } catch (error) {
      console.error("Error in updateDesignSession:", error);
      throw error;
    }
  }

  // ==========================================================================
  // DESIGN TURN METHODS
  // ==========================================================================

  async createDesignTurn(data: InsertDesignTurn): Promise<DesignTurn> {
    if (!this.useDatabase) {
      const newTurn: DesignTurn = {
        id: generateUUID(),
        designSessionId: data.designSessionId,
        stage: data.stage,
        actorType: data.actorType,
        userVisibleText: data.userVisibleText || null,
        llmRawResponse: data.llmRawResponse || null,
        llmRequestPayload: data.llmRequestPayload || null,
        categorizationTags: (data.categorizationTags || []) as any,
        createdAt: new Date(),
      };
      mockStorage.designTurns.set(newTurn.id, newTurn);
      return newTurn;
    }

    try {
      const values: any = {
        ...data,
        categorizationTags: data.categorizationTags || [],
      };
      const [newTurn] = await db!.insert(designTurns).values(values).returning();
      return newTurn;
    } catch (error) {
      console.error("Error in createDesignTurn:", error);
      throw error;
    }
  }

  async getDesignTurnsBySessionId(sessionId: string): Promise<DesignTurn[]> {
    if (!this.useDatabase) {
      return Array.from(mockStorage.designTurns.values())
        .filter(t => t.designSessionId === sessionId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }

    try {
      return await db!
        .select()
        .from(designTurns)
        .where(eq(designTurns.designSessionId, sessionId))
        .orderBy(designTurns.createdAt);
    } catch (error) {
      console.error("Error in getDesignTurnsBySessionId:", error);
      throw error;
    }
  }

  // ==========================================================================
  // DESIGN STATE SNAPSHOT METHODS
  // ==========================================================================

  async createDesignStateSnapshot(data: InsertDesignStateSnapshot): Promise<DesignStateSnapshot> {
    if (!this.useDatabase) {
      const newSnapshot: DesignStateSnapshot = {
        id: generateUUID(),
        designSessionId: data.designSessionId,
        stage: data.stage,
        selectedDomain: data.selectedDomain,
        opticalDesign: data.opticalDesign || null,
        mechanicalDesign: data.mechanicalDesign || null,
        bom: data.bom || null,
        metadata: data.metadata || null,
        createdAt: new Date(),
      };
      mockStorage.designStateSnapshots.set(newSnapshot.id, newSnapshot);
      return newSnapshot;
    }

    try {
      const [newSnapshot] = await db!.insert(designStateSnapshots).values(data).returning();
      return newSnapshot;
    } catch (error) {
      console.error("Error in createDesignStateSnapshot:", error);
      throw error;
    }
  }

  async getLatestSnapshotBySessionId(sessionId: string): Promise<DesignStateSnapshot | null> {
    if (!this.useDatabase) {
      const snapshots = Array.from(mockStorage.designStateSnapshots.values())
        .filter(s => s.designSessionId === sessionId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return snapshots[0] || null;
    }

    try {
      const result = await db!
        .select()
        .from(designStateSnapshots)
        .where(eq(designStateSnapshots.designSessionId, sessionId))
        .orderBy(desc(designStateSnapshots.createdAt))
        .limit(1);
      return result[0] || null;
    } catch (error) {
      console.error("Error in getLatestSnapshotBySessionId:", error);
      throw error;
    }
  }

  async getSnapshotsBySessionId(sessionId: string): Promise<DesignStateSnapshot[]> {
    if (!this.useDatabase) {
      return Array.from(mockStorage.designStateSnapshots.values())
        .filter(s => s.designSessionId === sessionId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }

    try {
      return await db!
        .select()
        .from(designStateSnapshots)
        .where(eq(designStateSnapshots.designSessionId, sessionId))
        .orderBy(designStateSnapshots.createdAt);
    } catch (error) {
      console.error("Error in getSnapshotsBySessionId:", error);
      throw error;
    }
  }

  // ==========================================================================
  // BOM ITEM METHODS
  // ==========================================================================

  async createBomItem(data: InsertBomItem): Promise<BomItem> {
    if (!this.useDatabase) {
      const newItem: BomItem = {
        id: generateUUID(),
        designSessionId: data.designSessionId,
        stage: data.stage,
        category: data.category,
        name: data.name,
        specs: data.specs || null,
        estimatedQuantity: data.estimatedQuantity || null,
        estimatedCost: data.estimatedCost || null,
        createdAt: new Date(),
      };
      mockStorage.bomItems.set(newItem.id, newItem);
      return newItem;
    }

    try {
      const [newItem] = await db!.insert(bomItems).values(data).returning();
      return newItem;
    } catch (error) {
      console.error("Error in createBomItem:", error);
      throw error;
    }
  }

  async getBomItemsBySessionId(sessionId: string): Promise<BomItem[]> {
    if (!this.useDatabase) {
      return Array.from(mockStorage.bomItems.values())
        .filter(item => item.designSessionId === sessionId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }

    try {
      return await db!
        .select()
        .from(bomItems)
        .where(eq(bomItems.designSessionId, sessionId))
        .orderBy(bomItems.createdAt);
    } catch (error) {
      console.error("Error in getBomItemsBySessionId:", error);
      throw error;
    }
  }

  // ==========================================================================
  // STAGE TRANSITION METHODS
  // ==========================================================================

  async createStageTransition(data: InsertStageTransition): Promise<StageTransition> {
    if (!this.useDatabase) {
      const newTransition: StageTransition = {
        id: generateUUID(),
        designSessionId: data.designSessionId,
        fromStage: data.fromStage,
        toStage: data.toStage,
        reason: data.reason || null,
        triggerTurnId: data.triggerTurnId || null,
        createdAt: new Date(),
      };
      mockStorage.stageTransitions.set(newTransition.id, newTransition);
      return newTransition;
    }

    try {
      const [newTransition] = await db!.insert(stageTransitions).values(data).returning();
      return newTransition;
    } catch (error) {
      console.error("Error in createStageTransition:", error);
      throw error;
    }
  }

  async getStageTransitionsBySessionId(sessionId: string): Promise<StageTransition[]> {
    if (!this.useDatabase) {
      return Array.from(mockStorage.stageTransitions.values())
        .filter(t => t.designSessionId === sessionId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }

    try {
      return await db!
        .select()
        .from(stageTransitions)
        .where(eq(stageTransitions.designSessionId, sessionId))
        .orderBy(stageTransitions.createdAt);
    } catch (error) {
      console.error("Error in getStageTransitionsBySessionId:", error);
      throw error;
    }
  }

  // ==========================================================================
  // COMPOSITE QUERIES
  // ==========================================================================

  async getFullDesignSession(sessionId: string): Promise<{
    session: DesignSession;
    turns: DesignTurn[];
    snapshots: DesignStateSnapshot[];
    bomItems: BomItem[];
    transitions: StageTransition[];
  } | null> {
    const session = await this.getDesignSessionById(sessionId);
    if (!session) {
      return null;
    }

    const [turns, snapshots, bomItemsList, transitions] = await Promise.all([
      this.getDesignTurnsBySessionId(sessionId),
      this.getSnapshotsBySessionId(sessionId),
      this.getBomItemsBySessionId(sessionId),
      this.getStageTransitionsBySessionId(sessionId),
    ]);

    return {
      session,
      turns,
      snapshots,
      bomItems: bomItemsList,
      transitions,
    };
  }
}

// Singleton instance
export const generativeDesignStorage = new GenerativeDesignStorage();
