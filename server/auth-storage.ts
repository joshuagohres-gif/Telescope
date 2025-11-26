/**
 * Auth Storage - Handles user and session management in the database
 */

import {
  type User,
  type InsertUser,
  type Session,
  type InsertSession,
  type PublicUser,
  users,
  sessions,
} from "@shared/schema";
import { randomUUID, createHash, randomBytes } from "crypto";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzleNode } from "drizzle-orm/node-postgres";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import pg from "pg";
import { eq, and, gt } from "drizzle-orm";
import ws from "ws";

neonConfig.webSocketConstructor = ws as any;

export interface IAuthStorage {
  // User operations
  createUser(user: Omit<InsertUser, 'passwordHash'> & { password?: string }): Promise<User>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  updateLastLogin(id: string): Promise<void>;
  
  // Session operations
  createSession(userId: string, userAgent?: string, ipAddress?: string): Promise<Session>;
  getSessionByToken(token: string): Promise<Session | undefined>;
  getSessionWithUser(token: string): Promise<{ session: Session; user: User } | undefined>;
  deleteSession(token: string): Promise<void>;
  deleteUserSessions(userId: string): Promise<void>;
  cleanupExpiredSessions(): Promise<void>;
  
  // Utility
  verifyPassword(user: User, password: string): Promise<boolean>;
  getPublicUser(user: User): PublicUser;
}

// Hash password with salt
function hashPassword(password: string, salt: string): string {
  return createHash('sha256')
    .update(password + salt)
    .digest('hex');
}

// Generate a secure random token
function generateToken(): string {
  return randomBytes(64).toString('hex');
}

// Generate salt for password hashing
function generateSalt(): string {
  return randomBytes(16).toString('hex');
}

// Session duration: 30 days
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export class MemAuthStorage implements IAuthStorage {
  private users: Map<string, User> = new Map();
  private sessions: Map<string, Session> = new Map();
  private passwordSalts: Map<string, string> = new Map();

  async createUser(input: Omit<InsertUser, 'passwordHash'> & { password?: string }): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    
    let passwordHash: string | null = null;
    if (input.password) {
      const salt = generateSalt();
      passwordHash = `${salt}:${hashPassword(input.password, salt)}`;
    }

    const user: User = {
      id,
      email: input.email,
      username: input.username,
      passwordHash,
      displayName: input.displayName ?? null,
      avatarUrl: input.avatarUrl ?? null,
      googleId: input.googleId ?? null,
      isActive: input.isActive ?? true,
      isEmailVerified: input.isEmailVerified ?? false,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    };

    this.users.set(id, user);
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.googleId === googleId);
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updated: User = {
      ...user,
      ...updates,
      updatedAt: new Date(),
    };
    this.users.set(id, updated);
    return updated;
  }

  async updateLastLogin(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.lastLoginAt = new Date();
      this.users.set(id, user);
    }
  }

  async createSession(userId: string, userAgent?: string, ipAddress?: string): Promise<Session> {
    const id = randomUUID();
    const token = generateToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);

    const session: Session = {
      id,
      userId,
      token,
      expiresAt,
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
      createdAt: now,
    };

    this.sessions.set(token, session);
    return session;
  }

  async getSessionByToken(token: string): Promise<Session | undefined> {
    const session = this.sessions.get(token);
    if (!session) return undefined;
    
    // Check expiration
    if (new Date() > session.expiresAt) {
      this.sessions.delete(token);
      return undefined;
    }
    
    return session;
  }

  async getSessionWithUser(token: string): Promise<{ session: Session; user: User } | undefined> {
    const session = await this.getSessionByToken(token);
    if (!session) return undefined;
    
    const user = await this.getUserById(session.userId);
    if (!user || !user.isActive) return undefined;
    
    return { session, user };
  }

  async deleteSession(token: string): Promise<void> {
    this.sessions.delete(token);
  }

  async deleteUserSessions(userId: string): Promise<void> {
    for (const [token, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(token);
      }
    }
  }

  async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    for (const [token, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(token);
      }
    }
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    if (!user.passwordHash) return false;
    
    const [salt, hash] = user.passwordHash.split(':');
    return hashPassword(password, salt) === hash;
  }

  getPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
  }
}

export class DbAuthStorage implements IAuthStorage {
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

  async createUser(input: Omit<InsertUser, 'passwordHash'> & { password?: string }): Promise<User> {
    let passwordHash: string | null = null;
    if (input.password) {
      const salt = generateSalt();
      passwordHash = `${salt}:${hashPassword(input.password, salt)}`;
    }

    const [user] = await this.db
      .insert(users)
      .values({
        email: input.email,
        username: input.username,
        passwordHash,
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
        googleId: input.googleId,
        isActive: input.isActive ?? true,
        isEmailVerified: input.isEmailVerified ?? false,
      })
      .returning();
    
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.googleId, googleId))
      .limit(1);
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await this.db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, id));
  }

  async createSession(userId: string, userAgent?: string, ipAddress?: string): Promise<Session> {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    const [session] = await this.db
      .insert(sessions)
      .values({
        userId,
        token,
        expiresAt,
        userAgent,
        ipAddress,
      })
      .returning();
    
    return session;
  }

  async getSessionByToken(token: string): Promise<Session | undefined> {
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(and(
        eq(sessions.token, token),
        gt(sessions.expiresAt, new Date())
      ))
      .limit(1);
    return session;
  }

  async getSessionWithUser(token: string): Promise<{ session: Session; user: User } | undefined> {
    const session = await this.getSessionByToken(token);
    if (!session) return undefined;
    
    const user = await this.getUserById(session.userId);
    if (!user || !user.isActive) return undefined;
    
    return { session, user };
  }

  async deleteSession(token: string): Promise<void> {
    await this.db
      .delete(sessions)
      .where(eq(sessions.token, token));
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await this.db
      .delete(sessions)
      .where(eq(sessions.userId, userId));
  }

  async cleanupExpiredSessions(): Promise<void> {
    await this.db
      .delete(sessions)
      .where(gt(new Date(), sessions.expiresAt));
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    if (!user.passwordHash) return false;
    
    const [salt, hash] = user.passwordHash.split(':');
    return hashPassword(password, salt) === hash;
  }

  getPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
  }
}

// Export singleton instance
export let authStorage: IAuthStorage;

export function initializeAuthStorage() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.log("[Auth] No DATABASE_URL found, using in-memory auth storage");
    authStorage = new MemAuthStorage();
  } else {
    console.log("[Auth] Using database auth storage");
    authStorage = new DbAuthStorage();
  }
  
  // Schedule cleanup of expired sessions every hour
  setInterval(() => {
    authStorage.cleanupExpiredSessions().catch(err => {
      console.error("[Auth] Failed to cleanup expired sessions:", err);
    });
  }, 60 * 60 * 1000);
  
  return authStorage;
}
