/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 * Test-only helper: the real route logic (apps/homebase/src/api/routers/
 * custom/credentials.ts) is written against the module-level SBCredentialsDB
 * singleton, which the real server always uses. This helper builds an
 * identical router against an explicitly-injected SBCredentialsDatabase
 * instance, so this integration test can point it at a fresh, isolated
 * Redis prefix per test run without touching the singleton.
 */

import express from 'express';
import { SBCredentialsDatabase, SBAuthSchema, CredentialType } from '@sage3/sagebase';

const VALID_TYPES: CredentialType[] = ['secretText', 'usernamePassword', 'sshPrivateKey'];

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

export function CredentialsRouter(db: SBCredentialsDatabase): express.Router {
  const router = express.Router();
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
      const result = await db.createOrUpdate(user.id, type, name, value);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to save credential' });
    }
  });

  router.get('/', async (req, res) => {
    const user = req.user as SBAuthSchema;
    const type = req.query.type as CredentialType | undefined;
    const result = await db.list(user.id, type);
    res.status(200).json(result);
  });

  router.put('/:id', async (req, res) => {
    const user = req.user as SBAuthSchema;
    const result = await db.updateValue(req.params.id, user.id, req.body.value);
    if (!result) {
      res.status(404).json({ error: 'Credential not found' });
      return;
    }
    res.status(200).json(result);
  });

  router.delete('/:id', async (req, res) => {
    const user = req.user as SBAuthSchema;
    const deleted = await db.delete(req.params.id, user.id);
    if (!deleted) {
      res.status(404).json({ error: 'Credential not found' });
      return;
    }
    res.status(200).json({ success: true });
  });

  return router;
}
