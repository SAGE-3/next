/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import rateLimit from 'express-rate-limit';

/**
 * Per-client-IP rate limiter for sensitive routes (logins, uploads,
 * destructive operations). Both servers run behind Traefik with
 * 'trust proxy' enabled, so req.ip is the real client address from
 * X-Forwarded-For.
 *
 * @param windowMinutes length of the sliding window
 * @param limit maximum requests per client IP within the window
 */
export function createRateLimiter(windowMinutes: number, limit: number) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // 'trust proxy' is intentionally permissive: Traefik is the single
    // ingress in production (the only published port), so X-Forwarded-For
    // cannot be spoofed from outside. Silence the library's warning.
    validate: { trustProxy: false },
    message: { success: false, message: 'Too many requests, please try again later.' },
  });
}
