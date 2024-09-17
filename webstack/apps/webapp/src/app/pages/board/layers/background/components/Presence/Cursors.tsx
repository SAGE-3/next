/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { Box, Tag } from '@chakra-ui/react';
import { BsCursorFill } from 'react-icons/bs';

import { useHexColor, useThrottleScale, useUIStore } from '@sage3/frontend';
import { PresenceSchema } from '@sage3/shared/types';

import { Awareness } from './PresenceComponent';

type CursorProps = {
  users: Awareness[];
  rate: number;
};

// Render the User Cursors that belong to the board
export function Cursors(props: CursorProps) {
  // UI Scale
  const scale = useThrottleScale(50);
  const boardDragging = useUIStore((state) => state.boardDragging);

  // Render the cursors
  return (
    <>
      {/* Draw the cursors */}
      {!boardDragging &&
        props.users.map((u) => {
          if (!u) return null;
          const name = u.user.data.name;
          const color = u.user.data.color;
          const cursor = u.presence.data.cursor;
          return <UserCursor key={'cursor-' + u.user._id} color={color} position={cursor} name={name} scale={scale} rate={props.rate} />;
        })}
    </>
  );
}

/**
 * User Curor Props
 */
type UserCursorProps = {
  name: string;
  color: string;
  position: PresenceSchema['cursor'];
  scale: number;
  rate: number;
};

/**
 * Show a user pointer
 * @param props UserCursorProps
 * @returns
 */
function UserCursor(props: UserCursorProps) {
  // Create an animation object to control the opacity of pointer
  // Pointer fades after inactivity
  const color = useHexColor(props.color);

  // Set the opacity of the cursor
  const [opacity, setOpacity] = useState(1);

  // The cursor fade out time
  const fadeOutTime = 1000 * 20;

  // Reset animation if pointer moves
  useEffect(() => {
    // IF the user has not moved the cursor within 5 seconds, fade out the cursor
    const timeout = setTimeout(() => {
      // Fade out the cursor
      setOpacity(0);
    }, fadeOutTime);
    return () => {
      clearTimeout(timeout);
      // Reset the opacity
      setOpacity(1);
    };
  }, [props.position.x, props.position.y, props.position.z]);

  return (
    <Box
      style={{
        position: 'absolute',
        left: props.position.x + 'px',
        top: props.position.y + 'px',
        pointerEvents: 'none',
        transformOrigin: 'top left',
        transform: `scale(${1 / props.scale})`,
        zIndex: 3000,
        transitionProperty: 'left, top',
        transitionDuration: `${props.rate}ms`,
      }}
    >
      <Box
        // pass the animation controller
        style={{
          display: 'flex',
          opacity: opacity,
          transition: `opacity 1s ease-in-out`,
        }}
      >
        <BsCursorFill color={color} style={{ transform: 'rotate(-90deg) scale(1.3)' }} />
        <Tag variant="solid" borderRadius="md" color="white" position="relative" top="12px" left="1px">
          {props.name}
        </Tag>
      </Box>
    </Box>
  );
}
