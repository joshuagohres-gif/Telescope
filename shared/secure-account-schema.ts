/**
 * Secure Account Schema
 * 
 * Provides a scalable, privacy-focused database schema for user accounts.
 * Features:
 * - Encrypted sensitive data fields
 * - JSONB for extensible metadata (settings, preferences, chat history)
 * - GDPR-compliant consent management
 * - Comprehensive audit logging
 * - Two-factor authentication support
 * - Rate limiting and security tracking
 */

import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ============== SECURE ACCOUNTS ==============

/**
 * Core user accounts table with enhanced security
 * - Encrypted PII fields
 * - Extensible metadata via JSONB
 * - Soft delete support for data retention policies
 */
export const secureAccounts = pgTable("secure_accounts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  
  // Core identity
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailHash: varchar("email_hash", { length: 64 }), // SHA-256 for quick lookup without revealing email
  username: varchar("username", { length: 100 }).notNull().unique(),
  
  // Authentication
  passwordHash: text("password_hash"), // null for OAuth-only users
  passwordSalt: varchar("password_salt", { length: 64 }), // Separate salt for enhanced security
  passwordIterations: integer("password_iterations").default(100000), // PBKDF2 iterations (upgradable)
  
  // Profile (minimal PII in main table)
  displayName: varchar("display_name", { length: 200 }),
  avatarUrl: text("avatar_url"),
  
  // OAuth providers (expandable via JSONB)
  googleId: varchar("google_id", { length: 255 }).unique(),
  oauthProviders: jsonb("oauth_providers").$type<Record<string, {
    providerId: string;
    linkedAt: string;
    email?: string;
    profileUrl?: string;
  }>>().default({}),
  
  // Account status
  isActive: boolean("is_active").notNull().default(true),
  isEmailVerified: boolean("is_email_verified").notNull().default(false),
  isSuspended: boolean("is_suspended").notNull().default(false),
  suspensionReason: text("suspension_reason"),
  
  // Privacy settings (quick access flags)
  privacyLevel: varchar("privacy_level", { length: 20 }).notNull().default("standard"), // minimal, standard, enhanced
  dataRetentionDays: integer("data_retention_days").default(365), // User-controlled retention
  marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
  analyticsOptIn: boolean("analytics_opt_in").notNull().default(true),
  
  // Security metadata
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockoutUntil: timestamp("lockout_until"),
  requirePasswordChange: boolean("require_password_change").notNull().default(false),
  lastPasswordChange: timestamp("last_password_change"),
  
  // Two-factor authentication
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorSecret: text("two_factor_secret"), // Encrypted TOTP secret
  backupCodesHash: text("backup_codes_hash"), // Hashed backup codes
  
  // Extensible metadata (settings, preferences, etc.)
  metadata: jsonb("metadata").$type<{
    timezone?: string;
    locale?: string;
    theme?: string;
    notifications?: Record<string, boolean>;
    customFields?: Record<string, unknown>;
  }>().default({}),
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
  lastActivityAt: timestamp("last_activity_at"),
  
  // Soft delete for data retention
  deletedAt: timestamp("deleted_at"),
  anonymizedAt: timestamp("anonymized_at"),
}, (table) => ({
  // Indexes for common queries
  emailIdx: index("secure_accounts_email_idx").on(table.email),
  emailHashIdx: index("secure_accounts_email_hash_idx").on(table.emailHash),
  usernameIdx: index("secure_accounts_username_idx").on(table.username),
  googleIdIdx: index("secure_accounts_google_id_idx").on(table.googleId),
  activeIdx: index("secure_accounts_active_idx").on(table.isActive),
  createdAtIdx: index("secure_accounts_created_at_idx").on(table.createdAt),
}));

// ============== USER SETTINGS ==============

/**
 * User settings table - scalable key-value style with categories
 * Allows adding new settings without schema migrations
 */
export const userSettings = pgTable("user_settings", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => secureAccounts.id, { onDelete: "cascade" }),
  
  // Setting category for organization
  category: varchar("category", { length: 50 }).notNull(), // app, telescope, camera, notifications, display, etc.
  
  // Flexible settings storage
  settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
  
  // Versioning for settings schema evolution
  schemaVersion: integer("schema_version").notNull().default(1),
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userCategoryIdx: uniqueIndex("user_settings_user_category_idx").on(table.userId, table.category),
  userIdx: index("user_settings_user_idx").on(table.userId),
}));

