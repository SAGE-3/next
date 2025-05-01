/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React, { useEffect, useMemo, useState } from 'react';

import { useToast } from '@chakra-ui/react';

import type { App } from '@sage3/applications/schema';
import { getAllowedLinkTypes } from '@sage3/applications/apps';
import { useHexColor, useLinkStore, useThrottleApps, useUIStore } from '@sage3/frontend';

/**
 * Simple Linker overlay:
 * 1. Select a source app that can originate at least one link.
 * 2. Highlight valid targets based on constraints.
 * 3. Add the first allowed link type on click, then reset.
 */
export function LinkerMode() {
  // Throttled list of apps and current link graph
  const apps = useThrottleApps(250);
  const links = useLinkStore((s) => s.links);
  const addLink = useLinkStore((s) => s.addLink);

  // Board viewport dimensions and zoom scale
  const { boardWidth, boardHeight, scale } = useUIStore((s) => ({
    boardWidth: s.boardWidth,
    boardHeight: s.boardHeight,
    scale: s.scale,
  }));

  const toast = useToast();

  // Selection state: currently picked source ID
  const selectedSourceId = useLinkStore((s) => s.linkedAppId);
  const setSelectedSourceId = useLinkStore((s) => s.cacheLinkedAppId);

  // Candidate app IDs (either sources or valid targets)
  const [candidates, setCandidates] = useState<string[]>([]);

  // Prepare svg boxes for each app
  const boxes = useMemo(
    () =>
      apps.map((app: App) => ({
        id: app._id,
        position: app.data.position,
        size: app.data.size,
      })),
    [apps]
  );

  // Colors
  const green = useHexColor('green');
  const red = useHexColor('red');
  const teal = useHexColor('teal');

  // On mount or apps/links change: if no source selected, list all valid sources
  useEffect(() => {
    if (!selectedSourceId) {
      const srcs = apps.filter((src) => apps.some((tgt) => getAllowedLinkTypes(src, tgt, links).length > 0));
      setCandidates(srcs.map((a) => a._id));
    }
  }, [selectedSourceId, apps, links]);

  // Handle click on an app rectangle
  const handleClick = (e: React.MouseEvent<SVGRectElement>, appId: string) => {
    e.stopPropagation();
    // 1) No source yet: pick source
    if (!selectedSourceId) {
      if (!candidates.includes(appId)) {
        toast({
          title: 'Invalid Source',
          description: 'This app cannot start any link.',
          status: 'error',
          duration: 2000,
          isClosable: true,
          position: 'top',
        });
        return;
      }
      setSelectedSourceId(appId);
      // Compute targets for this source
      const sourceApp = apps.find((a) => a._id === appId)!;
      const tgts = apps.filter((t) => getAllowedLinkTypes(sourceApp, t, links).length > 0);
      setCandidates(tgts.map((t) => t._id));
      return;
    }

    // 2) Clicking same source: deselect
    if (selectedSourceId === appId) {
      setSelectedSourceId('');
      setCandidates([]);
      return;
    }

    // 3) Add link: validate target
    if (!candidates.includes(appId)) {
      toast({
        title: 'Invalid Target',
        description: 'Cannot link to this app.',
        status: 'error',
        duration: 2000,
        isClosable: true,
        position: 'top',
      });
      return;
    }

    // Create link of first allowed type
    const src = apps.find((a) => a._id === selectedSourceId)!;
    const allowed = getAllowedLinkTypes(src, apps.find((a) => a._id === appId)!, links);
    if (allowed.length === 0) {
      toast({
        title: 'No Link Available',
        description: 'No valid link type between these apps.',
        status: 'error',
        duration: 2000,
        isClosable: true,
        position: 'top',
      });
    } else {
      addLink(selectedSourceId, appId, src.data.boardId, allowed[0]);
      setSelectedSourceId('');
      setCandidates([]);
    }
  };

  return (
    <svg width={boardWidth} height={boardHeight} style={{ position: 'absolute', top: 0, left: 0, zIndex: 100000, pointerEvents: 'none' }}>
      {boxes.map(({ id, position, size }) => {
        const color = selectedSourceId === id ? teal : candidates.includes(id) ? green : red;
        // Fill should be color but a little transparent
        const fill = color + '40';
        return (
          <rect
            key={id}
            x={position.x}
            y={position.y}
            width={size.width}
            height={size.height}
            stroke={color}
            strokeWidth={2 / scale}
            fill={fill}
            onClick={(e) => handleClick(e, id)}
            style={{ pointerEvents: 'auto' }}
          />
        );
      })}
    </svg>
  );
}
