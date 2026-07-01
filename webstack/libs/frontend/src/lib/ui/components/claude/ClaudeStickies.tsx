/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router';

import { useAppStore, useUIStore } from '@sage3/frontend';
import { AppState } from '@sage3/applications/schema';
import { initialValues } from '@sage3/applications/initialValues';

// ---------------------------------------------------------------------------
// Headless bridge: turns live Claude Code hook events (window.claude, exposed
// by the SAGE3 desktop client) into Stickie notes laid out on the board.
//
//   UserPromptSubmit -> yellow stickie, starts a new row at the board center
//   PreToolUse       -> blue stickie placed to the right, same row
//   Stop             -> green stickie with the reply text, to the right
//
// Each new prompt drops to a fresh row below the previous one. The running
// origin / row / column offsets are remembered in `layout` across events.
// ---------------------------------------------------------------------------

type ClaudeRecent = { at: number; event: string; detail?: string; text?: string };
type ClaudeSession = { sessionId: string; recent?: ClaudeRecent[] };

const STICKIE_W = 640;
const STICKIE_H = 320;
const COL_GAP = STICKIE_W + 40; // horizontal step between stickies in a row
const ROW_GAP = STICKIE_H + 40; // vertical step between rows

export function ClaudeStickies(): JSX.Element | null {
  const createApp = useAppStore((state) => state.create);
  const { boardId, roomId } = useParams();

  // Event keys already turned into stickies (also seeds the mount-time backlog).
  const seen = useRef<Set<string>>(new Set());
  // First snapshot only primes `seen` — we don't replay history as stickies.
  const primed = useRef(false);
  // Remembered layout: column origin (row start X), current row Y, next X.
  const layout = useRef({ originX: 0, rowY: 0, x: 0, started: false });

  const placeStickie = useCallback(
    (text: string, color: string) => {
      if (!boardId || !roomId) return;
      const L = layout.current;
      createApp({
        title: 'Claude',
        roomId,
        boardId,
        position: { x: L.x, y: L.rowY, z: 0 },
        size: { width: STICKIE_W, height: STICKIE_H, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'Stickie',
        state: { ...(initialValues['Stickie'] as AppState), text, color, fontSize: 16 },
        raised: true,
        dragging: false,
        pinned: false,
      });
      L.x += COL_GAP; // next stickie in this row goes to the right
    },
    [boardId, roomId, createApp]
  );

  // Begin a new row. First row anchors on the current viewport center; later
  // rows step straight down, keeping the columns aligned into a grid.
  const startRow = useCallback(() => {
    const L = layout.current;
    if (!L.started) {
      const bx = useUIStore.getState().boardPosition.x;
      const by = useUIStore.getState().boardPosition.y;
      const scale = useUIStore.getState().scale;
      L.originX = Math.floor(-bx + window.innerWidth / scale / 2) - STICKIE_W / 2;
      L.rowY = Math.floor(-by + window.innerHeight / scale / 2) - STICKIE_H / 2;
      L.started = true;
    } else {
      L.rowY += ROW_GAP;
    }
    L.x = L.originX;
  }, []);

  const onSnapshot = useCallback(
    (sessions: ClaudeSession[]) => {
      const fresh: ClaudeRecent[] = [];
      for (const s of sessions || []) {
        for (const r of s.recent || []) {
          const key = `${s.sessionId}|${r.at}|${r.event}|${r.detail || ''}`;
          if (seen.current.has(key)) continue;
          seen.current.add(key);
          if (primed.current) fresh.push(r); // skip the mount-time backlog
        }
      }
      // First snapshot: only seed `seen`, never replay old events as stickies.
      if (!primed.current) {
        primed.current = true;
        return;
      }
      fresh.sort((a, b) => a.at - b.at);
      for (const r of fresh) {
        // Prefer the untruncated `text`; fall back to the one-line `detail`.
        const body = r.text || r.detail || '';
        switch (r.event) {
          case 'UserPromptSubmit':
            startRow();
            placeStickie(body || 'prompt', 'yellow');
            break;
          case 'PreToolUse':
            if (!layout.current.started) startRow();
            placeStickie(body ? `🔧 ${body}` : 'tool', 'blue');
            break;
          case 'PostToolUse':
            if (!layout.current.started) startRow();
            placeStickie(body ? `✓ ${body}` : 'ok', 'cyan');
            break;
          case 'PostToolUseFailure':
            if (!layout.current.started) startRow();
            placeStickie(body ? `✗ ${body}` : 'failed', 'red');
            break;
          case 'Stop':
            if (!layout.current.started) startRow();
            placeStickie(body || '(no reply text)', 'green');
            break;
          default:
            break; // other events stay in the popover feed only
        }
      }
    },
    [startRow, placeStickie]
  );

  useEffect(() => {
    const api = window.claude;
    if (!api) return undefined;
    let off: (() => void) | undefined;
    api
      .getSessions()
      .then(onSnapshot)
      .catch(() => undefined);
    off = api.onSessions(onSnapshot);
    return () => {
      if (off) off();
    };
  }, [onSnapshot]);

  return null;
}
