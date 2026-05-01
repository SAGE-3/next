/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { App, AppState } from '@sage3/applications/schema';

const seerPreviewFieldsByType: Record<string, string[]> = {
  AssetLink: ['assetid'],
  BoardLink: ['url', 'cardTitle'],
  Calculator: ['input', 'history'],
  Chat: ['context', 'firstQuestion', 'messageCount'],
  Clock: ['city', 'timeZone', 'is24Hour', 'color'],
  CoBrowser: ['nonOwnerViewOnly', 'audio'],
  CodeEditor: ['content', 'language', 'fontSize', 'readonly', 'filename'],
  CSVViewer: ['assetid'],
  DeepZoomImage: ['assetid', 'zoomLevel', 'zoomCenter'],
  Drawing: ['fit', 'follow', 'camera'],
  ImageViewer: ['assetid', 'annotations', 'boxCount'],
  Map: ['location', 'zoom', 'bearing', 'pitch', 'baseLayer', 'layers', 'assetid'],
  Notepad: ['content'],
  PDFViewer: ['assetid', 'currentPage', 'displayPages', 'numPages'],
  Poll: ['poll'],
  SageCell: ['code', 'language', 'fontSize'],
  Screenshare: ['aspectRatio'],
  Stickie: ['text', 'fontSize', 'color', 'lock', 'sources'],
  Timer: ['originalTotal', 'total', 'isRunning'],
  VideoViewer: ['assetid', 'currentTime', 'paused', 'loop'],
  WebpageLink: ['url', 'streaming'],
  Webview: ['webviewurl', 'zoom'],
};

const stringPreviewLimits: Record<string, number> = {
  text: 280,
  content: 600,
  code: 600,
  input: 200,
  history: 400,
};

// Collaborative full-replace actions target the live Yjs text for these apps.
export const seerYjsReplaceFieldByType: Record<string, string> = {
  Stickie: 'text',
  CodeEditor: 'content',
  SageCell: 'code',
};

function truncateSeerValue(key: string, value: unknown) {
  const limit = stringPreviewLimits[key];
  return typeof value === 'string' && limit ? value.slice(0, limit) : value;
}

function flattenNotepadContent(content: unknown) {
  if (!content || typeof content !== 'object' || !Array.isArray((content as { ops?: unknown[] }).ops)) {
    return '';
  }

  return ((content as { ops: unknown[] }).ops || [])
    .map((op) => {
      if (op && typeof op === 'object' && typeof (op as { insert?: unknown }).insert === 'string') {
        return (op as { insert: string }).insert;
      }
      return '';
    })
    .join('')
    .trim();
}

function summarizePoll(poll: unknown) {
  if (!poll || typeof poll !== 'object') return undefined;

  const rawOptions = Array.isArray((poll as { options?: unknown[] }).options) ? (poll as { options: unknown[] }).options : [];
  const options = rawOptions
    .map((option) => {
      if (option && typeof option === 'object' && typeof (option as { option?: unknown }).option === 'string') {
        return (option as { option: string }).option;
      }
      return null;
    })
    .filter((option): option is string => Boolean(option))
    .slice(0, 8);

  return {
    question: typeof (poll as { question?: unknown }).question === 'string' ? (poll as { question: string }).question : '',
    options,
    optionCount: rawOptions.length,
  };
}

function summarizeMapLayers(layers: unknown) {
  if (!Array.isArray(layers)) return [];

  return layers
    .filter((layer) => layer && typeof layer === 'object')
    .slice(0, 8)
    .map((layer) => {
      const source = layer as Record<string, unknown>;
      return {
        assetId: source.assetId,
        visible: Boolean(source.visible),
        color: source.color,
        colorScale: source.colorScale,
        opacity: source.opacity,
      };
    });
}

function normalizeSeerPreviewSource(appType: string, source: Record<string, any>) {
  const normalized = { ...source };

  switch (appType) {
    case 'Chat':
      normalized.messageCount = Array.isArray(source.messages) ? source.messages.length : 0;
      break;
    case 'ImageViewer':
      normalized.boxCount = Array.isArray(source.boxes) ? source.boxes.length : 0;
      break;
    case 'Map':
      normalized.layers = summarizeMapLayers(source.layers);
      break;
    case 'Notepad':
      normalized.content = flattenNotepadContent(source.content);
      break;
    case 'Poll': {
      const pollSummary = summarizePoll(source.poll);
      if (pollSummary) {
        normalized.poll = pollSummary;
      }
      break;
    }
    default:
      break;
  }

  return normalized;
}

