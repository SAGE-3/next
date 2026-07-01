/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Flex,
  IconButton,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import { LuBot } from 'react-icons/lu';

// ---------------------------------------------------------------------------
// Bridge types. The SAGE3 Electron client exposes the Claude Code monitor over
// `window.claude` (see clients/electron/preload.js). In a plain browser the
// bridge is absent, so every access is guarded.
// ---------------------------------------------------------------------------

type ClaudeRecent = { at: number; event: string; detail?: string };

type ClaudeSession = {
  sessionId: string;
  cwd?: string;
  status?: string;
  recent?: ClaudeRecent[];
};

type ClaudeBridge = {
  getSessions: () => Promise<ClaudeSession[]>;
  onSessions: (cb: (sessions: ClaudeSession[]) => void) => () => void;
};

declare global {
  interface Window {
    claude?: ClaudeBridge;
  }
}

// One flattened, display-ready activity-log line.
type FeedRow = { key: string; at: number; tag: string; event: string; detail?: string };

// ---------------------------------------------------------------------------
// Event -> { label, color }. Keyed by the RAW hook event names the SAGE3
// session-store records in recent[] (PreToolUse, Stop, …) — these differ from
// the synthetic names used by the standalone claude-code-monitor.
// ---------------------------------------------------------------------------

const CAT = {
  run: '#4cc9f0',
  ok: '#5fd39a',
  error: '#ff6b6b',
  prompt: '#b794f6',
  attention: '#ffb454',
  life: '#7b8496',
  agent: '#8aa0ff',
  task: '#2dd4bf',
  warn: '#f0883e',
  neutral: '#6e7686',
} as const;

const META: Record<string, { label: string; color: string }> = {
  UserPromptSubmit: { label: 'prompt', color: CAT.prompt },
  PreToolUse: { label: 'tool', color: CAT.run },
  PostToolUse: { label: 'ok', color: CAT.ok },
  PostToolUseFailure: { label: 'tool failed', color: CAT.error },
  PermissionRequest: { label: 'permission', color: CAT.attention },
  Notification: { label: 'notify', color: CAT.attention },
  Stop: { label: 'stop', color: CAT.life },
  StopFailure: { label: 'stop failed', color: CAT.error },
  SessionStart: { label: 'session', color: CAT.life },
  SessionEnd: { label: 'session end', color: CAT.life },
  SubagentStart: { label: 'subagent', color: CAT.agent },
  SubagentStop: { label: 'subagent end', color: CAT.agent },
  TaskCreated: { label: 'task +', color: CAT.task },
  TaskCompleted: { label: 'task done', color: CAT.task },
  PreCompact: { label: 'compact', color: CAT.warn },
};

const metaFor = (event: string) => META[event] || { label: event, color: CAT.neutral };
const fmtTime = (ms: number) => new Date(ms).toTimeString().slice(0, 8);
const sessionTag = (s: ClaudeSession) => (s.cwd ? s.cwd.split(/[\\/]/).pop() || s.sessionId : String(s.sessionId).slice(0, 8));

const MAX_ROWS = 500;

interface ClaudeIconProps {
  iconSize?: 'xs' | 'sm' | 'md';
}

// Popover open state persisted across mounts (mirrors PartyButton).
let popoverOpen = false;

/**
 * ClaudeButton: button that opens a popover showing the live Claude Code
 * activity feed, styled like the standalone claude-code-monitor.
 */
