/**
 * Secure Account Storage
 * 
 * Provides database operations for secure account management with:
 * - Privacy-by-design data handling
 * - Audit logging for security events
 * - Rate limiting support
 * - GDPR-compliant data operations
 */

import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzleNode } from "drizzle-orm/node-postgres";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import pg from "pg";
import { eq, and, gt, lt, desc, sql, isNull } from "drizzle-orm";
import ws from "ws";
import { randomUUID } from "crypto";

import {
  secureAccounts,
  userSettings,
  chatHistories,
  dataConsents,
  securityAuditLogs,
  accountRecovery,
  secureSessions,
  rateLimits,
  dataRequests,
  type SecureAccount,
  type InsertSecureAccount,
  type UserSettings,
  type InsertUserSettings,
  type ChatHistory,
  type InsertChatHistory,
  type DataConsent,
  type InsertDataConsent,
  type SecurityAuditLog,
  type InsertSecurityAuditLog,
  type AccountRecovery,
  type SecureSession,
  type InsertSecureSession,
  type RateLimit,
  type DataRequest,
  type PublicProfile,
} from "@shared/secure-account-schema";

import {
  hashPassword,
  verifyPassword as verifyPasswordHash,
  sha256Hash,
  generateSecureToken,
  hashToken,
  encryptData,
  decryptData,
  anonymizeUserData,
} from "./lib/crypto-utils";

neonConfig.webSocketConstructor = ws as any;

// Session configuration
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ABSOLUTE_SESSION_MAX_MS = 90 * 24 * 60 * 60 * 1000; // 90 days absolute max
const RECOVERY_TOKEN_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Rate limiting configuration
const RATE_LIMIT_WINDOWS = {
  login: { windowMs: 15 * 60 * 1000, maxAttempts: 5, blockDurationMs: 30 * 60 * 1000 },
  register: { windowMs: 60 * 60 * 1000, maxAttempts: 3, blockDurationMs: 60 * 60 * 1000 },
  passwordReset: { windowMs: 60 * 60 * 1000, maxAttempts: 3, blockDurationMs: 60 * 60 * 1000 },
};

export interface ISecureAccountStorage {
  // Account operations
  createAccount(input: {
    email: string;
    username: string;
    password?: string;
    displayName?: string;
    googleId?: string;
    isEmailVerified?: boolean;
    avatarUrl?: string;
    marketingOptIn?: boolean;
    analyticsOptIn?: boolean;
  }): Promise<SecureAccount>;
  
  getAccountById(id: string): Promise<SecureAccount | undefined>;
  getAccountByEmail(email: string): Promise<SecureAccount | undefined>;
  getAccountByUsername(username: string): Promise<SecureAccount | undefined>;
  getAccountByGoogleId(googleId: string): Promise<SecureAccount | undefined>;
  
  updateAccount(id: string, updates: Partial<InsertSecureAccount>): Promise<SecureAccount | undefined>;
  updateLastLogin(id: string): Promise<void>;
  updateLastActivity(id: string): Promise<void>;
  
  // Password operations
  verifyPassword(account: SecureAccount, password: string): Promise<boolean>;
  changePassword(accountId: string, newPassword: string): Promise<void>;
  
  // Session operations
  createSession(accountId: string, context: {
    userAgent?: string;
    ipAddress?: string;
    deviceType?: string;
    deviceName?: string;
    isTrusted?: boolean;
  }): Promise<{ session: SecureSession; token: string }>;
  
  getSessionByToken(token: string): Promise<SecureSession | undefined>;
  getSessionWithAccount(token: string): Promise<{ session: SecureSession; account: SecureAccount } | undefined>;
  getAccountSessions(accountId: string): Promise<SecureSession[]>;
  revokeSession(sessionId: string): Promise<void>;
  revokeAllSessions(accountId: string): Promise<void>;
  refreshSession(token: string): Promise<SecureSession | undefined>;
  cleanupExpiredSessions(): Promise<void>;
  
  // Settings operations
  getSettings(accountId: string, category?: string): Promise<UserSettings[]>;
  updateSettings(accountId: string, category: string, settings: Record<string, unknown>): Promise<UserSettings>;
  
  // Chat history operations
  addChatMessage(input: InsertChatHistory): Promise<ChatHistory>;
  getChatHistory(accountId: string, conversationId: string, limit?: number): Promise<ChatHistory[]>;
  getConversations(accountId: string, limit?: number): Promise<{ conversationId: string; lastMessage: Date; type: string }[]>;
  deleteChatHistory(accountId: string, conversationId?: string): Promise<void>;
  
  // Privacy/consent operations
  recordConsent(input: InsertDataConsent): Promise<DataConsent>;
  getConsents(accountId: string): Promise<DataConsent[]>;
  revokeConsent(accountId: string, consentType: string): Promise<void>;
  
  // Audit logging
  logSecurityEvent(event: InsertSecurityAuditLog): Promise<SecurityAuditLog>;
  getAuditLogs(accountId: string, limit?: number): Promise<SecurityAuditLog[]>;
  
  // Account recovery
  createRecoveryToken(accountId: string, tokenType: string, context: {
    ipAddress?: string;
    userAgent?: string;
  }): Promise<string>;
  validateRecoveryToken(tokenHash: string): Promise<AccountRecovery | undefined>;
  useRecoveryToken(tokenHash: string): Promise<void>;
  revokeRecoveryTokens(accountId: string, tokenType: string): Promise<void>;
  
  // Rate limiting
  checkRateLimit(identifier: string, identifierType: string, actionType: string): Promise<{ allowed: boolean; retryAfter?: number }>;
  incrementRateLimit(identifier: string, identifierType: string, actionType: string): Promise<void>;
  