export function buildSeerStatePreview(appType: string, state: AppState | Record<string, any> | undefined) {
  if (!state || typeof state !== 'object') return undefined;

  const fields = seerPreviewFieldsByType[appType];
  if (!fields) return undefined;

  const source = normalizeSeerPreviewSource(appType, state as Record<string, any>);
  const preview: Record<string, any> = {};

  for (const key of fields) {
    if (!(key in source)) continue;
    preview[key] = truncateSeerValue(key, source[key]);
  }

  return Object.keys(preview).length > 0 ? preview : undefined;
}

export function buildSeerCurrentBoardAppsSnapshot(apps: App[]) {
  return apps.map((app) => ({
    id: app._id,
    roomId: app.data.roomId,
    boardId: app.data.boardId,
    title: app.data.title || '',
    type: app.data.type,
    position: {
      x: app.data.position.x,
      y: app.data.position.y,
      z: app.data.position.z,
    },
    size: {
      width: app.data.size.width,
      height: app.data.size.height,
      depth: app.data.size.depth,
    },
    statePreview: buildSeerStatePreview(app.data.type, app.data.state),
  }));
}

export function getSeerScopeLabel(apps: App[], selectedAppIds: string[], focusedAppId?: string, selectedAppId?: string) {
  if (selectedAppIds.length > 0) {
    if (selectedAppIds.length === 1) {
      const selected = apps.find((app) => app._id === selectedAppIds[0]);
      return selected ? `Selection: ${selected.data.title || selected.data.type}` : 'Selection: 1 app';
    }
    return `Selection: ${selectedAppIds.length} apps`;
  }

  const focusedId = focusedAppId || selectedAppId;
  if (focusedId) {
    const focused = apps.find((app) => app._id === focusedId);
    return focused ? `Focused: ${focused.data.title || focused.data.type}` : 'Focused app';
  }

  return 'Scope: Current board';
}

export function pluralizeSeerCount(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

export function summarizeSeerPlannedActions(actions: any[]) {
  const updates = actions.filter((action) => action?.type === 'update_app').length;
  const replacements = actions.filter((action) => action?.type === 'replace_yjs_content').length;
  const creations = new Map<string, number>();

  actions.forEach((action) => {
    if (action?.type !== 'create_app') return;
    const key = action.app || 'App';
    creations.set(key, (creations.get(key) || 0) + 1);
  });

  const parts: string[] = [];
  if (updates > 0) {
    parts.push(`${updates} ${updates === 1 ? 'app update' : 'app updates'}`);
  }

  if (replacements > 0) {
    parts.push(`${replacements} ${replacements === 1 ? 'collaborative replace' : 'collaborative replaces'}`);
  }

  creations.forEach((count, appName) => {
    parts.push(`${count} new ${count === 1 ? appName : `${appName}s`}`);
  });

  return parts.length > 0 ? parts : [`${actions.length} ${actions.length === 1 ? 'planned change' : 'planned changes'}`];
}

export function summarizeSeerAppliedActions(actions: any[]) {
  // Bulk apply should emit one compact toast instead of one notification per action.
  const updates = actions.filter((action) => action?.type === 'update_app' || action?.type === 'replace_yjs_content').length;
  const creations = actions.filter((action) => action?.type === 'create_app').length;
  const total = updates + creations;

  if (total === 0) {
    return 'No changes applied.';
  }

  if (updates > 0 && creations === 0) {
    return `Updated ${updates} ${pluralizeSeerCount(updates, 'app')}.`;
  }

  if (creations > 0 && updates === 0) {
    return `Created ${creations} ${pluralizeSeerCount(creations, 'app')}.`;
  }

  return `Applied ${total} ${pluralizeSeerCount(total, 'change')} (${updates} ${pluralizeSeerCount(updates, 'update')}, ${creations} new ${pluralizeSeerCount(creations, 'app')}).`;
}

export function seerResponseToStickieText(content: string) {
  // Convert the most common markdown patterns into plain text so stickies stay readable.
  return content
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, '').trim())
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~`]/g, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
