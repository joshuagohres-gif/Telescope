/**
 * Secure Account Routes
 * 
 * API routes for secure account management including:
 * - Account settings management
 * - Chat history operations
 * - Privacy controls (consent management, data export/deletion)
 * - Security features (2FA, session management, audit logs)
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { secureAccountStorage, initializeSecureAccountStorage } from "./secure-account-storage";
import {
  updateSettingsSchema,
  privacySettingsSchema,
  passwordChangeSchema,
} from "@shared/secure-account-schema";
import type { SecureAccount } from "@shared/secure-account-schema";

const router = Router();

// Extend Express Request to include secure account
declare global {
  namespace Express {
    interface Request {
      secureAccount?: SecureAccount;
      sessionId?: string;
    }
  }
}

// ==================== MIDDLEWARE ====================

/**
 * Require authentication for secure account routes
 */
function requireSecureAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.secureAccount) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

/**
 * Rate limiting middleware
 */
async function rateLimitMiddleware(actionType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.ip || "unknown";
    const { allowed, retryAfter } = await secureAccountStorage.checkRateLimit(
      identifier,
      "ip",
      actionType
    );

    if (!allowed) {
      return res.status(429).json({
        error: "Too many requests",
        retryAfter,
      });
    }

    next();
  };
}

// ==================== ACCOUNT SETTINGS ====================

/**
 * GET /api/secure-account/settings - Get all user settings
 */
router.get("/settings", requireSecureAuth, async (req, res) => {
  try {
    const settings = await secureAccountStorage.getSettings(req.secureAccount!.id);
    res.json({ settings });
  } catch (error) {
    console.error("[SecureAccount] Get settings error:", error);
    res.status(500).json({ error: "Failed to get settings" });
  }
});

/**
 * GET /api/secure-account/settings/:category - Get settings for a specific category
 */
router.get("/settings/:category", requireSecureAuth, async (req, res) => {
  try {
    const { category } = req.params;
    const settings = await secureAccountStorage.getSettings(req.secureAccount!.id, category);
    res.json({ settings: settings[0]?.settings || {} });
  } catch (error) {
    console.error("[SecureAccount] Get settings category error:", error);
    res.status(500).json({ error: "Failed to get settings" });
  }
});

/**
 * PUT /api/secure-account/settings - Update settings
 */
router.put("/settings", requireSecureAuth, async (req, res) => {
  try {
    const validation = updateSettingsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.flatten().fieldErrors,
      });
    }

    const { category, settings } = validation.data;
    const updated = await secureAccountStorage.updateSettings(
      req.secureAccount!.id,
      category,
      settings
    );

    // Log setting change
    await secureAccountStorage.logSecurityEvent({
      userId: req.secureAccount!.id,
      actorType: "user",
      eventType: "settings_updated",
      eventCategory: "account_change",
      eventData: { category },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      success: true,
      riskLevel: "low",
      requiresReview: false,
    });

    res.json({ settings: updated });
  } catch (error) {
    console.error("[SecureAccount] Update settings error:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// ==================== CHAT HISTORY ====================

/**
 * GET /api/secure-account/conversations - Get list of conversations
 */
router.get("/conversations", requireSecureAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const conversations = await secureAccountStorage.getConversations(
      req.secureAccount!.id,
      limit
    );
    res.json({ conversations });
  } catch (error) {
    console.error("[SecureAccount] Get conversations error:", error);
    res.status(500).json({ error: "Failed to get conversations" });
  }
});

/**
 * GET /api/secure-account/conversations/:conversationId - Get chat history for a conversation
 */
router.get("/conversations/:conversationId", requireSecureAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const messages = await secureAccountStorage.getChatHistory(
      req.secureAccount!.id,
      conversationId,
      limit
    );
    res.json({ messages: messages.reverse() }); // Return in chronological order
  } catch (error) {
    console.error("[SecureAccount] Get chat history error:", error);
    res.status(500).json({ error: "Failed to get chat history" });
  }
});

