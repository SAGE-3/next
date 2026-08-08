/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 * Ambient side-effect import so `expect(...).toBeInTheDocument()` and other
 * @testing-library/jest-dom matchers type-check in this lib's spec files.
 * This repo's tsconfig.base.json sets an explicit `typeRoots`, which limits
 * automatic `types` array resolution to those roots only — so
 * `@testing-library/jest-dom` (not published under `@types/*`) can't be
 * picked up via the `types` compiler option. Importing it here for its
 * side-effecting `declare global` block works regardless of `typeRoots`,
 * since it goes through normal module resolution instead.
 */
import '@testing-library/jest-dom';
