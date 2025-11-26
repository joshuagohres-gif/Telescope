/**
 * Secrets Management System
 *
 * This module provides a centralized way to manage application secrets.
 * Secrets are stored in .secrets.json (local only, never committed).
 *
 * Priority order for loading secrets:
 * 1. Environment variables (highest priority)
 * 2. .secrets.json file
 * 3. Mock/default values (for development without real credentials)
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface Secrets {
  openai: {
    apiKey: string | null;
  };
  database: {
    url: string;
  };
  auth: {
    sessionSecret: string;
    google: {
      clientId: string | null;
      clientSecret: string | null;
    };
  };
}

let cachedSecrets: Secrets | null = null;

/**
 * Load secrets from .secrets.json file
 */
function loadSecretsFile(): Partial<Secrets> {
  const secretsPath = join(process.cwd(), '.secrets.json');

  if (!existsSync(secretsPath)) {
    console.warn('[Secrets] No .secrets.json file found. Using environment variables and defaults.');
    return {};
  }

  try {
    const fileContent = readFileSync(secretsPath, 'utf-8');
    const parsed = JSON.parse(fileContent);
    console.log('[Secrets] Loaded secrets from .secrets.json');
    return parsed;
  } catch (error) {
    console.error('[Secrets] Error reading .secrets.json:', error);
    return {};
  }
}

/**
 * Get all application secrets
 *
 * Priority: Environment variables > .secrets.json > defaults
 */
export function getSecrets(): Secrets {
  if (cachedSecrets) {
    return cachedSecrets;
  }

  const fileSecrets = loadSecretsFile();

  cachedSecrets = {
    openai: {
      // Priority: ENV var > secrets file > null (will use mock mode)
      apiKey: process.env.OPENAI_API_KEY
        || fileSecrets.openai?.apiKey
        || null,
    },
    database: {
      // Priority: ENV var > secrets file > default localhost
      url: process.env.DATABASE_URL
        || fileSecrets.database?.url
        || 'postgresql://postgres@127.0.0.1:5432/telescope',
    },
    auth: {
      // Session secret for signing cookies/tokens
      sessionSecret: process.env.SESSION_SECRET
        || fileSecrets.auth?.sessionSecret
        || 'telescope-control-dev-secret-change-in-production',
      google: {
        // Google OAuth credentials (null = disabled)
        // Get these from: https://console.cloud.google.com/apis/credentials
        clientId: process.env.GOOGLE_CLIENT_ID
          || fileSecrets.auth?.google?.clientId
          || null,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET
          || fileSecrets.auth?.google?.clientSecret
          || null,
      },
    },
  };

  // Log which secrets are configured (without showing values)
  console.log('[Secrets] Configuration:');
  console.log(`  - OpenAI API Key: ${cachedSecrets.openai.apiKey ? '✓ configured' : '✗ not configured (using mock mode)'}`);
  console.log(`  - Database URL: ${cachedSecrets.database.url ? '✓ configured' : '✗ using default'}`);
  console.log(`  - Session Secret: ${cachedSecrets.auth.sessionSecret !== 'telescope-control-dev-secret-change-in-production' ? '✓ configured' : '⚠ using dev default'}`);
  console.log(`  - Google OAuth: ${cachedSecrets.auth.google.clientId ? '✓ configured' : '✗ not configured (Google sign-in disabled)'}`);

  return cachedSecrets;
}

/**
 * Get OpenAI API key
 * Returns null if not configured (triggers mock mode)
 */
export function getOpenAIKey(): string | null {
  return getSecrets().openai.apiKey;
}

/**
 * Get database URL
 */
export function getDatabaseURL(): string {
  return getSecrets().database.url;
}

/**
 * Check if OpenAI API is configured (vs mock mode)
 */
export function isOpenAIConfigured(): boolean {
  return getOpenAIKey() !== null;
}

/**
 * Get session secret for signing cookies/tokens
 */
export function getSessionSecret(): string {
  return getSecrets().auth.sessionSecret;
}

/**
 * Get Google OAuth client ID
 * Returns null if not configured
 */
export function getGoogleClientId(): string | null {
  return getSecrets().auth.google.clientId;
}

/**
 * Get Google OAuth client secret
 * Returns null if not configured
 */
export function getGoogleClientSecret(): string | null {
  return getSecrets().auth.google.clientSecret;
}

/**
 * Check if Google OAuth is configured
 */
export function isGoogleOAuthConfigured(): boolean {
  const secrets = getSecrets();
  return secrets.auth.google.clientId !== null && secrets.auth.google.clientSecret !== null;
}

/**
 * Reload secrets from disk (useful after updating .secrets.json)
 */
export function reloadSecrets(): void {
  cachedSecrets = null;
  getSecrets();
  console.log('[Secrets] Secrets reloaded');
}
