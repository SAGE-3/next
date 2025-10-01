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
  // Apps Store
  const apps = useThrottleApps(200);

  // UI Store
  const boardWidth = useUIStore((state) => state.boardWidth);
  const boardHeight = useUIStore((state) => state.boardHeight);

  const scale = useUIStore((state) => state.scale);
  // Default Theme
  const strokeColor = useColorModeValue('gray.700', 'gray.200');

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
        {links.map((link, linkIndex) => {
          const { data } = link;
          const { sourceAppId, targetAppId } = data;
          const sourceApp = apps.find((a) => a._id === sourceAppId);
          const targetApp = apps.find((a) => a._id === targetAppId);
          const strokeType = data.type === 'run_order' ? 'solid' : 'dashed';

          if (!sourceApp || !targetApp) return null;
          
          // Calculate offset for overlapping arrows
          const similarLinks = links.filter((otherLink, otherIndex) => {
            if (otherIndex >= linkIndex) return false; // Only count previous links
            const { sourceAppId: otherSource, targetAppId: otherTarget } = otherLink.data;
            const otherSourceApp = apps.find((a) => a._id === otherSource);
            const otherTargetApp = apps.find((a) => a._id === otherTarget);
            
            if (!otherSourceApp || !otherTargetApp) return false;
            
            // Check for exact same connection or reverse connection
            const exactMatch = (sourceAppId === otherSource && targetAppId === otherTarget) ||
                              (sourceAppId === otherTarget && targetAppId === otherSource);
            
            if (exactMatch) return true;
            
            // Check for nearby apps that would create visually overlapping arrows
            const distance = (a1: any, a2: any) => 
              Math.sqrt(Math.pow(a1.data.position.x - a2.data.position.x, 2) + 
                       Math.pow(a1.data.position.y - a2.data.position.y, 2));
            
            const sourceDistance = distance(sourceApp, otherSourceApp);
            const targetDistance = distance(targetApp, otherTargetApp);
            const crossDistance1 = distance(sourceApp, otherTargetApp);
            const crossDistance2 = distance(targetApp, otherSourceApp);
            
            const threshold = 200; // Apps within 200 pixels are considered "close" (increased sensitivity)
            
            // Check if arrows would visually overlap due to proximity
            return (sourceDistance < threshold && targetDistance < threshold) ||
                   (crossDistance1 < threshold && crossDistance2 < threshold);
          });
          
          const offsetMultiplier = similarLinks.length;
          const maxOffset = 0.8; // Maximum bow offset (increased)
          const baseOffset = 0.25; // Base offset for each additional arrow (doubled)
          const offset = Math.min(offsetMultiplier * baseOffset, maxOffset);
          
          // Create more dramatic separation with improved alternating pattern
          // First arrow gets no offset, then alternate with increasing magnitude
          let alternatingOffset = 0;
          if (offsetMultiplier > 0) {
            const magnitude = (Math.floor(offsetMultiplier / 2) + 1) * baseOffset;
            const cappedMagnitude = Math.min(magnitude, maxOffset);
            alternatingOffset = offsetMultiplier % 2 === 1 ? cappedMagnitude : -cappedMagnitude;
          }
          
          const sBox = {
            position: sourceApp.data.position,
            size: sourceApp.data.size,
          };
          const tBox = {
            position: targetApp.data.position,
            size: targetApp.data.size,
          };
          const arrowColor = link.data.color ? link.data.color : ('teal' as SAGEColors);
          const interactionFunction = () => handleDeleteLink(link._id);
          const arrow = BoxToBoxArrow(sBox, tBox, link._id, strokeColor, strokeType, arrowColor, scale, interactionFunction, alternatingOffset);
          return arrow;
        })}
      </svg>
    </div>
  );
}