/**
 * POST /api/secure-account/conversations/:conversationId/messages - Add a chat message
 */
router.post("/conversations/:conversationId/messages", requireSecureAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { role, content, conversationType, structuredData, isRetained, expiresAt } = req.body;

    if (!role || !content) {
      return res.status(400).json({ error: "Role and content are required" });
    }

    const message = await secureAccountStorage.addChatMessage({
      userId: req.secureAccount!.id,
      conversationId,
      conversationType: conversationType || "general",
      role,
      content,
      structuredData,
      isRetained: isRetained ?? true,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    res.status(201).json({ message });
  } catch (error) {
    console.error("[SecureAccount] Add chat message error:", error);
    res.status(500).json({ error: "Failed to add message" });
  }
});

/**
 * DELETE /api/secure-account/conversations/:conversationId - Delete a conversation
 */
router.delete("/conversations/:conversationId", requireSecureAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    await secureAccountStorage.deleteChatHistory(req.secureAccount!.id, conversationId);

    // Log deletion
    await secureAccountStorage.logSecurityEvent({
      userId: req.secureAccount!.id,
      actorType: "user",
      eventType: "chat_deleted",
      eventCategory: "data_access",
      eventData: { conversationId },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      success: true,
      riskLevel: "low",
      requiresReview: false,
    });

    res.json({ message: "Conversation deleted" });
  } catch (error) {
    console.error("[SecureAccount] Delete conversation error:", error);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

/**
 * DELETE /api/secure-account/conversations - Delete all chat history
 */
router.delete("/conversations", requireSecureAuth, async (req, res) => {
  try {
    await secureAccountStorage.deleteChatHistory(req.secureAccount!.id);

    // Log deletion
    await secureAccountStorage.logSecurityEvent({
      userId: req.secureAccount!.id,
      actorType: "user",
      eventType: "all_chats_deleted",
      eventCategory: "data_access",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      success: true,
      riskLevel: "medium",
      requiresReview: false,
    });

    res.json({ message: "All chat history deleted" });
  } catch (error) {
    console.error("[SecureAccount] Delete all chats error:", error);
    res.status(500).json({ error: "Failed to delete chat history" });
  }
});

// ==================== PRIVACY CONTROLS ====================

/**
 * GET /api/secure-account/privacy - Get privacy settings
 */
router.get("/privacy", requireSecureAuth, async (req, res) => {
  try {
    const account = req.secureAccount!;
    const consents = await secureAccountStorage.getConsents(account.id);

    res.json({
      privacySettings: {
        privacyLevel: account.privacyLevel,
        dataRetentionDays: account.dataRetentionDays,
        marketingOptIn: account.marketingOptIn,
        analyticsOptIn: account.analyticsOptIn,
      },
      consents: consents.map(c => ({
        type: c.consentType,
        version: c.version,
        isGranted: c.isGranted,
        grantedAt: c.grantedAt,
        revokedAt: c.revokedAt,
      })),
    });
  } catch (error) {
    console.error("[SecureAccount] Get privacy settings error:", error);
    res.status(500).json({ error: "Failed to get privacy settings" });
  }
});

/**
 * PUT /api/secure-account/privacy - Update privacy settings
 */
router.put("/privacy", requireSecureAuth, async (req, res) => {
  try {
    const validation = privacySettingsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.flatten().fieldErrors,
      });
    }

    const updates = validation.data;
    await secureAccountStorage.updateAccount(req.secureAccount!.id, updates);

    // Log privacy change
    await secureAccountStorage.logSecurityEvent({
      userId: req.secureAccount!.id,
      actorType: "user",
      eventType: "privacy_settings_updated",
      eventCategory: "privacy",
      eventData: { changes: Object.keys(updates) },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      success: true,
      riskLevel: "low",
      requiresReview: false,
    });

    res.json({ message: "Privacy settings updated" });
  } catch (error) {
    console.error("[SecureAccount] Update privacy settings error:", error);
    res.status(500).json({ error: "Failed to update privacy settings" });
  }
});

