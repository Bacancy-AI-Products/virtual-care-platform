/**
 * HIPAA §164.312(a)(2)(iv) — Field-level AES-256-GCM encryption for PHI.
 *
 * Encrypted values are stored as a compact JSON string:
 *   {"c":"<base64 ciphertext>","iv":"<base64 12-byte IV>","t":"<base64 16-byte tag>","k":"<keyId>"}
 *
 * This format is self-describing: every encrypted row embeds the key identifier it was
 * encrypted with, enabling key rotation without re-encrypting everything at once.
 *
 * MASTER_KEY must be 32 bytes (base64-encoded, 44 chars).
 * Generate:  openssl rand -base64 32
 *
 * When MASTER_KEY is absent (e.g. local dev without .env set), all operations are
 * no-ops — data flows through unencrypted.  Set MASTER_KEY before production deploy.
 */

import crypto from 'node:crypto';
import { config } from '../config';

interface EncryptedPayload {
    c: string; // ciphertext  (base64)
    iv: string; // 96-bit IV   (base64)
    t: string; // GCM auth tag (base64)
    k: string; // keyId
}

// ─── Core encrypt / decrypt ───────────────────────────────────────────────────

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Returns a JSON string embedding ciphertext, IV, auth-tag, and keyId.
 * Throws if MASTER_KEY is not configured.
 */
export function encryptField(plaintext: string): string {
    const key = getMasterKey();
    const iv = crypto.randomBytes(12); // 96-bit IV — GCM recommendation
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag(); // 128-bit authentication tag
    const payload: EncryptedPayload = {
        c: ciphertext.toString('base64'),
        iv: iv.toString('base64'),
        t: tag.toString('base64'),
        k: config.keyId ?? 'v1',
    };
    return JSON.stringify(payload);
}

/**
 * Decrypt a previously encrypted field value.
 * `ciphertext` must be the JSON string produced by `encryptField`.
 * Throws on invalid format, wrong key, or tampered auth tag.
 */
export function decryptField(ciphertext: string): string {
    const payload: EncryptedPayload = JSON.parse(ciphertext);
    const key = getMasterKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(payload.t, 'base64'));
    const plaintext = Buffer.concat([
        decipher.update(Buffer.from(payload.c, 'base64')),
        decipher.final(),
    ]);
    return plaintext.toString('utf8');
}

/**
 * Returns true when `value` looks like a payload produced by `encryptField`.
 * Used to distinguish already-encrypted rows from plaintext during backfill / migration.
 */
export function isEncryptedField(value: string): boolean {
    try {
        const parsed: unknown = JSON.parse(value);
        return (
            typeof parsed === 'object' &&
            parsed !== null &&
            'c' in parsed &&
            'iv' in parsed &&
            't' in parsed &&
            'k' in parsed
        );
    } catch {
        return false;
    }
}

// ─── Null-safe convenience wrappers ──────────────────────────────────────────

/**
 * Encrypt a nullable string field.
 * - Returns `null`/`undefined` unchanged.
 * - Is idempotent: already-encrypted values are returned as-is.
 * - Is a no-op when MASTER_KEY is not configured (dev without .env).
 */
export function maybeEncrypt(value: string | null | undefined): string | null | undefined {
    if (!config.masterKey) return value; // encryption disabled in dev
    if (value == null) return value;
    if (isEncryptedField(value)) return value; // already encrypted — idempotent
    return encryptField(value);
}

/**
 * Decrypt a nullable string field.
 * - Returns `null`/`undefined` unchanged.
 * - Returns plaintext as-is (backward-compatible with un-encrypted rows).
 * - Throws only on a value that parses as our JSON format but fails authentication.
 */
export function maybeDecrypt(value: string | null | undefined): string | null | undefined {
    if (value == null) return value;
    if (isEncryptedField(value)) return decryptField(value);
    return value; // plaintext (pre-backfill row or dev without MASTER_KEY)
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function getMasterKey(): Buffer {
    if (!config.masterKey) {
        throw new Error(
            'MASTER_KEY is not configured. ' +
                'Set MASTER_KEY in your .env file (generate: openssl rand -base64 32).',
        );
    }
    return Buffer.from(config.masterKey, 'base64');
}
