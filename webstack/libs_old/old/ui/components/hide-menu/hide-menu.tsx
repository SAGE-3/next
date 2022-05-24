/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useEffect, useRef, useState } from 'react';

//  Chakra Components
import { Tooltip, Button, Box } from '@chakra-ui/react';
import { MdOutlineArrowForwardIos, MdOutlineArrowBackIosNew } from 'react-icons/md';
import { motion, MotionValue, useSpring } from 'framer-motion';
import create from 'zustand';
import { useHideMenu } from './useHideMenu';
import { borderColor, menuBgColor } from '@sage3/frontend/ui';
import { useUsers } from '@sage3/frontend/services';

/**
 * HideMenu, a menu bar that you can hide and show
 *
 * @param {{
 *   menuName: string; // Name of the menu
 *   menuPosition: string; // Where is the menu located {topLeft, topRight, bottomLeft, bottomRight}
 *   children: JSX.Element;
 *   buttonSize?: string; // Size of the button to hide/show menu; defaults to "xs" if not specified
 * }} props
 * @returns JSX.Element
 */
function HideMenu(props: {
  menuName: string; // Name of the menu
  menuPosition: string; // Where is the menu located {topLeft, topRight, bottomLeft, bottomRight}
  children: JSX.Element;
  buttonSize?: string; // Size of the button to hide/show menu; defaults to "xs" if not specified
}) {
  // To Position the menu
  let menuPositionOptions = {};

  // Set the position of the button
  let buttonPosition = '';

  const users = useUsers();

  //  Instantiate store
  const menuState = useHideMenu();

  // useSpring is a hook so need to initialize each menu and set in useEffect to set state in store
  const mapPos = useSpring(8, { stiffness: 200, damping: 30 });
  const actionPos = useSpring(8, { stiffness: 200, damping: 30 });
  const infoPos = useSpring(8, { stiffness: 200, damping: 30 });
  const avatarPos = useSpring(8, { stiffness: 200, damping: 30 });

  useEffect(() => {
    menuState.setMenuPos(mapPos, actionPos, infoPos, avatarPos);
  }, []);

  useEffect(() => {
    if (!menuState.avatarMenu.isVisible) {
      menuState.toggleMenu('Avatar Menu', false);
    }
  }, [users]);

  // Set the menu position
  switch (props.menuPosition) {
    case 'topLeft':
      menuPositionOptions = { left: menuState.getMenuPos(props.menuName), top: '0.5rem', position: 'absolute' };
      break;
    case 'bottomLeft':
      menuPositionOptions = { left: menuState.getMenuPos(props.menuName), bottom: '0.5rem', position: 'absolute' };
      break;
    case 'bottomRight':
      menuPositionOptions = { right: menuState.getMenuPos(props.menuName), bottom: '0.5rem', position: 'absolute' };
      break;
    case 'topRight':
      menuPositionOptions = { right: menuState.getMenuPos(props.menuName), top: '0.5rem', position: 'absolute' };
  }
  // Set the button position according to props.buttonSize
  switch (props.buttonSize) {
    case 'sm':
      buttonPosition = '-0.5rem';
      break;
    case 'xs':
      buttonPosition = '0.1rem';
  }

  return (
    <>
      {/* Motion.div positions the menu */}
      <motion.div id={props.menuName} style={menuPositionOptions as React.CSSProperties}>
        <Box position="relative" px="3" py="1">
          <Tooltip
            placement={props.menuPosition === 'bottomRight' || props.menuPosition === 'topRight' ? 'left' : 'right'}
            hasArrow={true}
            label={menuState.getMenuVisibility(props.menuName) ? `Hide ${props.menuName}` : `Show ${props.menuName}`}
            openDelay={200}
          >
            <Button
              p={0}
              position="absolute"
              left={props.menuPosition === 'bottomRight' || props.menuPosition === 'topRight' ? buttonPosition : undefined}
              right={props.menuPosition === 'topLeft' || props.menuPosition === 'bottomLeft' ? buttonPosition : undefined}
              top="50%"
              transform="translateY(-50%)"
              zIndex="20"
              variant="outline"
              borderColor={borderColor()}
              size={props.buttonSize}
              bg={menuBgColor()}
              _hover={{ bg: 'teal.600' }}
              aria-label="Show/Hide"
              onClick={() => menuState.toggleMenu(props.menuName, !menuState.getMenuVisibility(props.menuName))}
            >
              {props.menuPosition === 'bottomRight' || props.menuPosition === 'topRight' ? (
                menuState.getMenuVisibility(props.menuName) ? (
                  <MdOutlineArrowForwardIos />
                ) : (
                  <MdOutlineArrowBackIosNew />
                )
              ) : menuState.getMenuVisibility(props.menuName) ? (
                <MdOutlineArrowBackIosNew />
              ) : (
                <MdOutlineArrowForwardIos />
              )}
            </Button>
          </Tooltip>
          {props.children}
        </Box>
      </motion.div>
    </>
  );
}

HideMenu.defaultProps = {
  buttonSize: 'xs',
};

export default HideMenu;
