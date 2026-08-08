/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import {
  deriveEncryptionKey,
  encryptCredentialValue,
  decryptCredentialValue,
  CredentialDecryptionError,
  CredentialValue,
} from './credentialCrypto';

describe('credentialCrypto', () => {
  const key = deriveEncryptionKey('test-secrets-encryption-key-not-for-real-use');

  it('round-trips a secretText value', () => {
    const value: CredentialValue = { type: 'secretText', secret: 'ctfd_abc123' };
    const encrypted = encryptCredentialValue(key, value);
    expect(decryptCredentialValue(key, encrypted)).toEqual(value);
  });

  it('never exposes the plaintext secret anywhere in the encrypted payload', () => {
    const value: CredentialValue = { type: 'secretText', secret: 'super-secret-token-xyz' };
    const encrypted = encryptCredentialValue(key, value);
    // Serialize the whole payload (iv, authTag, ciphertext, ...) and confirm the
    // raw secret never leaks into it in cleartext.
    expect(JSON.stringify(encrypted)).not.toContain('super-secret-token-xyz');
  });

  it('round-trips a usernamePassword value', () => {
    const value: CredentialValue = { type: 'usernamePassword', username: 'svc-account', password: 'hunter2' };
    const encrypted = encryptCredentialValue(key, value);
    expect(decryptCredentialValue(key, encrypted)).toEqual(value);
  });

  it('round-trips an sshPrivateKey value, with and without a passphrase', () => {
    const withPassphrase: CredentialValue = {
      type: 'sshPrivateKey',
      username: 'deploy',
      privateKey: '-----BEGIN OPENSSH PRIVATE KEY-----\nabc\n-----END OPENSSH PRIVATE KEY-----',
      passphrase: 'correct-horse-battery-staple',
    };
    expect(decryptCredentialValue(key, encryptCredentialValue(key, withPassphrase))).toEqual(withPassphrase);

    const withoutPassphrase: CredentialValue = {
      type: 'sshPrivateKey',
      username: 'deploy',
      privateKey: '-----BEGIN OPENSSH PRIVATE KEY-----\nabc\n-----END OPENSSH PRIVATE KEY-----',
    };
    expect(decryptCredentialValue(key, encryptCredentialValue(key, withoutPassphrase))).toEqual(withoutPassphrase);
  });

  it('produces a different ciphertext each time (random IV), even for the same input', () => {
    const value: CredentialValue = { type: 'secretText', secret: 'same-secret' };
    const first = encryptCredentialValue(key, value);
    const second = encryptCredentialValue(key, value);
    expect(first).not.toBe(second);
    // Both still decrypt to the same plaintext.
    expect(decryptCredentialValue(key, first)).toEqual(value);
    expect(decryptCredentialValue(key, second)).toEqual(value);
  });

  it('throws CredentialDecryptionError when decrypting with the wrong key', () => {
    const value: CredentialValue = { type: 'secretText', secret: 'ctfd_abc123' };
    const encrypted = encryptCredentialValue(key, value);
    const wrongKey = deriveEncryptionKey('a-completely-different-key');
    expect(() => decryptCredentialValue(wrongKey, encrypted)).toThrow(CredentialDecryptionError);
  });

  it('throws CredentialDecryptionError when the ciphertext has been tampered with', () => {
    const value: CredentialValue = { type: 'secretText', secret: 'ctfd_abc123' };
    const encrypted = encryptCredentialValue(key, value);
    // Flip one character in the base64 payload — GCM's auth tag must catch this
    // rather than silently decrypting to garbage.
    const tampered = encrypted.slice(0, -4) + (encrypted.slice(-4) === 'AAAA' ? 'BBBB' : 'AAAA');
    expect(() => decryptCredentialValue(key, tampered)).toThrow(CredentialDecryptionError);
  });

  it('deriveEncryptionKey is deterministic for the same input secret', () => {
    const keyA = deriveEncryptionKey('some-secret');
    const keyB = deriveEncryptionKey('some-secret');
    expect(keyA.equals(keyB)).toBe(true);
  });
});