/**
 * POST /api/secure-account/consent - Record user consent
 */
router.post("/consent", requireSecureAuth, async (req, res) => {
  try {
    const { consentType, version, isGranted, legalBasis } = req.body;

    if (!consentType || !version || typeof isGranted !== "boolean") {
      return res.status(400).json({ error: "Invalid consent data" });
    }

    const consent = await secureAccountStorage.recordConsent({
      userId: req.secureAccount!.id,
      consentType,
      version,
      isGranted,
      grantedAt: isGranted ? new Date() : undefined,
      revokedAt: !isGranted ? new Date() : undefined,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      legalBasis,
    });

    // Log consent change
    await secureAccountStorage.logSecurityEvent({
      userId: req.secureAccount!.id,
      actorType: "user",
      eventType: isGranted ? "consent_granted" : "consent_revoked",
      eventCategory: "privacy",
      eventData: { consentType, version },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      success: true,
      riskLevel: "low",
      requiresReview: false,
    });

    res.json({ consent });
  } catch (error) {
    console.error("[SecureAccount] Record consent error:", error);
    res.status(500).json({ error: "Failed to record consent" });
  }
});

/**
 * DELETE /api/secure-account/consent/:type - Revoke consent
 */
router.delete("/consent/:type", requireSecureAuth, async (req, res) => {
  try {
    const { type } = req.params;
    await secureAccountStorage.revokeConsent(req.secureAccount!.id, type);

    // Log consent revocation
    await secureAccountStorage.logSecurityEvent({
      userId: req.secureAccount!.id,
      actorType: "user",
      eventType: "consent_revoked",
      eventCategory: "privacy",
      eventData: { consentType: type },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      success: true,
      riskLevel: "low",
      requiresReview: false,
    });

    res.json({ message: "Consent revoked" });
  } catch (error) {
    console.error("[SecureAccount] Revoke consent error:", error);
    res.status(500).json({ error: "Failed to revoke consent" });
  }
});

// ==================== DATA REQUESTS (GDPR) ====================

/**
 * GET /api/secure-account/data-requests - Get user's data requests
 */
router.get("/data-requests", requireSecureAuth, async (req, res) => {
  try {
    const requests = await secureAccountStorage.getDataRequests(req.secureAccount!.id);
    res.json({ requests });
  } catch (error) {
    console.error("[SecureAccount] Get data requests error:", error);
    res.status(500).json({ error: "Failed to get data requests" });
  }
});

/**
 * POST /api/secure-account/data-export - Request data export
 */
router.post("/data-export", requireSecureAuth, async (req, res) => {
  try {
    // Create export request
    const request = await secureAccountStorage.createDataRequest(
      req.secureAccount!.id,
      "export",
      { ipAddress: req.ip, userAgent: req.headers["user-agent"] }
    );

    // Process export immediately (in production, this would be async)
    const exportData = await secureAccountStorage.processDataExport(req.secureAccount!.id);

    // Log export request
    await secureAccountStorage.logSecurityEvent({
      userId: req.secureAccount!.id,
      actorType: "user",
      eventType: "data_export_requested",
      eventCategory: "privacy",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      success: true,
      riskLevel: "medium",
      requiresReview: true,
    });

    res.json({
      message: "Data export completed",
      requestId: request.id,
      data: exportData,
    });
  } catch (error) {
    console.error("[SecureAccount] Data export error:", error);
    res.status(500).json({ error: "Failed to export data" });
  }
});

/**
 * POST /api/secure-account/data-deletion - Request account deletion
 */
