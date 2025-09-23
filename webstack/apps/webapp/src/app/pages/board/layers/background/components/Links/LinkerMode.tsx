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
import { useHexColor, useLinkStore, useThrottleApps, useUIStore, useAppStore, useUser, useAuth, useCursorBoardPosition, useUserSettings, useHotkeys } from '@sage3/frontend';
import { initialValues } from '@sage3/applications/initialValues';

/**
 * Enhanced Linker overlay:
 * 1. Select a source app that can originate at least one link.
 * 2. Highlight valid targets based on constraints.
 * 3. Add the first allowed link type on click, then reset.
 * 4. Click on background to create a new SageCell app:
 *    - If no source selected: creates standalone SageCell
 *    - If source selected: creates SageCell and automatically links it to the source
 */
export function LinkerMode() {
  // Throttled list of apps and current link graph
  const apps = useThrottleApps(250);
  const links = useLinkStore((s) => s.links);
  const addLink = useLinkStore((s) => s.addLink);
  const {getBoardCursor} = useCursorBoardPosition()
  const {  setPrimaryActionMode } = useUserSettings();

  // Board viewport dimensions and zoom scale
  const { boardWidth, boardHeight, scale } = useUIStore((s) => ({
    boardWidth: s.boardWidth,
    boardHeight: s.boardHeight,
    scale: s.scale,
  }));

  const toast = useToast();

  // App creation
  const createApp = useAppStore((state) => state.create);
  const { user } = useUser();

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

  // Function to create a new SageCell app at the clicked position
  const createSageCellAt = async (x: number, y: number) => {
    if (!user || !apps.length) return null;

    // Get room and board IDs from the first app (they should all be the same)
    const firstApp = apps[0];
    const roomId = firstApp.data.roomId;
    const boardId = firstApp.data.boardId;

    const sourceApp = apps.find((a) => a._id === selectedSourceId);
    const kernel = sourceApp?.data.state.kernel;

    const newApp = {
      title: 'SageCell',
      roomId: roomId,
      boardId: boardId,
      position: { x: x - 325, y: y - 200, z: 0 }, // Center the app around the click position
      size: { width: 650, height: 400, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'SageCell' as const,
      state: { ...initialValues['SageCell'], kernel: kernel || '' },
      raised: true,
      dragging: false,
      pinned: false,
    };

    const result = await createApp(newApp);
    
    // Only show individual creation toast if there's no selected source (no linking happening)
    if (!selectedSourceId) {
      if (result.success) {
        toast({
          title: 'SageCell Created',
          description: 'New SageCell app created at clicked position.',
          status: 'success',
          duration: 2000,
          isClosable: true,
          position: 'top',
        });
      } else {
        toast({
          title: 'Creation Failed',
          description: 'Could not create SageCell app.',
          status: 'error',
          duration: 2000,
          isClosable: true,
          position: 'top',
        });
      }
    }
    setPrimaryActionMode('lasso');
    return result;
  };

  // Handle click on background
  const handleBackgroundClick = async (e: React.MouseEvent<SVGElement>) => {
    
    // Transform screen coordinates to board coordinates
    const {x, y} = getBoardCursor()
    const boardX = x;
    const boardY = y;
    
    // Create the new SageCell
    const result = await createSageCellAt(boardX, boardY);
    
    // If there's a selected source and the app was created successfully, create a link
    if (selectedSourceId && result?.success) {
      const sourceApp = apps.find((a) => a._id === selectedSourceId);
      const newAppId = result.data._id;
      
      if (sourceApp) {
        // Find the first allowed link type between source and the new SageCell
        const dummySageCellApp = {
          _id: newAppId,
          data: {
            type: 'SageCell' as const,
            boardId: sourceApp.data.boardId,
            roomId: sourceApp.data.roomId,
            position: { x: boardX, y: boardY, z: 0 },
            size: { width: 650, height: 400, depth: 0 }
          }
        } as App;
        
        const allowedTypes = getAllowedLinkTypes(sourceApp, dummySageCellApp, links);
        
        if (allowedTypes.length > 0) {
          addLink(selectedSourceId, newAppId, sourceApp.data.boardId, allowedTypes[0]);
          
          toast({
            title: 'SageCell Created & Linked',
            description: `New SageCell created and linked with ${allowedTypes[0]} connection.`,
            status: 'success',
            duration: 3000,
            isClosable: true,
            position: 'top',
          });
        } else {
          toast({
            title: 'SageCell Created',
            description: 'New SageCell created, but no valid link type available.',
            status: 'warning',
            duration: 3000,
            isClosable: true,
            position: 'top',
          });
        }
        
        // Reset the linker state after creating the link
        setSelectedSourceId('');
        setCandidates([]);
      }
      setPrimaryActionMode('lasso');
    } else if (selectedSourceId && result && !result.success) {
      // Handle case where app creation failed but we had a selected source
      toast({
        title: 'Creation Failed',
        description: 'Could not create SageCell app for linking.',
        status: 'error',
        duration: 3000,
        isClosable: true,
        position: 'top',
      });
    }
  };

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
      setPrimaryActionMode('lasso');
    }
  };

  // IF user hits escape, reset the linker mode and deselect the source
  useHotkeys('esc', () => {
    setPrimaryActionMode('lasso');
    setSelectedSourceId('');
  });
  

  return (
    <svg 
      width={boardWidth} 
      height={boardHeight} 
      style={{ position: 'absolute', top: 0, left: 0, zIndex: 100000, pointerEvents: 'auto' }}
      onClick={handleBackgroundClick}
    >
      {/* Background area for creating new apps */}
      <rect
        x={0}
        y={0}
        width={boardWidth}
        height={boardHeight}
        fill="transparent"
        style={{ pointerEvents: 'auto' }}
      />
      
      {/* App overlay rectangles */}
      {boxes.map(({ id, position, size }) => {
        if (candidates.includes(id) == false) return null;
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
            strokeWidth={Math.max(1, 1.5 / scale)}
            fill={fill}
            onClick={(e) => handleClick(e, id)}
            style={{ pointerEvents: 'auto' }}
          />
        );
      })}
    </svg>
  );
}
