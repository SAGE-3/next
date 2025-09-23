/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useMemo } from 'react';

import { useLinkStore, useThrottleApps, useUIStore, useUserSettings } from '@sage3/frontend';
import { LinksArrows } from './LinkArrows';
import { Link } from '@sage3/shared/types';

export function Links() {
  // UI state
  const selectedApps = useUIStore((s) => s.selectedAppsIds);
  const selectedAppId = useUIStore((s) => s.selectedAppId);
  const candidates = selectedAppId ? [selectedAppId] : selectedApps;
  const { settings } = useUserSettings();
  const { showLinks, primaryActionMode, showUI } = settings;

  // All links from the store
  const links = useLinkStore((s) => s.links);
  

  // Compute full‐depth path apps once, whenever links or selection changes
  const pathAppIds = useMemo(() => {
    if (showLinks !== 'selected-path' || candidates.length === 0) {
      return new Set<string>();
    }
    // 1) build adjacency
    const adj = new Map<string, string[]>();
    for (const link of links) {
      const { sourceAppId, targetAppId } = link.data;
      adj.set(sourceAppId, [...(adj.get(sourceAppId) || []), targetAppId]);
      adj.set(targetAppId, [...(adj.get(targetAppId) || []), sourceAppId]);
    }
    // 2) BFS from each candidate
    const visited = new Set(candidates);
    const queue = [...candidates];
    while (queue.length) {
      const appId = queue.shift()!;
      for (const neigh of adj.get(appId) || []) {
        if (!visited.has(neigh)) {
          visited.add(neigh);
          queue.push(neigh);
        }
      }
    }
    return visited;
  }, [links, candidates, showLinks]);

  // Filter logic
  function filterLinksToDraw(link: Link) {
    const { sourceAppId, targetAppId } = link.data;
    if (showUI && primaryActionMode === 'linker') {
      return true;
    }

    switch (showUI && showLinks) {
      case 'all':
        return true;
      case 'selected':
        return candidates.includes(sourceAppId) || candidates.includes(targetAppId);
      case 'selected-path':
        // Only draw links where both ends are in the reachable set
        return pathAppIds.has(sourceAppId) && pathAppIds.has(targetAppId);
      case 'none':
      default:
        return false;
    }
  }

  return showUI ? <LinksArrows links={links.filter(filterLinksToDraw)} /> : null;
}
