/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import express from 'express';
import { SBCredentialsDB, SBAuthSchema, CredentialType } from '@sage3/sagebase';

const VALID_TYPES: CredentialType[] = ['secretText', 'usernamePassword', 'sshPrivateKey'];

// Each type's required value fields, mirroring the CredentialValue union in
// credentialCrypto.ts. Not imported from there directly — that union has no
// runtime representation to validate against, so the field lists live here,
// next to the one place they're actually checked.
const REQUIRED_VALUE_FIELDS: Record<CredentialType, string[]> = {
  secretText: ['secret'],
  usernamePassword: ['username', 'password'],
  sshPrivateKey: ['username', 'privateKey'],
};

function validateCreateBody(body: unknown): string | null {
  const { name, type, value } = (body ?? {}) as { name?: unknown; type?: unknown; value?: unknown };
  if (!name || typeof name !== 'string') return 'name is required';
  if (!VALID_TYPES.includes(type as CredentialType)) return `type must be one of ${VALID_TYPES.join(', ')}`;
  if (!value || typeof value !== 'object') return 'value is required';
  const missing = REQUIRED_VALUE_FIELDS[type as CredentialType].filter((field) => !(value as Record<string, unknown>)[field]);
  if (missing.length > 0) return `value.${missing[0]} is required for type ${type}`;
  return null;
}

export function CredentialsRouter(): express.Router {
  const router = express.Router();
  // apps/homebase's global middleware already includes express.json()
  // (apps/homebase/src/web/http-server.ts:73), so this is redundant in
  // production — kept anyway so this router stays self-sufficient and
  // testable in isolation without depending on the global setup never
  // changing.
  router.use(express.json());

  router.post('/', async (req, res) => {
    const user = req.user as SBAuthSchema;
    const validationError = validateCreateBody(req.body);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }
    const { name, type, value } = req.body;
    try {
      const result = await SBCredentialsDB.createOrUpdate(user.id, type, name, value);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to save credential' });
    }
  });

  router.get('/', async (req, res) => {
    const user = req.user as SBAuthSchema;
    const type = req.query.type as CredentialType | undefined;
    const result = await SBCredentialsDB.list(user.id, type);
    res.status(200).json(result);
  });

  router.put('/:id', async (req, res) => {
    const user = req.user as SBAuthSchema;
    const result = await SBCredentialsDB.updateValue(req.params.id, user.id, req.body.value);
    if (!result) {
      res.status(404).json({ error: 'Credential not found' });
      return;
    }
    res.status(200).json(result);
  });

  router.delete('/:id', async (req, res) => {
    const user = req.user as SBAuthSchema;
    const deleted = await SBCredentialsDB.delete(req.params.id, user.id);
    if (!deleted) {
      res.status(404).json({ error: 'Credential not found' });
      return;
    }
    res.status(200).json({ success: true });
  });

  return router;
}
