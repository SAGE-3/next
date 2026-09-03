/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, useColorModeValue } from '@chakra-ui/react';

export type RadialMenuItem = {
  // Unique id, returned by onSelect
  id: string;
  icon: ReactNode;
  label: string;
  // Highlighted as the currently active item (i.e. the current interaction mode)
  active?: boolean;
};

type RadialMenuProps = {
  // Where the user pressed, in viewport coordinates
  position: { x: number; y: number };
  items: RadialMenuItem[];
  onSelect: (id: string) => void;
  onCancel: () => void;
  // Highlight color, an hex color string
  color: string;
  // The clamped center actually used for the ring, so callers can anchor to it
  onCenterChange?: (center: { x: number; y: number }) => void;
};

// Distance from center to menu items
const RADIUS = 135;
// Diameter of an item
const ITEM_SIZE = 46;
// Diameter of the center hub
const HUB_SIZE = 56;
// Minimum distance from the center to activate an item, avoids a center deadzone
const MIN_ACTIVATION_DISTANCE = 30;

/**
 * A radial (pie) menu. Two ways to pick an item:
 * - drag: press, move outward toward an item, release to select it
 * - sticky: press and release without moving, the menu stays up, then click an item
 *
 * @param props RadialMenuProps
 * @returns JSX.Element
 */
