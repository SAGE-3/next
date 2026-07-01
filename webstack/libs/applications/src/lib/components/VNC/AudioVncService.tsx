/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React, { useEffect, useRef, useState } from 'react';

interface AudioVncServiceProps {
  wsUrl: string;
  enabled?: boolean;
  onConnectionChange?: (connected: boolean) => void;
}

const MIME_TYPE = 'audio/webm; codecs="opus"';
const MAX_LATENCY = 0.5;
const RECONNECT_DELAY = 2000;
const MAX_BUFFER_SECONDS = 5;
const EVICT_BYTES_THRESHOLD = 1 * 1024 * 1024;

export const AudioVncService: React.FC<AudioVncServiceProps> = ({ wsUrl, enabled = true, onConnectionChange }) => {
  const [isConnected, setIsConnected] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const queueRef = useRef<ArrayBuffer[]>([]);
  const bytesSinceEvictRef = useRef(0);
  const playStartedRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enabledRef = useRef(enabled);
  const wsUrlRef = useRef(wsUrl);

  enabledRef.current = enabled;
  wsUrlRef.current = wsUrl;

  const cleanup = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    if (sourceBufferRef.current) {
      try {
        sourceBufferRef.current.abort();
      } catch {
        // ignore
      }
      sourceBufferRef.current = null;
    }

    if (mediaSourceRef.current) {
      try {
        if (mediaSourceRef.current.readyState === 'open') {
          mediaSourceRef.current.endOfStream();
        }
      } catch {
        // ignore
      }
      mediaSourceRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }

    queueRef.current = [];
    bytesSinceEvictRef.current = 0;
    playStartedRef.current = false;
    setIsConnected(false);
    onConnectionChange?.(false);
  };

  const flushQueue = () => {
    const sb = sourceBufferRef.current;
    const ms = mediaSourceRef.current;
    if (!sb || !ms || ms.readyState !== 'open' || sb.updating) return;
    const q = queueRef.current;
    if (q.length === 0) return;

    let chunk: ArrayBuffer;
    if (q.length === 1) {
      chunk = q.shift()!;
    } else {
      let totalLen = 0;
      for (let i = 0; i < q.length; i++) totalLen += q[i].byteLength;
      const merged = new Uint8Array(totalLen);
      let offset = 0;
      for (let i = 0; i < q.length; i++) {
        merged.set(new Uint8Array(q[i]), offset);
        offset += q[i].byteLength;
      }
      q.length = 0;
      chunk = merged.buffer;
    }

    // Proactive eviction before we get anywhere near the browser's quota
    if (bytesSinceEvictRef.current + chunk.byteLength > EVICT_BYTES_THRESHOLD && sb.buffered.length > 0 && !sb.updating) {
      q.unshift(chunk);
      evictBuffered();
      return;
    }

    try {
      sb.appendBuffer(chunk);
      bytesSinceEvictRef.current += chunk.byteLength;
    } catch (e) {
      if ((e as DOMException)?.name === 'QuotaExceededError') {
        q.unshift(chunk);
        evictBuffered();
      } else {
        console.warn('[audio] appendBuffer error:', e);
      }
    }
  };

  const evictBuffered = () => {
    console.log('[audio]: buffer clear');
    const sb = sourceBufferRef.current;
    const audio = audioRef.current;
    if (!sb || sb.updating || sb.buffered.length === 0) return;
    const start = sb.buffered.start(0);
    const end = sb.buffered.end(sb.buffered.length - 1);
    // Keep the most recent second; jump playhead forward if needed
    const removeEnd = Math.max(start, end - 1);
    if (removeEnd <= start) return;
    try {
      sb.remove(start, removeEnd);
      bytesSinceEvictRef.current = 0;
      if (audio && audio.currentTime < removeEnd) {
        audio.currentTime = removeEnd;
      }
    } catch {
      // ignore
    }
  };

  const onUpdateEnd = () => {
    const audio = audioRef.current;
    const sb = sourceBufferRef.current;

    // Start playback once we have buffered data
    if (audio && sb && !playStartedRef.current && sb.buffered.length > 0) {
      playStartedRef.current = true;
      audio.currentTime = sb.buffered.start(0);
      audio.play().catch(() => {
        playStartedRef.current = false;
      });
    }

    // Drift correction
    if (audio && sb && !audio.paused && sb.buffered.length > 0) {
      const liveEdge = sb.buffered.end(sb.buffered.length - 1);
      const latency = liveEdge - audio.currentTime;
      if (latency > MAX_LATENCY) {
        console.log(`[audio] drift correction: ${(latency * 1000).toFixed(0)}ms behind`);
        audio.currentTime = liveEdge - 0.05;
      }
    }

    // Trim old data — reference live edge so this works even before playback starts
    if (sb && !sb.updating && sb.buffered.length > 0) {
      const start = sb.buffered.start(0);
      const liveEdge = sb.buffered.end(sb.buffered.length - 1);
      const ref = audio && playStartedRef.current ? audio.currentTime : liveEdge;
      const removeEnd = ref - MAX_BUFFER_SECONDS;
      if (removeEnd > start) {
        try {
          sb.remove(start, removeEnd);
          return; // remove triggers another updateend, flush then
        } catch {
          // ignore
        }
      }
    }

    flushQueue();
  };

  const connectAudio = () => {
    if (!enabledRef.current || !wsUrlRef.current) return;
    if (!MediaSource.isTypeSupported(MIME_TYPE)) return;

    cleanup();

    const mediaSource = new MediaSource();
    mediaSourceRef.current = mediaSource;

    const audio = new Audio();
    audioRef.current = audio;

    const onOpen = () => {
      if (mediaSource.readyState !== 'open') return;
      const sb = mediaSource.addSourceBuffer(MIME_TYPE);
      sourceBufferRef.current = sb;
      sb.addEventListener('updateend', onUpdateEnd);

      const ws = new WebSocket(wsUrlRef.current);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        onConnectionChange?.(true);
      };

      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          queueRef.current.push(event.data);
          flushQueue();
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        onConnectionChange?.(false);
        scheduleReconnect();
      };

      ws.onerror = () => {
        setIsConnected(false);
        onConnectionChange?.(false);
      };
    };

    mediaSource.addEventListener('sourceopen', onOpen);
    audio.src = URL.createObjectURL(mediaSource);
  };

  const scheduleReconnect = () => {
    if (!enabledRef.current || !wsUrlRef.current) return;
    if (reconnectTimerRef.current) return;
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      connectAudio();
    }, RECONNECT_DELAY);
  };

  useEffect(() => {
    if (enabled && wsUrl) {
      connectAudio();
    } else {
      cleanup();
    }

    return () => {
      cleanup();
    };
  }, [wsUrl, enabled]);

  return null;
};
