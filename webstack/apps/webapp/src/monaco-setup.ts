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
 * The editor/language workers are emitted and wired by
 * monaco-editor-webpack-plugin (see webpack.config.js).
 */
import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';

loader.config({ monaco });
