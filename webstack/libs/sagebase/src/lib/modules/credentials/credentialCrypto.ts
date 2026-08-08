/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as crypto from 'crypto';

export type CredentialType = 'secretText' | 'usernamePassword' | 'sshPrivateKey';

// The plaintext shape saved for each type — never returned to the client
// after creation, only ever passed to encryptCredentialValue()/decrypted
// internally by a first-party integration handler.
export type CredentialValue =
  | { type: 'secretText'; secret: string }
  | { type: 'usernamePassword'; username: string; password: string }
  | { type: 'sshPrivateKey'; username: string; privateKey: string; passphrase?: string };

export class CredentialDecryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CredentialDecryptionError';
  }
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
// Fixed salt is intentional: the input to scrypt here (secretsEncryptionKey)
// is already a high-entropy server secret, not a low-entropy user password
// that needs per-use salting to defend against rainbow tables.
const KDF_SALT = 'sage3-credentials-store-v1';

/**
 * Derives a 32-byte AES-256 key from the server's secretsEncryptionKey
 * config value. Deterministic: the same input always yields the same key,
 * so existing encrypted credentials stay decryptable across restarts.
 */
export function deriveEncryptionKey(secret: string): Buffer {
  return crypto.scryptSync(secret, KDF_SALT, 32);
}

/**
 * Encrypts a CredentialValue into a single base64 string: a random 12-byte
 * IV, followed by the 16-byte GCM auth tag, followed by the ciphertext.
 */
export function encryptCredentialValue(key: Buffer, value: CredentialValue): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

/**
 * Decrypts a string produced by encryptCredentialValue(). Throws
 * CredentialDecryptionError (never a raw Node crypto error) if the key is
 * wrong or the ciphertext has been corrupted/tampered with — GCM's auth
 * tag check fails loudly rather than silently returning garbage.
 */
export function decryptCredentialValue(key: Buffer, encrypted: string): CredentialValue {
  try {
    const data = Buffer.from(encrypted, 'base64');
    const iv = data.subarray(0, IV_LENGTH);
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(plaintext.toString('utf8')) as CredentialValue;
  } catch (error) {
    throw new CredentialDecryptionError(
      `Failed to decrypt credential value: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
