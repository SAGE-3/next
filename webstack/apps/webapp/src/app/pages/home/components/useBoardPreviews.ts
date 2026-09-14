/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License. The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppInfo } from './BoardPreview';

/** Coordinate homepage preview reads, including superseding refreshes. */
export function useBoardPreviews(url: string, boardIds: string[]) {
  const [boardPreviews, setBoardPreviews] = useState(new Map<string, AppInfo[]>());
  const [previewsLoading, setPreviewsLoading] = useState(false);
  const pending = useRef(new Map<string, symbol>());
  const requests = useRef(new Set<AbortController>());
  const epoch = useRef(0);

  const fetchPreviews = useCallback(
    async (ids: string[], force = false) => {
      const wanted = [...new Set(ids)].filter((id) => force || !pending.current.has(id));
      if (!wanted.length) return;
      const generation = Symbol();
      const started = epoch.current;
      wanted.forEach((id) => pending.current.set(id, generation));
      const controller = new AbortController();
      requests.current.add(controller);
      setPreviewsLoading(true);
      try {
        // Bound each request and the number of requests a single homepage issues.
        for (let offset = 0; offset < wanted.length; offset += 100) {
          if (controller.signal.aborted) break;
          const batch = wanted.slice(offset, offset + 100);
          const response = await fetch(url, {
            method: 'POST',
            credentials: 'include',
            signal: controller.signal,
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ boardIds: batch, force }),
          });
          const result = await response.json();
          if (response.ok && result.success && result.data && epoch.current === started) {
            // Resolve ownership before React runs the state updater. Only this
            // generation may publish a board's response; an older read cannot win.
            const accepted = batch.filter((id) => pending.current.get(id) === generation && Array.isArray(result.data[id]));
            setBoardPreviews((previous) => {
              const next = new Map(previous);
              accepted.forEach((id) => next.set(id, result.data[id]));
              return next;
            });
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) console.warn('Board previews could not be loaded', error);
      } finally {
        wanted.forEach((id) => {
          if (pending.current.get(id) === generation) pending.current.delete(id);
        });
        requests.current.delete(controller);
        if (epoch.current === started) setPreviewsLoading(requests.current.size > 0);
      }
    },
    [url],
  );

  useEffect(() => {
    void fetchPreviews(boardIds.filter((id) => !boardPreviews.has(id)));
  }, [boardIds, boardPreviews, fetchPreviews]);

  useEffect(
    () => () => {
      epoch.current++;
      requests.current.forEach((request) => request.abort());
      requests.current.clear();
      pending.current.clear();
    },
    [],
  );

  const refreshPreviews = useCallback(() => fetchPreviews(boardIds, true), [boardIds, fetchPreviews]);
  return { boardPreviews, previewsLoading, refreshPreviews };
}