// ============== CHAT HISTORIES ==============

/**
 * Chat/conversation history storage
 * Optimized for time-series data with partitioning support
 */
export const chatHistories = pgTable("chat_histories", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => secureAccounts.id, { onDelete: "cascade" }),
  
  // Conversation context
  conversationId: varchar("conversation_id", { length: 36 }).notNull(), // Groups related messages
  conversationType: varchar("conversation_type", { length: 50 }).notNull().default("general"), // general, telescope_command, support, etc.
  
  // Message content
  role: varchar("role", { length: 20 }).notNull(), // user, assistant, system
  content: text("content").notNull(),
  
  // Structured data for commands/responses
  structuredData: jsonb("structured_data").$type<{
    commandType?: string;
    parameters?: Record<string, unknown>;
    result?: Record<string, unknown>;
    error?: string;
  }>(),
  
  // Message metadata
  tokenCount: integer("token_count"),
  processingTimeMs: integer("processing_time_ms"),
  
  // Privacy controls
  isRetained: boolean("is_retained").notNull().default(true), // Can be set to false for ephemeral messages
  expiresAt: timestamp("expires_at"), // Auto-delete after this time
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userConversationIdx: index("chat_histories_user_conversation_idx").on(table.userId, table.conversationId),
  userIdx: index("chat_histories_user_idx").on(table.userId),
  conversationIdx: index("chat_histories_conversation_idx").on(table.conversationId),
  createdAtIdx: index("chat_histories_created_at_idx").on(table.createdAt),
  expiresAtIdx: index("chat_histories_expires_at_idx").on(table.expiresAt),
}));

// ============== DATA PRIVACY CONSENTS ==============

/**
 * GDPR-compliant consent tracking
 * Records user consent for various data processing activities
 */
export const dataConsents = pgTable("data_consents", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => secureAccounts.id, { onDelete: "cascade" }),
  
  // Consent details
  consentType: varchar("consent_type", { length: 100 }).notNull(), // terms_of_service, privacy_policy, marketing, analytics, data_sharing, etc.
  version: varchar("version", { length: 20 }).notNull(), // Policy version consented to
  
  // Consent status
  isGranted: boolean("is_granted").notNull(),
  grantedAt: timestamp("granted_at"),
  revokedAt: timestamp("revoked_at"),
  
  // Audit trail
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  
  // Legal compliance
  legalBasis: varchar("legal_basis", { length: 50 }), // consent, contract, legitimate_interest, legal_obligation
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userConsentIdx: uniqueIndex("data_consents_user_consent_idx").on(table.userId, table.consentType),
  userIdx: index("data_consents_user_idx").on(table.userId),
  typeIdx: index("data_consents_type_idx").on(table.consentType),
}));

// ============== SECURITY AUDIT LOGS ==============

/**
 * Comprehensive audit logging for security and compliance
 * Immutable log of all security-relevant events
 */
export const securityAuditLogs = pgTable("security_audit_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  
  // Actor information
  userId: varchar("user_id", { length: 36 }).references(() => secureAccounts.id, { onDelete: "set null" }),
  actorType: varchar("actor_type", { length: 20 }).notNull(), // user, system, admin, api
  
  // Event details
  eventType: varchar("event_type", { length: 100 }).notNull(), // login_success, login_failure, password_change, 2fa_enabled, data_export, etc.
  eventCategory: varchar("event_category", { length: 50 }).notNull(), // authentication, authorization, data_access, account_change, privacy
  
  // Event data (flexible structure for various event types)
  eventData: jsonb("event_data").$type<Record<string, unknown>>(),
  
  // Request context
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  requestId: varchar("request_id", { length: 64 }), // For correlation
  sessionId: varchar("session_id", { length: 36 }),
  
  // Outcome
  success: boolean("success").notNull(),
  errorCode: varchar("error_code", { length: 50 }),
  errorMessage: text("error_message"),
  
  // Risk scoring
  riskLevel: varchar("risk_level", { length: 20 }).default("low"), // low, medium, high, critical
  requiresReview: boolean("requires_review").notNull().default(false),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by", { length: 36 }),
  
  // Timestamp (immutable)
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdx: index("security_audit_logs_user_idx").on(table.userId),
  eventTypeIdx: index("security_audit_logs_event_type_idx").on(table.eventType),
  eventCategoryIdx: index("security_audit_logs_event_category_idx").on(table.eventCategory),
  createdAtIdx: index("security_audit_logs_created_at_idx").on(table.createdAt),
  riskLevelIdx: index("security_audit_logs_risk_level_idx").on(table.riskLevel),
  requiresReviewIdx: index("security_audit_logs_requires_review_idx").on(table.requiresReview),
}));

