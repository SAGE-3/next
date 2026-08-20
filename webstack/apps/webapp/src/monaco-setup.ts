/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Serve the Monaco editor from the app bundle instead of the default CDN
 * (@monaco-editor/react loads from cdn.jsdelivr.net unless configured).
 * Bundling keeps CodeEditor/SageCell working under the app's CSP
 * (script-src 'self'), offline, and independent of CDN availability.
 */
import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string): Worker {
    switch (label) {
      case 'json':
        return new Worker(new URL('monaco-editor/esm/vs/language/json/json.worker.js', import.meta.url));
      case 'css':
      case 'scss':
      case 'less':
        return new Worker(new URL('monaco-editor/esm/vs/language/css/css.worker.js', import.meta.url));
      case 'html':
        return new Worker(new URL('monaco-editor/esm/vs/language/html/html.worker.js', import.meta.url));
      case 'typescript':
      case 'javascript':
        return new Worker(new URL('monaco-editor/esm/vs/language/typescript/ts.worker.js', import.meta.url));
      default:
        return new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url));
    }
  },
};

loader.config({ monaco });
