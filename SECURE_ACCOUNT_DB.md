# Secure Account Database

A privacy-focused, scalable database system for user account management with GDPR compliance features.

## Overview

The Secure Account Database provides:

- **Enhanced Security**: PBKDF2 password hashing with 100K iterations, AES-256-GCM encryption for sensitive data
- **Privacy Protection**: GDPR-compliant consent management, data export/deletion support, audit logging
- **Scalability**: JSONB fields for extensible metadata without schema migrations
- **Session Management**: Enhanced sessions with device tracking and security context
- **Rate Limiting**: Protection against brute force attacks

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `secure_accounts` | Core user accounts with encrypted PII |
| `user_settings` | Scalable key-value settings by category |
| `chat_histories` | Conversation/chat message storage |
| `data_consents` | GDPR consent tracking |
| `security_audit_logs` | Immutable security event logs |
| `account_recovery` | Password reset/recovery tokens |
| `secure_sessions` | Enhanced session management |
| `rate_limits` | Rate limiting tracking |
| `data_requests` | GDPR data export/deletion requests |

### Schema Design

```
secure_accounts
├── Core Identity: email, username, email_hash
├── Authentication: password_hash, password_salt, password_iterations
├── OAuth: google_id, oauth_providers (JSONB)
├── Privacy: privacy_level, data_retention_days, marketing/analytics opt-in
├── Security: 2FA, backup_codes, failed_attempts, lockout
├── Metadata: JSONB for extensible user data
└── Soft Delete: deleted_at, anonymized_at
```

## API Endpoints

### Account Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/secure-account/settings` | Get all user settings |
| GET | `/api/secure-account/settings/:category` | Get settings by category |
| PUT | `/api/secure-account/settings` | Update settings |

### Chat History

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/secure-account/conversations` | List conversations |
| GET | `/api/secure-account/conversations/:id` | Get conversation messages |
| POST | `/api/secure-account/conversations/:id/messages` | Add message |
| DELETE | `/api/secure-account/conversations/:id` | Delete conversation |
| DELETE | `/api/secure-account/conversations` | Delete all chat history |

### Privacy Controls

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/secure-account/privacy` | Get privacy settings & consents |
| PUT | `/api/secure-account/privacy` | Update privacy settings |
| POST | `/api/secure-account/consent` | Record consent |
| DELETE | `/api/secure-account/consent/:type` | Revoke consent |

### GDPR Data Requests

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/secure-account/data-requests` | List data requests |
| POST | `/api/secure-account/data-export` | Request data export |
| POST | `/api/secure-account/data-deletion` | Request account deletion |

### Security

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/secure-account/change-password` | Change password |
| GET | `/api/secure-account/sessions` | List active sessions |
| DELETE | `/api/secure-account/sessions/:id` | Revoke session |
| DELETE | `/api/secure-account/sessions` | Revoke all other sessions |
| GET | `/api/secure-account/audit-logs` | View security audit logs |

### Profile

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/secure-account/profile` | Get profile |
| PUT | `/api/secure-account/profile` | Update profile |

## Setup

### 1. Environment Variables

```bash
# Required for encryption (32 bytes / 64 hex chars)
ENCRYPTION_KEY=your-64-character-hex-encryption-key

# Required for database
DATABASE_URL=postgresql://user:password@host:5432/database
```

### 2. Generate Encryption Key

```bash
# Generate a secure 256-bit key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Run Database Migration

```bash
npm run db:push
```

## Scalability Features

### Extensible Metadata (JSONB)

The `metadata` field in `secure_accounts` supports arbitrary user data:

```typescript
// Store any user preferences without schema changes
await secureAccountStorage.updateAccount(userId, {
  metadata: {
    timezone: "America/New_York",
    locale: "en-US",
    theme: "dark",
    notifications: {
      email: true,
      push: false,
    },
    customFields: {
      favoriteTargets: ["M31", "M42"],
      telescopePreset: "dobsonian-8inch",
    },
  },
});
```

### Flexible Settings by Category

User settings are organized by category for easy expansion:

```typescript
// Add new setting categories without migrations
await secureAccountStorage.updateSettings(userId, "telescope", {
  defaultExposure: 30,
  autoGuiding: true,
  platesolve: true,
});

await secureAccountStorage.updateSettings(userId, "notifications", {
  sessionComplete: true,
  weatherAlert: true,
  issPass: false,
});
```

### Chat History with Structured Data

Chat messages support structured command/response data:

```typescript
await secureAccountStorage.addChatMessage({
  userId,
  conversationId: "conv-123",
  conversationType: "telescope_command",
  role: "user",
  content: "Point to Andromeda Galaxy",
  structuredData: {
    commandType: "goto",
    parameters: { target: "M31" },
    result: { success: true, ra: 0.712, dec: 41.27 },
  },
});
```

## Privacy Features

### Consent Management

Track user consent for GDPR compliance:

```typescript
// Record consent
await secureAccountStorage.recordConsent({
  userId,
  consentType: "marketing",
  version: "2.0",
  isGranted: true,
  legalBasis: "consent",
});

// Revoke consent
await secureAccountStorage.revokeConsent(userId, "marketing");
```

### Data Export

Users can export all their data:

```typescript
const exportData = await secureAccountStorage.processDataExport(userId);
// Returns: account info, settings, chat history, consents, activity logs
```

### Account Anonymization

GDPR-compliant account deletion:

```typescript
await secureAccountStorage.anonymizeAccount(userId);
// Anonymizes PII, deletes chat history, revokes sessions
```

### Audit Logging

All security-relevant events are logged:

```typescript
await secureAccountStorage.logSecurityEvent({
  userId,
  actorType: "user",
  eventType: "password_changed",
  eventCategory: "authentication",
  ipAddress: req.ip,
  success: true,
  riskLevel: "medium",
});
```

## Security Features

### Password Security

- PBKDF2 with 100,000 iterations (upgradable)
- SHA-512 digest
- Unique salt per user
- Timing-safe comparison

### Rate Limiting

Protection against brute force:

```typescript
const { allowed, retryAfter } = await secureAccountStorage.checkRateLimit(
  ipAddress,
  "ip",
  "login"
);

if (!allowed) {
  return res.status(429).json({ error: "Too many requests", retryAfter });
}
```

### Session Security

- Session token hashing (never stored in plain text)
- Device fingerprinting
- IP and user agent tracking
- Absolute session expiration
- Multi-device session management

## Integration with Existing Auth

The secure account system integrates seamlessly with the existing authentication:

1. **Automatic Sync**: When users register or log in via the existing auth system, a corresponding secure account is created/updated
2. **Bridge Middleware**: Requests include both `req.user` (old system) and `req.secureAccount` (new system)
3. **No Breaking Changes**: All existing auth endpoints continue to work

## Database Indexes

Optimized indexes for common queries:

- `secure_accounts`: email, email_hash, username, google_id, created_at
- `user_settings`: user_id + category (unique)
- `chat_histories`: user_id + conversation_id, created_at, expires_at
- `security_audit_logs`: user_id, event_type, created_at, risk_level
- `secure_sessions`: token_hash (unique), user_id + is_active, expires_at

## Best Practices

1. **Always use HTTPS** in production for cookie security
2. **Set ENCRYPTION_KEY** in production environment
3. **Regular session cleanup** (runs hourly automatically)
4. **Monitor audit logs** for suspicious activity
5. **Implement consent UI** for GDPR compliance
6. **Regular data retention cleanup** based on user preferences