  // Data requests (GDPR)
  createDataRequest(accountId: string, requestType: string, context: {
    ipAddress?: string;
    userAgent?: string;
  }): Promise<DataRequest>;
  getDataRequests(accountId: string): Promise<DataRequest[]>;
  processDataExport(accountId: string): Promise<Record<string, unknown>>;
  anonymizeAccount(accountId: string): Promise<void>;
  
  // Utility
  getPublicProfile(account: SecureAccount): PublicProfile;
}

export class SecureAccountStorageDb implements ISecureAccountStorage {
  private db;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    const isNeonDatabase = databaseUrl?.includes('neon.tech') || databaseUrl?.includes('.neon.') || false;

    if (isNeonDatabase) {
      const pool = new NeonPool({ connectionString: databaseUrl });
      this.db = drizzleNeon(pool);
    } else {
      const { Pool } = pg;
      const pool = new Pool({ connectionString: databaseUrl });
      this.db = drizzleNode(pool);
    }
  }

  // ==================== ACCOUNT OPERATIONS ====================

  async createAccount(input: {
    email: string;
    username: string;
    password?: string;
    displayName?: string;
    googleId?: string;
    isEmailVerified?: boolean;
    avatarUrl?: string;
    marketingOptIn?: boolean;
    analyticsOptIn?: boolean;
  }): Promise<SecureAccount> {
    let passwordHash: string | null = null;
    let passwordSalt: string | null = null;
    let passwordIterations: number | null = null;

    if (input.password) {
      const hashed = await hashPassword(input.password);
      passwordHash = hashed.hash;
      passwordSalt = hashed.salt;
      passwordIterations = hashed.iterations;
    }

    const emailHash = sha256Hash(input.email.toLowerCase());

    const [account] = await this.db
      .insert(secureAccounts)
      .values({
        email: input.email.toLowerCase(),
        emailHash,
        username: input.username,
        passwordHash,
        passwordSalt,
        passwordIterations,
        displayName: input.displayName,
        googleId: input.googleId,
        avatarUrl: input.avatarUrl,
        isEmailVerified: input.isEmailVerified ?? false,
        marketingOptIn: input.marketingOptIn ?? false,
        analyticsOptIn: input.analyticsOptIn ?? true,
      })
      .returning();

    return account;
  }

  async getAccountById(id: string): Promise<SecureAccount | undefined> {
    const [account] = await this.db
      .select()
      .from(secureAccounts)
      .where(and(eq(secureAccounts.id, id), isNull(secureAccounts.deletedAt)))
      .limit(1);
    return account;
  }

  async getAccountByEmail(email: string): Promise<SecureAccount | undefined> {
    const [account] = await this.db
      .select()
      .from(secureAccounts)
      .where(and(
        eq(secureAccounts.email, email.toLowerCase()),
        isNull(secureAccounts.deletedAt)
      ))
      .limit(1);
    return account;
  }

  async getAccountByUsername(username: string): Promise<SecureAccount | undefined> {
    const [account] = await this.db
      .select()
      .from(secureAccounts)
      .where(and(
        eq(secureAccounts.username, username),
        isNull(secureAccounts.deletedAt)
      ))
      .limit(1);
    return account;
  }

  async getAccountByGoogleId(googleId: string): Promise<SecureAccount | undefined> {
    const [account] = await this.db
      .select()
      .from(secureAccounts)
      .where(and(
        eq(secureAccounts.googleId, googleId),
        isNull(secureAccounts.deletedAt)
      ))
      .limit(1);
    return account;
  }

  async updateAccount(id: string, updates: Partial<InsertSecureAccount>): Promise<SecureAccount | undefined> {
    // Build update object with only defined values
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }
    
    const [account] = await this.db
      .update(secureAccounts)
      .set(updateData)
      .where(eq(secureAccounts.id, id))
      .returning();
    return account;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.db
      .update(secureAccounts)
      .set({ 
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockoutUntil: null,
      })
      .where(eq(secureAccounts.id, id));
  }

  async updateLastActivity(id: string): Promise<void> {
    await this.db
      .update(secureAccounts)
      .set({ lastActivityAt: new Date() })
      .where(eq(secureAccounts.id, id));
  }

  // ==================== PASSWORD OPERATIONS ====================

  async verifyPassword(account: SecureAccount, password: string): Promise<boolean> {
    if (!account.passwordHash || !account.passwordSalt) {
      return false;
    }

    return verifyPasswordHash(
      password,
      account.passwordHash,
      account.passwordSalt,
      account.passwordIterations ?? 100000
    );
  }

  async changePassword(accountId: string, newPassword: string): Promise<void> {
    const hashed = await hashPassword(newPassword);
    
    await this.db
      .update(secureAccounts)
      .set({
        passwordHash: hashed.hash,
        passwordSalt: hashed.salt,
        passwordIterations: hashed.iterations,
        lastPasswordChange: new Date(),
        requirePasswordChange: false,
        updatedAt: new Date(),
      })
      .where(eq(secureAccounts.id, accountId));
  }

  // ==================== SESSION OPERATIONS ====================

  async createSession(accountId: string, context: {
    userAgent?: string;
    ipAddress?: string;
    deviceType?: string;
    deviceName?: string;
    isTrusted?: boolean;
  }): Promise<{ session: SecureSession; token: string }> {
    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);
    const absoluteExpiresAt = new Date(now.getTime() + ABSOLUTE_SESSION_MAX_MS);

    // Parse user agent for device info
    let browserName: string | undefined;
    let osName: string | undefined;
    
    if (context.userAgent) {
      // Simple UA parsing (could use a library for more accuracy)
      if (context.userAgent.includes("Chrome")) browserName = "Chrome";
      else if (context.userAgent.includes("Firefox")) browserName = "Firefox";
      else if (context.userAgent.includes("Safari")) browserName = "Safari";
      else if (context.userAgent.includes("Edge")) browserName = "Edge";
      
      if (context.userAgent.includes("Windows")) osName = "Windows";
      else if (context.userAgent.includes("Mac")) osName = "macOS";
      else if (context.userAgent.includes("Linux")) osName = "Linux";
      else if (context.userAgent.includes("Android")) osName = "Android";
      else if (context.userAgent.includes("iOS") || context.userAgent.includes("iPhone")) osName = "iOS";
    }

    const [session] = await this.db
      .insert(secureSessions)
      .values({
        userId: accountId,
        tokenHash,
        deviceType: context.deviceType,
        deviceName: context.deviceName,
        browserName,
        osName,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        isTrusted: context.isTrusted ?? false,
        expiresAt,
        absoluteExpiresAt,
      })
      .returning();

    return { session, token };
  }

  async getSessionByToken(token: string): Promise<SecureSession | undefined> {
    const tokenHash = hashToken(token);
    const now = new Date();

    const [session] = await this.db
      .select()
      .from(secureSessions)
      .where(and(
        eq(secureSessions.tokenHash, tokenHash),
        eq(secureSessions.isActive, true),
        gt(secureSessions.expiresAt, now),
        isNull(secureSessions.revokedAt)
      ))
      .limit(1);

    return session;
  }

  async getSessionWithAccount(token: string): Promise<{ session: SecureSession; account: SecureAccount } | undefined> {
    const session = await this.getSessionByToken(token);
    if (!session) return undefined;

    const account = await this.getAccountById(session.userId);
    if (!account || !account.isActive || account.isSuspended) return undefined;

    return { session, account };
  }

  async getAccountSessions(accountId: string): Promise<SecureSession[]> {
    return this.db
      .select()
      .from(secureSessions)
      .where(and(
        eq(secureSessions.userId, accountId),
        eq(secureSessions.isActive, true),
        isNull(secureSessions.revokedAt)
      ))
      .orderBy(desc(secureSessions.lastActivityAt));
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.db
      .update(secureSessions)
      .set({
        isActive: false,
        revokedAt: new Date(),
      })
      .where(eq(secureSessions.id, sessionId));
  }

  async revokeAllSessions(accountId: string): Promise<void> {
    await this.db
      .update(secureSessions)
      .set({
        isActive: false,
        revokedAt: new Date(),
      })
      .where(and(
        eq(secureSessions.userId, accountId),
        eq(secureSessions.isActive, true)
      ));
  }

  async refreshSession(token: string): Promise<SecureSession | undefined> {
    const session = await this.getSessionByToken(token);
    if (!session) return undefined;

    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + SESSION_DURATION_MS);

    // Don't extend beyond absolute expiration
    const expiresAt = newExpiresAt < session.absoluteExpiresAt ? newExpiresAt : session.absoluteExpiresAt;

    const [updated] = await this.db
      .update(secureSessions)
      .set({
        expiresAt,
        lastActivityAt: now,
      })
      .where(eq(secureSessions.id, session.id))
      .returning();

    return updated;
  }

  async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    await this.db
      .delete(secureSessions)
      .where(lt(secureSessions.expiresAt, now));
  }

  // ==================== SETTINGS OPERATIONS ====================

  async getSettings(accountId: string, category?: string): Promise<UserSettings[]> {
    const conditions = [eq(userSettings.userId, accountId)];
    if (category) {
      conditions.push(eq(userSettings.category, category));
    }

    return this.db
      .select()
      .from(userSettings)
      .where(and(...conditions));
  }

  async updateSettings(accountId: string, category: string, settings: Record<string, unknown>): Promise<UserSettings> {
    // Try to update existing settings
    const existing = await this.db
      .select()
      .from(userSettings)
      .where(and(
        eq(userSettings.userId, accountId),
        eq(userSettings.category, category)
      ))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await this.db
        .update(userSettings)
        .set({
          settings: { ...existing[0].settings as Record<string, unknown>, ...settings },
          updatedAt: new Date(),
        })
        .where(eq(userSettings.id, existing[0].id))
        .returning();
      return updated;
    }

    // Create new settings entry
    const [created] = await this.db
      .insert(userSettings)
      .values({
        userId: accountId,
        category,
        settings,
      })
      .returning();

    return created;
  }

  // ==================== CHAT HISTORY OPERATIONS ====================

  async addChatMessage(input: InsertChatHistory): Promise<ChatHistory> {
    const [message] = await this.db
      .insert(chatHistories)
      .values({
        userId: input.userId,
        conversationId: input.conversationId,
        conversationType: input.conversationType || "general",
        role: input.role,
        content: input.content,
        structuredData: input.structuredData as {
          commandType?: string;
          parameters?: Record<string, unknown>;
          result?: Record<string, unknown>;
          error?: string;
        } | null | undefined,
        tokenCount: input.tokenCount,
        processingTimeMs: input.processingTimeMs,
        isRetained: input.isRetained ?? true,
        expiresAt: input.expiresAt,
      })
      .returning();
    return message;
  }

  async getChatHistory(accountId: string, conversationId: string, limit: number = 100): Promise<ChatHistory[]> {
    return this.db
      .select()
      .from(chatHistories)
      .where(and(
        eq(chatHistories.userId, accountId),
        eq(chatHistories.conversationId, conversationId),
        eq(chatHistories.isRetained, true)
      ))
      .orderBy(desc(chatHistories.createdAt))
      .limit(limit);
  }

  async getConversations(accountId: string, limit: number = 50): Promise<{ conversationId: string; lastMessage: Date; type: string }[]> {
    const results = await this.db
      .select({
        conversationId: chatHistories.conversationId,
        type: chatHistories.conversationType,
        lastMessage: sql<Date>`MAX(${chatHistories.createdAt})`.as('last_message'),
      })
      .from(chatHistories)
      .where(and(
        eq(chatHistories.userId, accountId),
        eq(chatHistories.isRetained, true)
      ))
      .groupBy(chatHistories.conversationId, chatHistories.conversationType)
      .orderBy(desc(sql`MAX(${chatHistories.createdAt})`))
      .limit(limit);

    return results;
  }

  async deleteChatHistory(accountId: string, conversationId?: string): Promise<void> {
    const conditions = [eq(chatHistories.userId, accountId)];
    if (conversationId) {
      conditions.push(eq(chatHistories.conversationId, conversationId));
    }

    await this.db
      .delete(chatHistories)
      .where(and(...conditions));
  }

  // ==================== PRIVACY/CONSENT OPERATIONS ====================

  async recordConsent(input: InsertDataConsent): Promise<DataConsent> {
    // Check for existing consent
    const existing = await this.db
      .select()
      .from(dataConsents)
      .where(and(
        eq(dataConsents.userId, input.userId),
        eq(dataConsents.consentType, input.consentType)
      ))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await this.db
        .update(dataConsents)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(dataConsents.id, existing[0].id))
        .returning();
      return updated;
    }

    const [created] = await this.db
      .insert(dataConsents)
      .values(input)
      .returning();
    return created;
  }

  async getConsents(accountId: string): Promise<DataConsent[]> {
    return this.db
      .select()
      .from(dataConsents)
      .where(eq(dataConsents.userId, accountId));
  }

  async revokeConsent(accountId: string, consentType: string): Promise<void> {
    await this.db
      .update(dataConsents)
      .set({
        isGranted: false,
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(dataConsents.userId, accountId),
        eq(dataConsents.consentType, consentType)
      ));
  }

  // ==================== AUDIT LOGGING ====================

  async logSecurityEvent(event: InsertSecurityAuditLog): Promise<SecurityAuditLog> {
    const [log] = await this.db
      .insert(securityAuditLogs)
      .values(event)
      .returning();
    return log;
  }

  async getAuditLogs(accountId: string, limit: number = 100): Promise<SecurityAuditLog[]> {
    return this.db
      .select()
      .from(securityAuditLogs)
      .where(eq(securityAuditLogs.userId, accountId))
      .orderBy(desc(securityAuditLogs.createdAt))
      .limit(limit);
  }

  // ==================== ACCOUNT RECOVERY ====================

  async createRecoveryToken(accountId: string, tokenType: string, context: {
    ipAddress?: string;
    userAgent?: string;
  }): Promise<string> {
    // Revoke existing tokens of same type
    await this.revokeRecoveryTokens(accountId, tokenType);

    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + RECOVERY_TOKEN_DURATION_MS);

    await this.db
      .insert(accountRecovery)
      .values({
        userId: accountId,
        tokenHash,
        tokenType,
        expiresAt,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

    return token;
  }

  async validateRecoveryToken(token: string): Promise<AccountRecovery | undefined> {
    const tokenHash = hashToken(token);
    const now = new Date();

    const [recovery] = await this.db
      .select()
      .from(accountRecovery)
      .where(and(
        eq(accountRecovery.tokenHash, tokenHash),
        gt(accountRecovery.expiresAt, now),
        eq(accountRecovery.isRevoked, false),
        isNull(accountRecovery.usedAt)
      ))
      .limit(1);

    return recovery;
  }

  async useRecoveryToken(token: string): Promise<void> {
    const tokenHash = hashToken(token);
    await this.db
      .update(accountRecovery)
      .set({ usedAt: new Date() })
      .where(eq(accountRecovery.tokenHash, tokenHash));
  }

  async revokeRecoveryTokens(accountId: string, tokenType: string): Promise<void> {
    await this.db
      .update(accountRecovery)
      .set({ isRevoked: true })
      .where(and(
        eq(accountRecovery.userId, accountId),
        eq(accountRecovery.tokenType, tokenType),
        isNull(accountRecovery.usedAt)
      ));
  }

  // ==================== RATE LIMITING ====================

  async checkRateLimit(identifier: string, identifierType: string, actionType: string): Promise<{ allowed: boolean; retryAfter?: number }> {
    const config = RATE_LIMIT_WINDOWS[actionType as keyof typeof RATE_LIMIT_WINDOWS] || {
      windowMs: 60 * 1000,
      maxAttempts: 60,
      blockDurationMs: 60 * 1000,
    };

    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowMs);

    // Check if blocked
    const [blocked] = await this.db
      .select()
      .from(rateLimits)
      .where(and(
        eq(rateLimits.identifier, identifier),
        eq(rateLimits.identifierType, identifierType),
        eq(rateLimits.actionType, actionType),
        eq(rateLimits.isBlocked, true),
        gt(rateLimits.blockedUntil, now)
      ))
      .limit(1);

    if (blocked && blocked.blockedUntil) {
      return {
        allowed: false,
        retryAfter: Math.ceil((blocked.blockedUntil.getTime() - now.getTime()) / 1000),
      };
    }

    // Count recent requests
    const records = await this.db
      .select()
      .from(rateLimits)
      .where(and(
        eq(rateLimits.identifier, identifier),
        eq(rateLimits.identifierType, identifierType),
        eq(rateLimits.actionType, actionType),
        gt(rateLimits.windowStart, windowStart)
      ));

    const totalRequests = records.reduce((sum, r) => sum + r.requestCount, 0);

    if (totalRequests >= config.maxAttempts) {
      // Block the identifier
      await this.db
        .insert(rateLimits)
        .values({
          identifier,
          identifierType,
          actionType,
          windowStart: now,
          requestCount: 0,
          isBlocked: true,
          blockedUntil: new Date(now.getTime() + config.blockDurationMs),
          blockReason: `Exceeded ${config.maxAttempts} ${actionType} attempts`,
        });

      return {
        allowed: false,
        retryAfter: Math.ceil(config.blockDurationMs / 1000),
      };
    }

    return { allowed: true };
  }

  async incrementRateLimit(identifier: string, identifierType: string, actionType: string): Promise<void> {
    const now = new Date();
    const config = RATE_LIMIT_WINDOWS[actionType as keyof typeof RATE_LIMIT_WINDOWS] || {
      windowMs: 60 * 1000,
      maxAttempts: 60,
      blockDurationMs: 60 * 1000,
    };
    const windowStart = new Date(Math.floor(now.getTime() / config.windowMs) * config.windowMs);

    // Try to update existing record
    const [existing] = await this.db
      .select()
      .from(rateLimits)
      .where(and(
        eq(rateLimits.identifier, identifier),
        eq(rateLimits.identifierType, identifierType),
        eq(rateLimits.actionType, actionType),
        eq(rateLimits.windowStart, windowStart)
      ))
      .limit(1);

    if (existing) {
      await this.db
        .update(rateLimits)
        .set({
          requestCount: existing.requestCount + 1,
          updatedAt: now,
        })
        .where(eq(rateLimits.id, existing.id));
    } else {
      await this.db
        .insert(rateLimits)
        .values({
          identifier,
          identifierType,
          actionType,
          windowStart,
          requestCount: 1,
        });
    }
  }

  // ==================== DATA REQUESTS (GDPR) ====================

  async createDataRequest(accountId: string, requestType: string, context: {
    ipAddress?: string;
    userAgent?: string;
  }): Promise<DataRequest> {
    const [request] = await this.db
      .insert(dataRequests)
      .values({
        userId: accountId,
        requestType,
        status: "pending",
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
      .returning();

    return request;
  }

  async getDataRequests(accountId: string): Promise<DataRequest[]> {
    return this.db
      .select()
      .from(dataRequests)
      .where(eq(dataRequests.userId, accountId))
      .orderBy(desc(dataRequests.createdAt));
  }

  async processDataExport(accountId: string): Promise<Record<string, unknown>> {
    const account = await this.getAccountById(accountId);
    if (!account) throw new Error("Account not found");

    const settings = await this.getSettings(accountId);
    const chats = await this.db
      .select()
      .from(chatHistories)
      .where(eq(chatHistories.userId, accountId))
      .orderBy(desc(chatHistories.createdAt));
    const consents = await this.getConsents(accountId);
    const auditLogs = await this.getAuditLogs(accountId, 1000);

    return {
      exportDate: new Date().toISOString(),
      account: {
        id: account.id,
        email: account.email,
        username: account.username,
        displayName: account.displayName,
        createdAt: account.createdAt,
        lastLoginAt: account.lastLoginAt,
        privacyLevel: account.privacyLevel,
        marketingOptIn: account.marketingOptIn,
        analyticsOptIn: account.analyticsOptIn,
      },
      settings,
      chatHistory: chats,
      consents,
      activityLog: auditLogs.map(log => ({
        eventType: log.eventType,
        timestamp: log.createdAt,
        ipAddress: log.ipAddress,
      })),
    };
  }

  async anonymizeAccount(accountId: string): Promise<void> {
    const anonymized = anonymizeUserData(accountId);
    const now = new Date();

    // Anonymize account data
    await this.db
      .update(secureAccounts)
      .set({
        email: anonymized.anonymizedEmail,
        emailHash: sha256Hash(anonymized.anonymizedEmail),
        username: anonymized.anonymizedUsername,
        displayName: anonymized.anonymizedDisplayName,
        passwordHash: null,
        passwordSalt: null,
        avatarUrl: null,
        googleId: null,
        oauthProviders: {},
        twoFactorSecret: null,
        backupCodesHash: null,
        metadata: {},
        isActive: false,
        deletedAt: now,
        anonymizedAt: now,
        updatedAt: now,
      })
      .where(eq(secureAccounts.id, accountId));

    // Delete related data
    await this.deleteChatHistory(accountId);
    await this.db.delete(userSettings).where(eq(userSettings.userId, accountId));
    await this.revokeAllSessions(accountId);
  }

  // ==================== UTILITY ====================

  getPublicProfile(account: SecureAccount): PublicProfile {
    return {
      id: account.id,
      username: account.username,
      displayName: account.displayName,
      avatarUrl: account.avatarUrl,
      createdAt: account.createdAt,
    };
  }
}

// In-memory implementation for development/testing without database
export class SecureAccountStorageMem implements ISecureAccountStorage {
  private accounts: Map<string, SecureAccount> = new Map();
  private settings: Map<string, UserSettings[]> = new Map();
  private chats: Map<string, ChatHistory[]> = new Map();
  private consents: Map<string, DataConsent[]> = new Map();
  private auditLogs: Map<string, SecurityAuditLog[]> = new Map();
  private recoveryTokens: Map<string, AccountRecovery> = new Map();
  private sessions: Map<string, SecureSession> = new Map();
  private rateLimitData: Map<string, RateLimit[]> = new Map();
  private dataRequestsMap: Map<string, DataRequest[]> = new Map();

  async createAccount(input: {
    email: string;
    username: string;
    password?: string;
    displayName?: string;
    googleId?: string;
    isEmailVerified?: boolean;
    avatarUrl?: string;
    marketingOptIn?: boolean;
    analyticsOptIn?: boolean;
  }): Promise<SecureAccount> {
    const id = randomUUID();
    const now = new Date();

    let passwordHash: string | null = null;
    let passwordSalt: string | null = null;
    let passwordIterations: number | null = null;

    if (input.password) {
      const hashed = await hashPassword(input.password);
      passwordHash = hashed.hash;
      passwordSalt = hashed.salt;
      passwordIterations = hashed.iterations;
    }

    const account: SecureAccount = {
      id,
      email: input.email.toLowerCase(),
      emailHash: sha256Hash(input.email.toLowerCase()),
      username: input.username,
      passwordHash,
      passwordSalt,
      passwordIterations,
      displayName: input.displayName ?? null,
      avatarUrl: input.avatarUrl ?? null,
      googleId: input.googleId ?? null,
      oauthProviders: {},
      isActive: true,
      isEmailVerified: input.isEmailVerified ?? false,
      isSuspended: false,
      suspensionReason: null,
      privacyLevel: "standard",
      dataRetentionDays: 365,
      marketingOptIn: input.marketingOptIn ?? false,
      analyticsOptIn: input.analyticsOptIn ?? true,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      requirePasswordChange: false,
      lastPasswordChange: null,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      backupCodesHash: null,
      metadata: {},
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
      lastActivityAt: null,
      deletedAt: null,
      anonymizedAt: null,
    };

    this.accounts.set(id, account);
    return account;
  }

  async getAccountById(id: string): Promise<SecureAccount | undefined> {
    const account = this.accounts.get(id);
    if (account && !account.deletedAt) return account;
    return undefined;
  }

  async getAccountByEmail(email: string): Promise<SecureAccount | undefined> {
    return Array.from(this.accounts.values()).find(
      a => a.email.toLowerCase() === email.toLowerCase() && !a.deletedAt
    );
  }

  async getAccountByUsername(username: string): Promise<SecureAccount | undefined> {
    return Array.from(this.accounts.values()).find(
      a => a.username.toLowerCase() === username.toLowerCase() && !a.deletedAt
    );
  }

  async getAccountByGoogleId(googleId: string): Promise<SecureAccount | undefined> {
    return Array.from(this.accounts.values()).find(
      a => a.googleId === googleId && !a.deletedAt
    );
  }

  async updateAccount(id: string, updates: Partial<InsertSecureAccount>): Promise<SecureAccount | undefined> {
    const account = this.accounts.get(id);
    if (!account) return undefined;

    // Apply updates to account
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        (account as any)[key] = value;
      }
    }
    account.updatedAt = new Date();
    
    this.accounts.set(id, account);
    return account;
  }

  async updateLastLogin(id: string): Promise<void> {
    const account = this.accounts.get(id);
    if (account) {
      account.lastLoginAt = new Date();
      account.failedLoginAttempts = 0;
      account.lockoutUntil = null;
    }
  }

  async updateLastActivity(id: string): Promise<void> {
    const account = this.accounts.get(id);
    if (account) {
      account.lastActivityAt = new Date();
    }
  }

  async verifyPassword(account: SecureAccount, password: string): Promise<boolean> {
    if (!account.passwordHash || !account.passwordSalt) return false;
    return verifyPasswordHash(
      password,
      account.passwordHash,
      account.passwordSalt,
      account.passwordIterations ?? 100000
    );
  }

  async changePassword(accountId: string, newPassword: string): Promise<void> {
    const hashed = await hashPassword(newPassword);
    const account = this.accounts.get(accountId);
    if (account) {
      account.passwordHash = hashed.hash;
      account.passwordSalt = hashed.salt;
      account.passwordIterations = hashed.iterations;
      account.lastPasswordChange = new Date();
      account.requirePasswordChange = false;
      account.updatedAt = new Date();
    }
  }

  async createSession(accountId: string, context: {
    userAgent?: string;
    ipAddress?: string;
    deviceType?: string;
    deviceName?: string;
    isTrusted?: boolean;
  }): Promise<{ session: SecureSession; token: string }> {
    const id = randomUUID();
    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    const now = new Date();

    const session: SecureSession = {
      id,
      userId: accountId,
      tokenHash,
      deviceType: context.deviceType ?? null,
      deviceName: context.deviceName ?? null,
      browserName: null,
      osName: null,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      countryCode: null,
      regionCode: null,
      isActive: true,
      isTrusted: context.isTrusted ?? false,
      lastActivityAt: now,
      expiresAt: new Date(now.getTime() + SESSION_DURATION_MS),
      absoluteExpiresAt: new Date(now.getTime() + ABSOLUTE_SESSION_MAX_MS),
      createdAt: now,
      revokedAt: null,
    };

    this.sessions.set(tokenHash, session);
    return { session, token };
  }

  async getSessionByToken(token: string): Promise<SecureSession | undefined> {
    const tokenHash = hashToken(token);
    const session = this.sessions.get(tokenHash);
    if (!session) return undefined;
    if (!session.isActive || session.revokedAt) return undefined;
    if (new Date() > session.expiresAt) return undefined;
    return session;
  }

  async getSessionWithAccount(token: string): Promise<{ session: SecureSession; account: SecureAccount } | undefined> {
    const session = await this.getSessionByToken(token);
    if (!session) return undefined;

    const account = await this.getAccountById(session.userId);
    if (!account || !account.isActive || account.isSuspended) return undefined;

    return { session, account };
  }

  async getAccountSessions(accountId: string): Promise<SecureSession[]> {
    return Array.from(this.sessions.values()).filter(
      s => s.userId === accountId && s.isActive && !s.revokedAt
    );
  }

  async revokeSession(sessionId: string): Promise<void> {
    const entries = Array.from(this.sessions.entries());
    for (const [hash, session] of entries) {
      if (session.id === sessionId) {
        session.isActive = false;
        session.revokedAt = new Date();
        break;
      }
    }
  }

  async revokeAllSessions(accountId: string): Promise<void> {
    const sessions = Array.from(this.sessions.values());
    for (const session of sessions) {
      if (session.userId === accountId && session.isActive) {
        session.isActive = false;
        session.revokedAt = new Date();
      }
    }
  }

  async refreshSession(token: string): Promise<SecureSession | undefined> {
    const session = await this.getSessionByToken(token);
    if (!session) return undefined;

    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + SESSION_DURATION_MS);
    session.expiresAt = newExpiresAt < session.absoluteExpiresAt ? newExpiresAt : session.absoluteExpiresAt;
    session.lastActivityAt = now;

    return session;
  }

  async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    const entries = Array.from(this.sessions.entries());
    for (const [hash, session] of entries) {
      if (now > session.expiresAt) {
        this.sessions.delete(hash);
      }
    }
  }

  async getSettings(accountId: string, category?: string): Promise<UserSettings[]> {
    const allSettings = this.settings.get(accountId) || [];
    if (category) {
      return allSettings.filter(s => s.category === category);
    }
    return allSettings;
  }

  async updateSettings(accountId: string, category: string, settings: Record<string, unknown>): Promise<UserSettings> {
    const accountSettings = this.settings.get(accountId) || [];
    const existing = accountSettings.find(s => s.category === category);

    if (existing) {
      existing.settings = { ...(existing.settings as Record<string, unknown>), ...settings };
      existing.updatedAt = new Date();
      return existing;
    }

    const newSettings: UserSettings = {
      id: randomUUID(),
      userId: accountId,
      category,
      settings,
      schemaVersion: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    accountSettings.push(newSettings);
    this.settings.set(accountId, accountSettings);
    return newSettings;
  }

  async addChatMessage(input: InsertChatHistory): Promise<ChatHistory> {
    const message: ChatHistory = {
      id: randomUUID(),
      userId: input.userId,
      conversationId: input.conversationId,
      conversationType: input.conversationType || "general",
      role: input.role,
      content: input.content,
      structuredData: (input.structuredData as { commandType?: string; parameters?: Record<string, unknown>; result?: Record<string, unknown>; error?: string }) ?? null,
      tokenCount: input.tokenCount ?? null,
      processingTimeMs: input.processingTimeMs ?? null,
      isRetained: input.isRetained ?? true,
      expiresAt: input.expiresAt ?? null,
      createdAt: new Date(),
    };

    const chats = this.chats.get(input.userId) || [];
    chats.push(message);
    this.chats.set(input.userId, chats);

    return message;
  }

  async getChatHistory(accountId: string, conversationId: string, limit: number = 100): Promise<ChatHistory[]> {
    const chats = this.chats.get(accountId) || [];
    return chats
      .filter(c => c.conversationId === conversationId && c.isRetained)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getConversations(accountId: string, limit: number = 50): Promise<{ conversationId: string; lastMessage: Date; type: string }[]> {
    const chats = this.chats.get(accountId) || [];
    const convMap = new Map<string, { lastMessage: Date; type: string }>();

    for (const chat of chats) {
      if (!chat.isRetained) continue;
      const existing = convMap.get(chat.conversationId);
      if (!existing || chat.createdAt > existing.lastMessage) {
        convMap.set(chat.conversationId, {
          lastMessage: chat.createdAt,
          type: chat.conversationType,
        });
      }
    }

    return Array.from(convMap.entries())
      .map(([conversationId, data]) => ({ conversationId, ...data }))
      .sort((a, b) => b.lastMessage.getTime() - a.lastMessage.getTime())
      .slice(0, limit);
  }

  async deleteChatHistory(accountId: string, conversationId?: string): Promise<void> {
    if (conversationId) {
      const chats = this.chats.get(accountId) || [];
      this.chats.set(accountId, chats.filter(c => c.conversationId !== conversationId));
    } else {
      this.chats.delete(accountId);
    }
  }

  async recordConsent(input: InsertDataConsent): Promise<DataConsent> {
    const consents = this.consents.get(input.userId) || [];
    const existing = consents.find(c => c.consentType === input.consentType);

    if (existing) {
      existing.version = input.version;
      existing.isGranted = input.isGranted;
      existing.grantedAt = input.grantedAt ?? null;
      existing.revokedAt = input.revokedAt ?? null;
      existing.ipAddress = input.ipAddress ?? null;
      existing.userAgent = input.userAgent ?? null;
      existing.legalBasis = input.legalBasis ?? null;
      existing.updatedAt = new Date();
      return existing;
    }

    const consent: DataConsent = {
      id: randomUUID(),
      userId: input.userId,
      consentType: input.consentType,
      version: input.version,
      isGranted: input.isGranted,
      grantedAt: input.grantedAt ?? null,
      revokedAt: input.revokedAt ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      legalBasis: input.legalBasis ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    consents.push(consent);
    this.consents.set(input.userId, consents);
    return consent;
  }

  async getConsents(accountId: string): Promise<DataConsent[]> {
    return this.consents.get(accountId) || [];
  }

  async revokeConsent(accountId: string, consentType: string): Promise<void> {
    const consents = this.consents.get(accountId) || [];
    const consent = consents.find(c => c.consentType === consentType);
    if (consent) {
      consent.isGranted = false;
      consent.revokedAt = new Date();
      consent.updatedAt = new Date();
    }
  }

  async logSecurityEvent(event: InsertSecurityAuditLog): Promise<SecurityAuditLog> {
    const log: SecurityAuditLog = {
      id: randomUUID(),
      userId: event.userId ?? null,
      actorType: event.actorType,
      eventType: event.eventType,
      eventCategory: event.eventCategory,
      eventData: event.eventData ?? null,
      ipAddress: event.ipAddress ?? null,
      userAgent: event.userAgent ?? null,
      requestId: event.requestId ?? null,
      sessionId: event.sessionId ?? null,
      success: event.success,
      errorCode: event.errorCode ?? null,
      errorMessage: event.errorMessage ?? null,
      riskLevel: event.riskLevel ?? "low",
      requiresReview: event.requiresReview ?? false,
      reviewedAt: event.reviewedAt ?? null,
      reviewedBy: event.reviewedBy ?? null,
      createdAt: new Date(),
    };

    const logs = this.auditLogs.get(event.userId || 'system') || [];
    logs.push(log);
    this.auditLogs.set(event.userId || 'system', logs);

    return log;
  }

  async getAuditLogs(accountId: string, limit: number = 100): Promise<SecurityAuditLog[]> {
    const logs = this.auditLogs.get(accountId) || [];
    return logs
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async createRecoveryToken(accountId: string, tokenType: string, context: {
    ipAddress?: string;
    userAgent?: string;
  }): Promise<string> {
    await this.revokeRecoveryTokens(accountId, tokenType);

    const token = generateSecureToken();
    const tokenHash = hashToken(token);

    const recovery: AccountRecovery = {
      id: randomUUID(),
      userId: accountId,
      tokenHash,
      tokenType,
      expiresAt: new Date(Date.now() + RECOVERY_TOKEN_DURATION_MS),
      usedAt: null,
      isRevoked: false,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      createdAt: new Date(),
    };

    this.recoveryTokens.set(tokenHash, recovery);
    return token;
  }

  async validateRecoveryToken(token: string): Promise<AccountRecovery | undefined> {
    const tokenHash = hashToken(token);
    const recovery = this.recoveryTokens.get(tokenHash);
    if (!recovery) return undefined;
    if (recovery.isRevoked || recovery.usedAt) return undefined;
    if (new Date() > recovery.expiresAt) return undefined;
    return recovery;
  }

  async useRecoveryToken(token: string): Promise<void> {
    const tokenHash = hashToken(token);
    const recovery = this.recoveryTokens.get(tokenHash);
    if (recovery) {
      recovery.usedAt = new Date();
    }
  }

  async revokeRecoveryTokens(accountId: string, tokenType: string): Promise<void> {
    const tokens = Array.from(this.recoveryTokens.values());
    for (const recovery of tokens) {
      if (recovery.userId === accountId && recovery.tokenType === tokenType && !recovery.usedAt) {
        recovery.isRevoked = true;
      }
    }
  }

  async checkRateLimit(identifier: string, identifierType: string, actionType: string): Promise<{ allowed: boolean; retryAfter?: number }> {
    // Simplified rate limiting for in-memory storage
    return { allowed: true };
  }

  async incrementRateLimit(identifier: string, identifierType: string, actionType: string): Promise<void> {
    // No-op for in-memory storage
  }

  async createDataRequest(accountId: string, requestType: string, context: {
    ipAddress?: string;
    userAgent?: string;
  }): Promise<DataRequest> {
    const request: DataRequest = {
      id: randomUUID(),
      userId: accountId,
      requestType,
      status: "pending",
      requestedAt: new Date(),
      processedAt: null,
      completedAt: null,
      exportFileUrl: null,
      exportExpiresAt: null,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      processedBy: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const requests = this.dataRequestsMap.get(accountId) || [];
    requests.push(request);
    this.dataRequestsMap.set(accountId, requests);

    return request;
  }

  async getDataRequests(accountId: string): Promise<DataRequest[]> {
    return this.dataRequestsMap.get(accountId) || [];
  }

  async processDataExport(accountId: string): Promise<Record<string, unknown>> {
    const account = await this.getAccountById(accountId);
    if (!account) throw new Error("Account not found");

    return {
      exportDate: new Date().toISOString(),
      account: {
        id: account.id,
        email: account.email,
        username: account.username,
        displayName: account.displayName,
        createdAt: account.createdAt,
      },
      settings: this.settings.get(accountId) || [],
      chatHistory: this.chats.get(accountId) || [],
      consents: this.consents.get(accountId) || [],
    };
  }

  async anonymizeAccount(accountId: string): Promise<void> {
    const anonymized = anonymizeUserData(accountId);
    const account = this.accounts.get(accountId);
    if (account) {
      account.email = anonymized.anonymizedEmail;
      account.emailHash = sha256Hash(anonymized.anonymizedEmail);
      account.username = anonymized.anonymizedUsername;
      account.displayName = anonymized.anonymizedDisplayName;
      account.passwordHash = null;
      account.passwordSalt = null;
      account.avatarUrl = null;
      account.googleId = null;
      account.isActive = false;
      account.deletedAt = new Date();
      account.anonymizedAt = new Date();
    }

    this.chats.delete(accountId);
    this.settings.delete(accountId);
    await this.revokeAllSessions(accountId);
  }

  getPublicProfile(account: SecureAccount): PublicProfile {
    return {
      id: account.id,
      username: account.username,
      displayName: account.displayName,
      avatarUrl: account.avatarUrl,
      createdAt: account.createdAt,
    };
  }
}

// Singleton instance
export let secureAccountStorage: ISecureAccountStorage;

export function initializeSecureAccountStorage(): ISecureAccountStorage {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.log("[SecureAccount] No DATABASE_URL found, using in-memory storage");
    secureAccountStorage = new SecureAccountStorageMem();
  } else {
    console.log("[SecureAccount] Using database storage");
    secureAccountStorage = new SecureAccountStorageDb();
  }

  // Schedule cleanup tasks
  setInterval(() => {
    secureAccountStorage.cleanupExpiredSessions().catch(err => {
      console.error("[SecureAccount] Failed to cleanup expired sessions:", err);
    });
  }, 60 * 60 * 1000); // Every hour

  return secureAccountStorage;
}