router.post("/data-deletion", requireSecureAuth, async (req, res) => {
  try {
    const { confirmDeletion } = req.body;

    if (confirmDeletion !== true) {
      return res.status(400).json({
        error: "You must confirm the deletion by setting confirmDeletion to true",
      });
    }

    // Create deletion request
    const request = await secureAccountStorage.createDataRequest(
      req.secureAccount!.id,
      "deletion",
      { ipAddress: req.ip, userAgent: req.headers["user-agent"] }
    );

    // Log deletion request
    await secureAccountStorage.logSecurityEvent({
      userId: req.secureAccount!.id,
      actorType: "user",
      eventType: "data_deletion_requested",
      eventCategory: "privacy",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      success: true,
      riskLevel: "critical",
      requiresReview: true,
    });

    // Schedule anonymization (in production, this would have a grace period)
    // For now, we anonymize immediately
    await secureAccountStorage.anonymizeAccount(req.secureAccount!.id);

    res.json({
      message: "Account deletion completed. Your data has been anonymized.",
      requestId: request.id,
    });
  } catch (error) {
    console.error("[SecureAccount] Data deletion error:", error);
    res.status(500).json({ error: "Failed to process deletion request" });
  }
});

// ==================== SECURITY ====================

/**
 * POST /api/secure-account/change-password - Change password
 */
router.post("/change-password", requireSecureAuth, async (req, res) => {
  try {
    const validation = passwordChangeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.flatten().fieldErrors,
      });
    }

    const { currentPassword, newPassword } = validation.data;

    // Verify current password
    const isValid = await secureAccountStorage.verifyPassword(req.secureAccount!, currentPassword);
    if (!isValid) {
      // Log failed attempt
      await secureAccountStorage.logSecurityEvent({
        userId: req.secureAccount!.id,
        actorType: "user",
        eventType: "password_change_failed",
        eventCategory: "authentication",
        eventData: { reason: "incorrect_current_password" },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        success: false,
        errorCode: "INVALID_PASSWORD",
        riskLevel: "medium",
        requiresReview: false,
      });

      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Change password
    await secureAccountStorage.changePassword(req.secureAccount!.id, newPassword);

    // Log successful change
    await secureAccountStorage.logSecurityEvent({
      userId: req.secureAccount!.id,
      actorType: "user",
      eventType: "password_changed",
      eventCategory: "authentication",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      success: true,
      riskLevel: "medium",
      requiresReview: false,
    });

    // Optionally revoke other sessions
    if (req.body.revokeOtherSessions) {
      const sessions = await secureAccountStorage.getAccountSessions(req.secureAccount!.id);
      for (const session of sessions) {
        if (session.id !== req.sessionId) {
          await secureAccountStorage.revokeSession(session.id);
        }
      }
    }

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("[SecureAccount] Change password error:", error);
    res.status(500).json({ error: "Failed to change password" });
  }
});

/**
 * GET /api/secure-account/sessions - Get active sessions
 */
router.get("/sessions", requireSecureAuth, async (req, res) => {
  try {
    const sessions = await secureAccountStorage.getAccountSessions(req.secureAccount!.id);

    res.json({
      sessions: sessions.map(s => ({
        id: s.id,
        deviceType: s.deviceType,
        deviceName: s.deviceName,
        browserName: s.browserName,
        osName: s.osName,
        ipAddress: s.ipAddress, // Consider masking in production
        isTrusted: s.isTrusted,
        lastActivityAt: s.lastActivityAt,
        createdAt: s.createdAt,
        isCurrent: s.id === req.sessionId,
      })),
    });
  } catch (error) {
    console.error("[SecureAccount] Get sessions error:", error);
    res.status(500).json({ error: "Failed to get sessions" });
  }
});

/**
 * DELETE /api/secure-account/sessions/:sessionId - Revoke a session
 */