// ============== ACCOUNT RECOVERY ==============

/**
 * Password reset and account recovery tokens
 * Time-limited, single-use tokens
 */
export const accountRecovery = pgTable("account_recovery", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => secureAccounts.id, { onDelete: "cascade" }),
  
  // Token details
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(), // SHA-256 hash of token
  tokenType: varchar("token_type", { length: 50 }).notNull(), // password_reset, email_verification, account_unlock
  
  // Token status
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  isRevoked: boolean("is_revoked").notNull().default(false),
  
  // Security context
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  tokenHashIdx: uniqueIndex("account_recovery_token_hash_idx").on(table.tokenHash),
  userIdx: index("account_recovery_user_idx").on(table.userId),
  expiresAtIdx: index("account_recovery_expires_at_idx").on(table.expiresAt),
}));

// ============== ENHANCED SESSIONS ==============

/**
 * Enhanced session management with security features
 * Extends the basic sessions table with additional security context
 */
export const secureSessions = pgTable("secure_sessions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => secureAccounts.id, { onDelete: "cascade" }),
  
  // Session token
  tokenHash: varchar("token_hash", { length: 128 }).notNull().unique(), // Hashed session token
  
  // Session metadata
  deviceType: varchar("device_type", { length: 50 }), // desktop, mobile, tablet, unknown
  deviceName: varchar("device_name", { length: 100 }), // User-friendly device identifier
  browserName: varchar("browser_name", { length: 50 }),
  osName: varchar("os_name", { length: 50 }),
  
  // Security context
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  
  // Location (optional, privacy-respecting)
  countryCode: varchar("country_code", { length: 2 }),
  regionCode: varchar("region_code", { length: 10 }),
  
  // Session status
  isActive: boolean("is_active").notNull().default(true),
  isTrusted: boolean("is_trusted").notNull().default(false), // "Remember this device"
  lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),
  
  // Expiration
  expiresAt: timestamp("expires_at").notNull(),
  absoluteExpiresAt: timestamp("absolute_expires_at").notNull(), // Max session lifetime
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  revokedAt: timestamp("revoked_at"),
}, (table) => ({
  tokenHashIdx: uniqueIndex("secure_sessions_token_hash_idx").on(table.tokenHash),
  userIdx: index("secure_sessions_user_idx").on(table.userId),
  userActiveIdx: index("secure_sessions_user_active_idx").on(table.userId, table.isActive),
  expiresAtIdx: index("secure_sessions_expires_at_idx").on(table.expiresAt),
}));

// ============== RATE LIMITING ==============

/**
 * Rate limiting tracking
 * Prevents brute force attacks and API abuse
 */
export const rateLimits = pgTable("rate_limits", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  
  // Identifier (can be IP, user ID, or combination)
  identifier: varchar("identifier", { length: 255 }).notNull(),
  identifierType: varchar("identifier_type", { length: 20 }).notNull(), // ip, user, ip_user, api_key
  
  // Action being limited
  actionType: varchar("action_type", { length: 50 }).notNull(), // login, register, password_reset, api_call, etc.
  
  // Rate limit data
  windowStart: timestamp("window_start").notNull(),
  requestCount: integer("request_count").notNull().default(1),
  
  // Block status
  isBlocked: boolean("is_blocked").notNull().default(false),
  blockedUntil: timestamp("blocked_until"),
  blockReason: text("block_reason"),
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  identifierActionIdx: uniqueIndex("rate_limits_identifier_action_idx").on(
    table.identifier, 
    table.identifierType, 
    table.actionType,
    table.windowStart
  ),
  windowStartIdx: index("rate_limits_window_start_idx").on(table.windowStart),
  blockedUntilIdx: index("rate_limits_blocked_until_idx").on(table.blockedUntil),
}));

// ============== DATA EXPORT REQUESTS ==============

/**
 * GDPR data export/deletion request tracking
 */