export function RadialMenu(props: RadialMenuProps) {
  const { position, items, onSelect, onCancel, color, onCenterChange } = props;

  const hubColor = useColorModeValue('white', 'var(--chakra-colors-gray-700)');
  const itemColor = useColorModeValue('var(--chakra-colors-gray-100)', 'var(--chakra-colors-gray-600)');
  const iconColor = useColorModeValue('var(--chakra-colors-gray-700)', 'white');
  const labelBg = useColorModeValue('var(--chakra-colors-gray-700)', 'white');
  const labelColor = useColorModeValue('white', 'var(--chakra-colors-gray-800)');

  // Keep the whole ring on screen: clamp the center away from the viewport edges
  const center = useMemo(() => {
    const margin = RADIUS + ITEM_SIZE;
    return {
      x: Math.min(Math.max(position.x, margin), Math.max(margin, window.innerWidth - margin)),
      y: Math.min(Math.max(position.y, margin), Math.max(margin, window.innerHeight - margin)),
    };
  }, [position.x, position.y]);

  useEffect(() => {
    onCenterChange?.(center);
  }, [center.x, center.y]);

  // Precompute the angle of every item, evenly spread, starting at the top
  const ring = useMemo(
    () =>
      items.map((item, index) => ({
        ...item,
        angle: (360 / items.length) * index,
      })),
    [items]
  );
  const ringRef = useRef(ring);
  ringRef.current = ring;

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const hoveredIdRef = useRef<string | null>(null);
  const hasMovedRef = useRef(false);

  // Which item does this point fall on, based on the angle from the center
  const itemAt = useCallback(
    (clientX: number, clientY: number) => {
      const dx = clientX - center.x;
      const dy = clientY - center.y;
      if (Math.sqrt(dx * dx + dy * dy) < MIN_ACTIVATION_DISTANCE) return null;

      // 0 at the top, growing clockwise
      const angle = (Math.atan2(dy, dx) * (180 / Math.PI) + 90 + 360) % 360;

      let closest: string | null = null;
      let minDiff = Infinity;
      ringRef.current.forEach((item) => {
        let diff = Math.abs(angle - item.angle);
        if (diff > 180) diff = 360 - diff;
        if (diff < minDiff) {
          minDiff = diff;
          closest = item.id;
        }
      });
      return closest;
    },
    [center.x, center.y]
  );

  useEffect(() => {
    const track = (clientX: number, clientY: number) => {
      setCursor({ x: clientX, y: clientY });
      const hovered = itemAt(clientX, clientY);
      setHoveredId(hovered);
      hoveredIdRef.current = hovered;
      if (!hasMovedRef.current && hovered !== null) hasMovedRef.current = true;
    };

    const handleMouseMove = (e: MouseEvent) => track(e.clientX, e.clientY);

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      // Suppress native touch gestures (scroll, long press callout) that would
      // otherwise hijack the drag and fire touchcancel, freezing the menu
      e.preventDefault();
      track(e.touches[0].clientX, e.touches[0].clientY);
    };

    // Commit the drag: select what is under the pointer, or close if nothing is
    const release = () => {
      if (!hasMovedRef.current) return;
      if (hoveredIdRef.current) onSelect(hoveredIdRef.current);
      else onCancel();
    };

    const handleMouseUp = () => release();
    const handleTouchEnd = () => release();

    // The browser/OS can cancel the touch mid drag. Resolve it like a normal
    // release so the menu never gets stuck open.
    const handleTouchCancel = () => {
      if (hasMovedRef.current) release();
      else onCancel();
    };

    // Sticky mode: the user pressed and released without moving, so a plain
    // click picks an item, and a click elsewhere closes the menu
    const handleClick = (e: MouseEvent) => {
      if (hasMovedRef.current) return;
      const hovered = itemAt(e.clientX, e.clientY);
      if (hovered) onSelect(hovered);
      else onCancel();
    };

    // No native context menu while the radial menu is up
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('click', handleClick);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchCancel);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [itemAt, onSelect, onCancel]);

  const itemOffset = (angle: number) => {
    const radians = ((angle - 90) * Math.PI) / 180; // -90 so that 0 is at the top
    return { x: Math.cos(radians) * RADIUS, y: Math.sin(radians) * RADIUS };
  };

  const hoveredLabel = ring.find((item) => item.id === hoveredId)?.label;

  return (
    <Box position="fixed" left={`${center.x}px`} top={`${center.y}px`} zIndex={10000} pointerEvents="none">
      {/* Selection line from the center to the cursor */}
      {cursor && hoveredId && (
        <svg style={{ position: 'absolute', left: -RADIUS * 2, top: -RADIUS * 2, width: RADIUS * 4, height: RADIUS * 4 }}>
          <line
            x1={RADIUS * 2}
            y1={RADIUS * 2}
            x2={cursor.x - center.x + RADIUS * 2}
            y2={cursor.y - center.y + RADIUS * 2}
            stroke={color}
            strokeWidth="2"
            strokeDasharray="4 4"
          />
        </svg>
      )}

      {/* Center hub */}
      <Box
        position="absolute"
        width={`${HUB_SIZE}px`}
        height={`${HUB_SIZE}px`}
        left={`${-HUB_SIZE / 2}px`}
        top={`${-HUB_SIZE / 2}px`}
        borderRadius="full"
        background={hubColor}
        boxShadow="lg"
      />

      {/* Items */}
      {ring.map((item) => {
        const offset = itemOffset(item.angle);
        const highlighted = hoveredId === item.id || item.active;
        return (
          <Box
            key={item.id}
            position="absolute"
            width={`${ITEM_SIZE}px`}
            height={`${ITEM_SIZE}px`}
            left={`${offset.x - ITEM_SIZE / 2}px`}
            top={`${offset.y - ITEM_SIZE / 2}px`}
            borderRadius="full"
            boxShadow="lg"
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontSize="20px"
            transition="transform 150ms"
            transform={hoveredId === item.id ? 'scale(1.15)' : 'scale(1)'}
            background={highlighted ? color : itemColor}
            color={highlighted ? 'white' : iconColor}
          >
            {item.icon}
          </Box>
        );
      })}

      {/* Label of the hovered item */}
      {hoveredLabel && (
        <Box
          position="absolute"
          left="-75px"
          top={`${RADIUS + ITEM_SIZE}px`}
          width="150px"
          textAlign="center"
          px="3"
          py="1"
          borderRadius="md"
          fontSize="sm"
          fontWeight="medium"
          whiteSpace="nowrap"
          boxShadow="lg"
          background={labelBg}
          color={labelColor}
        >
          {hoveredLabel}
        </Box>
      )}
    </Box>
  );
}
