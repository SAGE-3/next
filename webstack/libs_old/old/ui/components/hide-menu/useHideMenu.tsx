/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { motion, MotionValue, useSpring } from 'framer-motion';
import create from 'zustand';

// Hide Menu Props
interface HideMenuProps {
  mapMenu: { isVisible: boolean; menuPos: any }; // Name of the menu
  actionMenu: { isVisible: boolean; menuPos: MotionValue }; // Name of the menu
  infoMenu: { isVisible: boolean; menuPos: MotionValue }; // Name of the menu
  avatarMenu: { isVisible: boolean; menuPos: MotionValue }; // Name of the menu
  toggleMenu: (menuName: string, isVisible: boolean) => void; // Toggle a specific menu
  toggleAllMenus: (isVisible: boolean) => void; // Toggle all menus
  setMenuPos: (mapPos: MotionValue<any>, actionPos: MotionValue<any>, infoPos: MotionValue<any>, avatarPos: MotionValue<any>) => void;
  getMenuPos: (menuName: string) => MotionValue<any>;
  getMenuVisibility: (menuName: string) => boolean;
}

const menuNames = ['Map', 'Action Menu', 'Info Menu', 'Avatar Menu'];

// Hook to hide menus
/**
 * mapMenu, actionMenu, infoMenu, & avatarMenu are the names of the menus to hide/show
 * toggleMenu is the function to call to hide/show the menu
 * toggleMenu USAGE: toggleMenu(menuName, isVisible) where menuName is the name of the component
 * and isVisible is a boolean to show/hide the menu
 *
 * EX:
 * render <HideMenu menuName="Map" mapPosition="bottomRight">{...children}</HideMenu>
 *
 * const {toggleMenu, mapMenu} = useHideMenu();
 * toggleMenu('Map', true); || toggleMenu('Map', !mapMenu.isVisible);
 *
 * Other components are called 'Map', 'Action Menu', 'Info Menu', & 'Avatar Menu'
 *
 */
export const useHideMenu = create<HideMenuProps>((set, get) => ({
  mapMenu: { isVisible: true, menuPos: {} as MotionValue<any> },
  actionMenu: { isVisible: true, menuPos: {} as MotionValue<any> },
  infoMenu: { isVisible: true, menuPos: {} as MotionValue<any> },
  avatarMenu: { isVisible: true, menuPos: {} as MotionValue<any> },

  // Set the menu position
  toggleMenu: (menuName: string, isVisible: boolean) => {
    const menuEl = document.getElementById(menuName);
    const toggleValue = isVisible;
    switch (menuName) {
      case 'Map':
        if (menuEl) {
          toggleValue ? get().mapMenu.menuPos.set(5) : get().mapMenu.menuPos.set(-menuEl.clientWidth + 20);
        }
        return set((state) => ({ mapMenu: { ...state.mapMenu, isVisible: isVisible } }));
      case 'Action Menu':
        if (menuEl) {
          toggleValue ? get().actionMenu.menuPos.set(5) : get().actionMenu.menuPos.set(-menuEl.clientWidth + 20);
        }
        return set((state) => ({ actionMenu: { ...state.actionMenu, isVisible: isVisible } }));
      case 'Info Menu':
        if (menuEl) {
          toggleValue ? get().infoMenu.menuPos.set(5) : get().infoMenu.menuPos.set(-menuEl.clientWidth + 20);
        }
        return set((state) => ({ infoMenu: { ...state.infoMenu, isVisible: isVisible } }));
      case 'Avatar Menu':
        if (menuEl) {
          toggleValue ? get().avatarMenu.menuPos.set(5) : get().avatarMenu.menuPos.set(-menuEl.clientWidth + 20);
        }
        return set((state) => ({ avatarMenu: { ...state.avatarMenu, isVisible: isVisible } }));
    }
  },

  // Toggle all Menus
  toggleAllMenus: (isVisible: boolean) => {
    menuNames.forEach((menuName) => {
      get().toggleMenu(menuName, isVisible);
    });
  },

  // Used to initilize the menu position with useSpring in hide-menu component
  setMenuPos: (mapPos: MotionValue<any>, actionPos: MotionValue<any>, infoPos: MotionValue<any>, avatarPos: MotionValue<any>) =>
    set({
      mapMenu: { isVisible: true, menuPos: mapPos },
      actionMenu: { isVisible: true, menuPos: actionPos },
      infoMenu: { isVisible: true, menuPos: infoPos },
      avatarMenu: { isVisible: true, menuPos: avatarPos },
    }),

  // Used to get the menu position
  getMenuPos: (menuName: string) => {
    switch (menuName) {
      case 'Map':
        return get().mapMenu.menuPos;
      case 'Action Menu':
        return get().actionMenu.menuPos;
      case 'Info Menu':
        return get().infoMenu.menuPos;
      case 'Avatar Menu':
        return get().avatarMenu.menuPos;
    }
  },

  // Used to get the menu visibility
  getMenuVisibility: (menuName: string) => {
    switch (menuName) {
      case 'Map':
        return get().mapMenu.isVisible;
      case 'Action Menu':
        return get().actionMenu.isVisible;
      case 'Info Menu':
        return get().infoMenu.isVisible;
      case 'Avatar Menu':
        return get().avatarMenu.isVisible;
      default:
        return false;
    }
  },
}));