export const dataRequests = pgTable("data_requests", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => secureAccounts.id, { onDelete: "cascade" }),
  
  // Request type
  requestType: varchar("request_type", { length: 50 }).notNull(), // export, deletion, rectification
  
  // Request status
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, processing, completed, failed
  
  // Processing details
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
  completedAt: timestamp("completed_at"),
  
  // Export file (for export requests)
  exportFileUrl: text("export_file_url"),
  exportExpiresAt: timestamp("export_expires_at"),
  
  // Audit trail
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  processedBy: varchar("processed_by", { length: 36 }), // Admin who processed
  notes: text("notes"),
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdx: index("data_requests_user_idx").on(table.userId),
  statusIdx: index("data_requests_status_idx").on(table.status),
  requestTypeIdx: index("data_requests_request_type_idx").on(table.requestType),
}));

// ============== ZOD SCHEMAS ==============

// Secure account schemas
export const insertSecureAccountSchema = createInsertSchema(secureAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  emailHash: true,
});

export const selectSecureAccountSchema = createSelectSchema(secureAccounts);

export type InsertSecureAccount = z.infer<typeof insertSecureAccountSchema>;
export type SecureAccount = typeof secureAccounts.$inferSelect;

// Public profile type (safe to expose)
export type PublicProfile = Pick<SecureAccount, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'createdAt'>;

// User settings schemas
export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettings.$inferSelect;

// Chat history schemas
export const insertChatHistorySchema = createInsertSchema(chatHistories).omit({
  id: true,
  createdAt: true,
});

export type InsertChatHistory = z.infer<typeof insertChatHistorySchema>;
export type ChatHistory = typeof chatHistories.$inferSelect;

// Data consent schemas
export const insertDataConsentSchema = createInsertSchema(dataConsents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDataConsent = z.infer<typeof insertDataConsentSchema>;
export type DataConsent = typeof dataConsents.$inferSelect;

// Security audit log schemas
export const insertSecurityAuditLogSchema = createInsertSchema(securityAuditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertSecurityAuditLog = z.infer<typeof insertSecurityAuditLogSchema>;
export type SecurityAuditLog = typeof securityAuditLogs.$inferSelect;

// Account recovery schemas
export const insertAccountRecoverySchema = createInsertSchema(accountRecovery).omit({
  id: true,
  createdAt: true,
});

export type InsertAccountRecovery = z.infer<typeof insertAccountRecoverySchema>;
export type AccountRecovery = typeof accountRecovery.$inferSelect;

// Secure session schemas
export const insertSecureSessionSchema = createInsertSchema(secureSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertSecureSession = z.infer<typeof insertSecureSessionSchema>;
export type SecureSession = typeof secureSessions.$inferSelect;

// Rate limit schemas
export const insertRateLimitSchema = createInsertSchema(rateLimits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRateLimit = z.infer<typeof insertRateLimitSchema>;
export type RateLimit = typeof rateLimits.$inferSelect;

// Data request schemas
export const insertDataRequestSchema = createInsertSchema(dataRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDataRequest = z.infer<typeof insertDataRequestSchema>;
export type DataRequest = typeof dataRequests.$inferSelect;

// ============== VALIDATION SCHEMAS ==============

// Enhanced registration schema with privacy options
export const secureRegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be at most 50 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be at most 100 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  displayName: z.string().max(200).optional(),
  
  // Privacy consent
  termsAccepted: z.boolean().refine(val => val === true, "You must accept the terms of service"),
  privacyPolicyAccepted: z.boolean().refine(val => val === true, "You must accept the privacy policy"),
  marketingOptIn: z.boolean().optional().default(false),
  analyticsOptIn: z.boolean().optional().default(true),
});

export type SecureRegisterInput = z.infer<typeof secureRegisterSchema>;

// Password change schema
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be at most 100 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

// Settings update schema
export const updateSettingsSchema = z.object({
  category: z.string().min(1).max(50),
  settings: z.record(z.unknown()),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

// Privacy settings schema
export const privacySettingsSchema = z.object({
  privacyLevel: z.enum(["minimal", "standard", "enhanced"]).optional(),
  dataRetentionDays: z.number().min(30).max(730).optional(),
  marketingOptIn: z.boolean().optional(),
  analyticsOptIn: z.boolean().optional(),
});

export type PrivacySettingsInput = z.infer<typeof privacySettingsSchema>;
