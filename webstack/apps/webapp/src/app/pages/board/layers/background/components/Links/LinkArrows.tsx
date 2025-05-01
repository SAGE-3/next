/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useColorModeValue } from '@chakra-ui/react';

// SAGE Imports
import { useThrottleApps, useUIStore, useLinkStore, useUserSettings } from '@sage3/frontend';
import { Link } from '@sage3/shared/types';
import { SAGEColors } from '@sage3/shared';

import { BoxToBoxArrow } from './DrawArrows';

/**
 * The Arrows component, showing arrows of links between apps.
 *
 * @param {ArrowsProps} props - The props for the Arrows component.
 * @returns {JSX.Element} The Arrows component.
 */
export function LinksArrows(props: { links: Link[] }) {
  // Links to draw
  const links = props.links;

  const { settings } = useUserSettings();
  const interactionMode = settings?.primaryActionMode === 'linker';

  // Apps Store
  const apps = useThrottleApps(200);

  // UI Store
  const boardWidth = useUIStore((state) => state.boardWidth);
  const boardHeight = useUIStore((state) => state.boardHeight);

  const scale = useUIStore((state) => state.scale);
  // Default Theme
  const strokeColor = useColorModeValue('gray.500', 'gray.500');

  // Linker Interaction Mode
  const removeLink = useLinkStore((state) => state.removeLinks);

  function handleDeleteLink(linkId: string) {
    removeLink(linkId);
  }

  return (
    <div className="arrows-container" style={{ pointerEvents: 'none', touchAction: 'auto' }}>
      <svg
        id="arrows"
        className="canvas-layer"
        style={{
          position: 'absolute',
          width: boardWidth + 'px',
          height: boardHeight + 'px',
          left: 0,
          top: 0,
          zIndex: 0,
        }}
      >
        {/* All arrows */}
        {links.map((link) => {
          const { data } = link;
          const { sourceAppId, targetAppId } = data;
          const sourceApp = apps.find((a) => a._id === sourceAppId);
          const targetApp = apps.find((a) => a._id === targetAppId);
          const strokeType = data.type === 'run_order' ? 'solid' : 'dashed';

          if (!sourceApp || !targetApp) return null;
          const isAnimated = link.data.type === 'run_order';
          const sBox = {
            position: sourceApp.data.position,
            size: sourceApp.data.size,
          };
          const tBox = {
            position: targetApp.data.position,
            size: targetApp.data.size,
          };
          const arrowColor = link.data.color ? link.data.color : ('teal' as SAGEColors);
          const interactionFunction = interactionMode ? () => handleDeleteLink(link._id) : undefined;
          const arrow = BoxToBoxArrow(sBox, tBox, link._id, strokeColor, strokeType, arrowColor, scale, interactionFunction);
          return arrow;
        })}
      </svg>
    </div>
  );
}
