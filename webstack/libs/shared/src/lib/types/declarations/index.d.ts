/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

namespace Express {
  interface Request {
    user: import('@sage3/sagebase').SBAuthSchema;
    files?: Array<{ originalname: string; mimetype: string; filename: string; size: number }>;
  }
}

// type extension for http request
declare module 'http' {
  interface IncomingMessage {
    user: import('@sage3/sagebase').SBAuthSchema;
    session: any;
    res?: any;
  }
}

declare module '*.svg' {
  const content: any;
  export default content;
}

// Stylesheets are handled by webpack; declare them so TypeScript 6's
// noUncheckedSideEffectImports check accepts `import './styles.css'`.
declare module '*.css';
declare module '*.scss';

// Trick to make electron available in the window object
import { Electron } from 'electron';
declare global {
  interface Window {
    electron: Electron;
  }
}
