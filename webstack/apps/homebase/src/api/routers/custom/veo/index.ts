/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * VEO (virtualized environments orchestrator) integration.
 *
 *   settings.ts         URLs from the config, secrets from the environment
 *   client.ts           calls to VEO's API with VEO_SECRET
 *   vm-router.ts        /api/veo/vm/*        browser -> this server -> VEO (user auth)
 *   callback-router.ts  /api/veo/callback/*  VEO -> this server (per-app HMAC secret)
 *
 * The secret derivation and the per-app rules (container, allowed env, accepted
 * state) are in @sage3/backend: libs/backend/src/lib/utils/veo.
 */

export * from './vm-router';
export * from './callback-router';
