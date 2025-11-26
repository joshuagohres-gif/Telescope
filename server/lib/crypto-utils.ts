/**
 * Cryptographic Utilities
 * 
 * Provides secure cryptographic functions for:
 * - Password hashing (PBKDF2 with high iteration count)
 * - Data encryption (AES-256-GCM)
 * - Secure token generation
 * - Hash generation for lookups
 */

import { createHash, randomBytes, pbkdf2, createCipheriv, createDecipheriv, timingSafeEqual } from "crypto";
import { promisify } from "util";

const pbkdf2Async = promisify(pbkdf2);

// Configuration
const PBKDF2_ITERATIONS = 100000; // OWASP recommended minimum
const PBKDF2_KEY_LENGTH = 64; // 512 bits
const PBKDF2_DIGEST = "sha512";
const SALT_LENGTH = 32; // 256 bits
const TOKEN_LENGTH = 64; // 512 bits
const AES_KEY_LENGTH = 32; // 256 bits
const AES_IV_LENGTH = 16; // 128 bits
const AES_AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Generate a cryptographically secure random string
 */
export function generateSecureToken(length: number = TOKEN_LENGTH): string {
  return randomBytes(length).toString("hex");
}

/**
 * Generate a random salt for password hashing
 */
export function generateSalt(length: number = SALT_LENGTH): string {
  return randomBytes(length).toString("hex");
}

/**
 * Hash a password using PBKDF2 with a high iteration count
 */
export async function hashPassword(
  password: string,
  salt?: string,
  iterations: number = PBKDF2_ITERATIONS
): Promise<{ hash: string; salt: string; iterations: number }> {
  const actualSalt = salt || generateSalt();
  const hash = await pbkdf2Async(
    password,
    actualSalt,
    iterations,
    PBKDF2_KEY_LENGTH,
    PBKDF2_DIGEST
  );

  return {
    hash: hash.toString("hex"),
    salt: actualSalt,
    iterations,
  };
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string,
  salt: string,
  iterations: number = PBKDF2_ITERATIONS
): Promise<boolean> {
  const computed = await pbkdf2Async(
    password,
    salt,
    iterations,
    PBKDF2_KEY_LENGTH,
    PBKDF2_DIGEST
  );

  const hashBuffer = Buffer.from(hash, "hex");
  
  // Use timing-safe comparison to prevent timing attacks
  if (hashBuffer.length !== computed.length) {
    return false;
  }
  
  return timingSafeEqual(hashBuffer, computed);
}

/**
 * Generate SHA-256 hash of a string (for email lookup, etc.)
 */
export function sha256Hash(input: string): string {
  return createHash("sha256").update(input.toLowerCase()).digest("hex");
}

/**
 * Generate SHA-512 hash of a string (for token storage, etc.)
 */
export function sha512Hash(input: string): string {
  return createHash("sha512").update(input).digest("hex");
}

/**
 * Get encryption key from environment or generate a deterministic one for development
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  
  if (key) {
    // If provided, ensure it's the right length
    const keyBuffer = Buffer.from(key, "hex");
    if (keyBuffer.length !== AES_KEY_LENGTH) {
      throw new Error(`ENCRYPTION_KEY must be ${AES_KEY_LENGTH * 2} hex characters (${AES_KEY_LENGTH} bytes)`);
    }
    return keyBuffer;
  }
  
  // For development, use a deterministic key derived from a known value
  // WARNING: In production, always set ENCRYPTION_KEY environment variable
  if (process.env.NODE_ENV === "production") {
    console.error("[SECURITY] ENCRYPTION_KEY not set in production! Using fallback key.");
  }
  
  return createHash("sha256")
    .update("development-encryption-key-do-not-use-in-production")
    .digest();
}

/**
 * Encrypt sensitive data using AES-256-GCM
 */
export function encryptData(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(AES_IV_LENGTH);
  
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted (all hex)
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt data encrypted with encryptData
 */
export function decryptData(ciphertext: string): string {
  const key = getEncryptionKey();
  
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid ciphertext format");
  }
  
  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(): string {
  return generateSecureToken(32);
}

/**
 * Hash a token for secure storage (one-way)
 */
export function hashToken(token: string): string {
  return sha256Hash(token);
}

/**
 * Generate backup codes for 2FA
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric codes
    const code = randomBytes(4).toString("hex").toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Hash backup codes for storage
 */
export function hashBackupCodes(codes: string[]): string {
  const hashes = codes.map((code) => sha256Hash(code));
  return JSON.stringify(hashes);
}

/**
 * Verify a backup code
 */
export function verifyBackupCode(code: string, hashedCodes: string): boolean {
  const hashes: string[] = JSON.parse(hashedCodes);
  const codeHash = sha256Hash(code.toUpperCase().replace(/\s/g, ""));
  return hashes.includes(codeHash);
}

/**
 * Remove a used backup code
 */
export function removeBackupCode(code: string, hashedCodes: string): string {
  const hashes: string[] = JSON.parse(hashedCodes);
  const codeHash = sha256Hash(code.toUpperCase().replace(/\s/g, ""));
  const filtered = hashes.filter((h) => h !== codeHash);
  return JSON.stringify(filtered);
}

/**
 * Generate a TOTP secret for 2FA
 * Returns a hex-encoded secret (can be converted to base32 by the TOTP library)
 */
export function generateTOTPSecret(): string {
  // Generate a 20-byte secret (160 bits, standard for TOTP)
  return randomBytes(20).toString("hex");
}

/**
 * Mask email for display (e.g., j***n@example.com)
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  
  return `${local[0]}${"*".repeat(Math.min(local.length - 2, 5))}${local[local.length - 1]}@${domain}`;
}

/**
 * Mask IP address for privacy (e.g., 192.168.*.*)
 */
export function maskIPAddress(ip: string): string {
  if (ip.includes(":")) {
    // IPv6
    const parts = ip.split(":");
    return parts.slice(0, 4).join(":") + ":****:****:****:****";
  }
  
  // IPv4
  const parts = ip.split(".");
  return `${parts[0]}.${parts[1]}.*.*`;
}

/**
 * Anonymize user data for GDPR compliance
 */
export function anonymizeUserData(userId: string): {
  anonymizedEmail: string;
  anonymizedUsername: string;
  anonymizedDisplayName: string;
} {
  const hash = sha256Hash(userId).substring(0, 12);
  return {
    anonymizedEmail: `deleted_${hash}@anonymized.local`,
    anonymizedUsername: `deleted_${hash}`,
    anonymizedDisplayName: "Deleted User",
  };
}
