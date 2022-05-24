/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useEffect, useState } from 'react';
import { UserPresence } from '@sage3/shared/types';
import { motion, useAnimation, useSpring } from 'framer-motion';
import { Tag } from '@chakra-ui/react';

import { GiArrowCursor } from 'react-icons/gi';
import { usePanZoom, useUser, useUsers } from '@sage3/frontend/services';

/**
 * User Cursors Props
 */
type UserCursorsProps = {
  width: number;
  height: number;
  boardId: string;
  scaleBy: number;
};

/**
 * A layer that sits on top of a board the draws the user cursors.
 * Width and Height are the width and height of the board itself.
 * @param props UserCursorProps {width:number, height: number, boardId: string}
 * @returns
 */
export const UserCursors = (props: UserCursorsProps): JSX.Element => {
  const [panZoomState, dispatchPanZoom] = usePanZoom();
  const [scaleValue, setScaleValue] = useState(panZoomState.motionScale.get());
  useEffect(
    () =>
      panZoomState.motionScale.onChange((latest) => {
        setScaleValue(latest);
      }),
    []
  );

  const users = useUsers();
  const { id } = useUser();
  const filteredUsers = users.filter((el) => el.boardId == props.boardId && el.id !== id);

  return (
    <motion.div
      style={{
        pointerEvents: 'none',
        width: props.width,
        height: props.height,
        left: 0,
        top: 0,
        position: 'absolute',
        zIndex: 99999999,
      }}
    >
      {filteredUsers.map((user: UserPresence) => {
        return (
          <UserCursor
            key={user.id}
            scaleBy={props.scaleBy}
            color={user.color}
            position={user.cursor}
            name={user.name}
            scale={scaleValue}
          />
        );
      })}
    </motion.div>
  );
};

/**
 * User Curor Props
 */
interface UserCursorProps {
  name: string;
  color: string;
  position: [number, number];
  scale: number;
  scaleBy: number;
}

/**
 * Show a user pointer
 * @param props UserCursorProps
 * @returns
 */
function UserCursor(props: UserCursorProps) {
  const cursorX = useSpring(-props.position[0], { stiffness: 150, damping: 30 });
  const cursorY = useSpring(-props.position[1], { stiffness: 150, damping: 30 });

  cursorX.set(-props.position[0]);
  cursorY.set(-props.position[1]);

  // Create an animation object to control the opacity of pointer
  // Pointer fades after inactivity
  const controls = useAnimation();

  // Reset animation if pointer moves
  useEffect(() => {
    // Stop previous animation
    controls.stop();
    // Set initial opacity
    controls.set({ opacity: 0.8 });
    // Start animation
    controls.start({
      // final opacity
      opacity: 0.0,
      transition: {
        ease: 'easeIn',
        // duration in sec.
        duration: 10,
      },
    });
  }, [props.position[0], props.position[1]]);

  // steps to scale the cursor pointers
  const cursorScale = [18, 24, 32, 40];
  const fontScale = ["sm", "md", "lg", "xl"];

  return (
    <motion.div
      // pass the animation controller
      animate={controls}
      style={{
        originX: 0,
        originY: 0,
        color: 'white',
        pointerEvents: 'none',
        position: 'absolute',
        x: cursorX,
        y: cursorY,
        scale: 1 / props.scale,
      }}
    >
      <div style={{ display: 'flex' }}>
        <GiArrowCursor size={cursorScale[props.scaleBy - 1]} color={props.color}></GiArrowCursor>
        <Tag fontSize={fontScale[props.scaleBy - 1]} variant="solid" borderRadius='md'
          mt='3' mb='0' ml='-1' mr='0' p='1' backgroundColor="#1a202c" color="white" >
          {props.name.trim().substring(0, 19)}
        </Tag>
      </div>
    </motion.div>
  );
}