router.delete("/sessions/:sessionId", requireSecureAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Can't revoke current session via this endpoint
    if (sessionId === req.sessionId) {
      return res.status(400).json({ error: "Cannot revoke current session. Use logout instead." });
    }

    await secureAccountStorage.revokeSession(sessionId);

    // Log session revocation
    await secureAccountStorage.logSecurityEvent({
      userId: req.secureAccount!.id,
      actorType: "user",
      eventType: "session_revoked",
      eventCategory: "authentication",
      eventData: { sessionId },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      success: true,
      riskLevel: "low",
      requiresReview: false,
    });

    res.json({ message: "Session revoked" });
  } catch (error) {
    console.error("[SecureAccount] Revoke session error:", error);
    res.status(500).json({ error: "Failed to revoke session" });
  }
});

/**
 * DELETE /api/secure-account/sessions - Revoke all other sessions
 */
router.delete("/sessions", requireSecureAuth, async (req, res) => {
  try {
    const sessions = await secureAccountStorage.getAccountSessions(req.secureAccount!.id);
    
    for (const session of sessions) {
      if (session.id !== req.sessionId) {
        await secureAccountStorage.revokeSession(session.id);
      }
    }

    // Log bulk session revocation
    await secureAccountStorage.logSecurityEvent({
      userId: req.secureAccount!.id,
      actorType: "user",
      eventType: "all_sessions_revoked",
      eventCategory: "authentication",
      eventData: { count: sessions.length - 1 },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      success: true,
      riskLevel: "medium",
      requiresReview: false,
    });

    res.json({ message: "All other sessions revoked" });
  } catch (error) {
    console.error("[SecureAccount] Revoke all sessions error:", error);
    res.status(500).json({ error: "Failed to revoke sessions" });
  }
});

/**
 * GET /api/secure-account/audit-logs - Get security audit logs
 */
router.get("/audit-logs", requireSecureAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = await secureAccountStorage.getAuditLogs(req.secureAccount!.id, limit);

    res.json({
      logs: logs.map(log => ({
        id: log.id,
        eventType: log.eventType,
        eventCategory: log.eventCategory,
        success: log.success,
        ipAddress: log.ipAddress,
        riskLevel: log.riskLevel,
        createdAt: log.createdAt,
      })),
    });
  } catch (error) {
    console.error("[SecureAccount] Get audit logs error:", error);
    res.status(500).json({ error: "Failed to get audit logs" });
  }
});

// ==================== PROFILE ====================

/**
 * GET /api/secure-account/profile - Get account profile
 */
router.get("/profile", requireSecureAuth, async (req, res) => {
  try {
    const account = req.secureAccount!;
    res.json({
      profile: {
        id: account.id,
        email: account.email,
        username: account.username,
        displayName: account.displayName,
        avatarUrl: account.avatarUrl,
        isEmailVerified: account.isEmailVerified,
        twoFactorEnabled: account.twoFactorEnabled,
        createdAt: account.createdAt,
        lastLoginAt: account.lastLoginAt,
      },
    });
  } catch (error) {
    console.error("[SecureAccount] Get profile error:", error);
    res.status(500).json({ error: "Failed to get profile" });
  }
});

/**
 * PUT /api/secure-account/profile - Update profile
 */
router.put("/profile", requireSecureAuth, async (req, res) => {
  try {
    const { displayName, avatarUrl } = req.body;

    const updates: Record<string, unknown> = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No updates provided" });
    }

    const updated = await secureAccountStorage.updateAccount(req.secureAccount!.id, updates);

    // Log profile update
    await secureAccountStorage.logSecurityEvent({
      userId: req.secureAccount!.id,
      actorType: "user",
      eventType: "profile_updated",
      eventCategory: "account_change",
      eventData: { fields: Object.keys(updates) },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      success: true,
      riskLevel: "low",
      requiresReview: false,
    });

    res.json({
      profile: {
        id: updated?.id,
        email: updated?.email,
        username: updated?.username,
        displayName: updated?.displayName,
        avatarUrl: updated?.avatarUrl,
      },
    });
  } catch (error) {
    console.error("[SecureAccount] Update profile error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
export { requireSecureAuth };
