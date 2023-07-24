/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React from 'react';
import { Tag } from '@chakra-ui/react';
import { useHexColor, useUIStore, useUser, useUsersStore } from '@sage3/frontend';
import { PresenceSchema } from '@sage3/shared/types';
import { motion, useAnimation } from 'framer-motion';
import { useEffect } from 'react';
import { GiArrowCursor } from 'react-icons/gi';
import { Awareness } from './PresenceComponent';

type CursorProps = {
  users: Awareness[];
  rate: number;
};

// Render the User Cursors that belong to the board
export function Cursors(props: CursorProps) {
  // UI Scale
  const scale = useUIStore((state) => state.scale);

  // Render the cursors
  return (
    <>
      {/* Draw the cursors */}
      {props.users.map((u) => {
        if (!u) return null;
        const name = u.user.data.name;
        const color = u.user.data.color;
        const cursor = u.presence.data.cursor;
        return <UserCursorMemo key={'cursor-' + u.user._id} color={color} position={cursor} name={name} scale={scale} rate={props.rate} />;
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
  const controls = useAnimation();
  const color = useHexColor(props.color);

  // Reset animation if pointer moves
  useEffect(() => {
    // Stop previous animation
    controls.stop();
    // Set initial opacity
    controls.set({ opacity: 1.0 });
    // Start animation
    controls.start({
      // final opacity
      opacity: 0.0,
      transition: {
        ease: 'easeIn',
        // duration in sec.
        duration: 10,
        delay: 30,
      },
    });
  }, [props.position.x, props.position.y, props.position.z]);

  return (
    <motion.div
      // pass the animation controller
      animate={controls}
      style={{
        position: 'absolute',
        left: props.position.x + 'px',
        top: props.position.y + 'px',
        // Testing if we can transition using the rate. Smooths out the transition
        transitionDuration: `${props.rate / 1000}s`,
        transitionProperty: 'left, top',
        pointerEvents: 'none',
        display: 'flex',
        transformOrigin: 'top left',
        zIndex: 100000,
        transform: `scale(${1 / props.scale})`,
      }}
    >
      <GiArrowCursor color={color}></GiArrowCursor>
      <Tag variant="solid" borderRadius="md" color="white">
        {props.name}
      </Tag>
    </motion.div>
  );
}

const UserCursorMemo = React.memo(UserCursor);
