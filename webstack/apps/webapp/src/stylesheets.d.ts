/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Stylesheets are handled by webpack; declare them so TypeScript 6's
// noUncheckedSideEffectImports check accepts `import './styles.css'`.
// (*.module.css stays typed via @nx/react/typings/cssmodule.d.ts, which is
// more specific and takes precedence.)
declare module '*.css';
declare module '*.scss';
