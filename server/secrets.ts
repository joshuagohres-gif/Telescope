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
  };

  // Log which secrets are configured (without showing values)
  console.log('[Secrets] Configuration:');
  console.log(`  - OpenAI API Key: ${cachedSecrets.openai.apiKey ? '✓ configured' : '✗ not configured (using mock mode)'}`);
  console.log(`  - Database URL: ${cachedSecrets.database.url ? '✓ configured' : '✗ using default'}`);

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
 * Reload secrets from disk (useful after updating .secrets.json)
 */
export function reloadSecrets(): void {
  cachedSecrets = null;
  getSecrets();
  console.log('[Secrets] Secrets reloaded');
}