export function ClaudeButton(props: ClaudeIconProps): JSX.Element {
  const { isOpen, onToggle, onClose, onOpen } = useDisclosure();

  useEffect(() => {
    if (popoverOpen) onOpen();
  }, [onOpen]);

  const handleOnToggle = () => {
    popoverOpen = !isOpen;
    onToggle();
  };
  const handleOnClose = () => {
    popoverOpen = false;
    onClose();
  };

  const iconSize = props.iconSize || 'md';
  const fontSize = iconSize === 'xs' ? 'sm' : iconSize === 'sm' ? 'md' : 'lg';

  return (
    <Popover isOpen={isOpen} onClose={handleOnClose} closeOnBlur={false} closeOnEsc>
      <PopoverTrigger>
        <Box position="relative">
          <IconButton
            onClick={handleOnToggle}
            size={iconSize}
            fontSize={fontSize}
            colorScheme="orange"
            icon={<LuBot fontSize="24px" />}
            aria-label="Claude activity"
          />
        </Box>
      </PopoverTrigger>
      <PopoverContent w="560px" h="500px" mr="2">
        <PopoverArrow />
        <PopoverCloseButton onClick={handleOnClose} />
        <PopoverHeader>
          <Flex align="center" gap={2}>
            <LuBot fontSize="20px" />
            <Text>Claude Code activity</Text>
          </Flex>
        </PopoverHeader>
        <PopoverBody h="455px" p={0}>
          <ClaudeFeed />
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}

/**
 * ClaudeFeed: subscribes to window.claude and renders a time-ordered feed of
 * activity-log rows flattened from every session's recent[] buffer.
 */
function ClaudeFeed(): JSX.Element {
  const [rows, setRows] = useState<FeedRow[]>([]);
  const [bridgeMissing, setBridgeMissing] = useState(false);
  const seen = useRef<Set<string>>(new Set());
  const feedRef = useRef<HTMLDivElement | null>(null);

  // Fold a snapshot's new recent[] entries into the feed, time-ordered & capped.
  const onSnapshot = useCallback((sessions: ClaudeSession[]) => {
    const fresh: FeedRow[] = [];
    for (const s of sessions || []) {
      const tag = sessionTag(s);
      for (const r of s.recent || []) {
        const key = `${s.sessionId}|${r.at}|${r.event}|${r.detail || ''}`;
        if (seen.current.has(key)) continue;
        seen.current.add(key);
        fresh.push({ key, at: r.at, tag, event: r.event, detail: r.detail });
      }
    }
    if (!fresh.length) return;
    setRows((prev) => {
      const merged = [...prev, ...fresh].sort((a, b) => a.at - b.at);
      return merged.length > MAX_ROWS ? merged.slice(merged.length - MAX_ROWS) : merged;
    });
  }, []);

  useEffect(() => {
    const api = window.claude;
    if (!api) {
      setBridgeMissing(true);
      return;
    }
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

  // Keep the newest line in view.
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [rows]);

  const clear = () => {
    // Keep `seen` so cleared lines don't reappear on the next snapshot.
    setRows([]);
  };

  return (
    <Flex direction="column" h="100%" bg="#14161b" color="#cdd2dc" borderBottomRadius="md" overflow="hidden">
      <Flex align="center" px={3} py={2} borderBottom="1px solid #262a33" flex="0 0 auto" gap={3}>
        <Box w="8px" h="8px" borderRadius="full" bg={CAT.ok} />
        <Text fontSize="10px" letterSpacing="0.14em" textTransform="uppercase" color="#6e7686" mr="auto">
          live
        </Text>
        <Text fontSize="12px" color="#6e7686">
          <b style={{ color: '#cdd2dc' }}>{rows.length}</b> events
        </Text>
        <Box
          as="button"
          onClick={clear}
          fontSize="11px"
          color="#6e7686"
          border="1px solid #262a33"
          borderRadius="6px"
          px={2}
          py={1}
          _hover={{ color: '#cdd2dc', borderColor: '#39404d' }}
        >
          Clear
        </Box>
      </Flex>

      <Box
        ref={feedRef}
        flex="1 1 auto"
        minH={0}
        overflowY="auto"
        py={1}
        fontFamily='ui-monospace, "SF Mono", Menlo, Consolas, monospace'
        fontSize="12px"
        lineHeight="1.5"
      >
        {rows.length === 0 ? (
          <Flex align="center" justify="center" h="100%" color="#6e7686" fontSize="12px">
            {bridgeMissing ? 'window.claude not found — run inside the SAGE3 desktop client.' : 'Waiting for activity…'}
          </Flex>
        ) : (
          rows.map((row) => {
            const m = metaFor(row.event);
            return (
              <Box
                key={row.key}
                display="grid"
                gridTemplateColumns="68px 120px 92px 1fr"
                gap={3}
                alignItems="baseline"
                px={3}
                py="2px"
                borderLeft={`2px solid ${m.color}`}
                title={row.event}
              >
                <Text color="#6e7686" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {fmtTime(row.at)}
                </Text>
                <Text color="#9aa3b2" isTruncated>
                  {row.tag}
                </Text>
                <Text color={m.color}>{m.label}</Text>
                <Text color="#cdd2dc" wordBreak="break-word">
                  {row.detail || ''}
                </Text>
              </Box>
            );
          })
        )}
      </Box>
    </Flex>
  );
}
