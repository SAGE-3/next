/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Box, CloseButton, Flex, Text, useColorModeValue } from '@chakra-ui/react';

import { BsEraserFill } from 'react-icons/bs';
import { BiPencil } from 'react-icons/bi';
import { FaLink } from 'react-icons/fa';
import { HiChip, HiPuzzle } from 'react-icons/hi';
import { IoSparklesSharp } from 'react-icons/io5';
import { LiaHandPaperSolid, LiaMousePointerSolid } from 'react-icons/lia';
import { MdApps, MdArrowBack, MdFolder, MdMap, MdPeople, MdScreenShare } from 'react-icons/md';

import { useLinkStore, useUIStore, useUserSettings } from '@sage3/frontend';

import { RadialMenu, RadialMenuItem } from './RadialMenu';
import { ScreenshareMenu } from './Menus/ScreenshareMenu';
import { ApplicationsMenu, AssetsMenu, KernelsMenu, NavigationMenu, PluginsMenu, UsersMenu } from './Menus';

type BoardRadialMenuProps = {
  roomId: string;
  boardId: string;
  position: { x: number; y: number };
  onClose: () => void;
  downloadRoomAssets: (ids: string[]) => void;
  backHomeClick: () => void;
  openAlfred: () => void;
};

// How far each button sits from the center, lower is a tighter ring
const RING_RADIUS = 100;

// Interaction modes reachable from the radial menu
type ActionMode = 'lasso' | 'grab' | 'pen' | 'eraser' | 'linker';
const ACTION_MODES: ActionMode[] = ['lasso', 'grab', 'pen', 'eraser', 'linker'];

// Menus that open a panel once selected
type PanelId = 'users' | 'screenshare' | 'applications' | 'plugins' | 'assets' | 'kernels' | 'map';
const PANEL_TITLES: Record<PanelId, string> = {
  users: 'Users',
  screenshare: 'Screenshares',
  applications: 'Applications',
  plugins: 'Plugins',
  assets: 'Assets',
  kernels: 'Kernels',
  map: 'Map',
};

/**
 * The board right click menu: a radial menu holding the interaction modes,
 * the board menus and the global actions.
 *
 * @param props BoardRadialMenuProps
 * @returns JSX.Element
 */
export function BoardRadialMenu(props: BoardRadialMenuProps) {
  const { settings, setPrimaryActionMode } = useUserSettings();
  const primaryActionMode = settings.primaryActionMode;

  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  const setSelectedAppsIds = useUIStore((state) => state.setSelectedAppsIds);
  const clearLinkAppId = useLinkStore((state) => state.clearLinkAppId);

  // The panel opened by the radial menu, if any, and where the ring was drawn
  const [openPanel, setOpenPanel] = useState<PanelId | null>(null);
  const [center, setCenter] = useState(props.position);

  const items: RadialMenuItem[] = [
    // { id: 'linker', icon: <FaLink />, label: 'Link', active: primaryActionMode === 'linker' },

    { id: 'plugins', icon: <HiPuzzle />, label: 'Plugins' },
    { id: 'assets', icon: <MdFolder />, label: 'Assets' },

    { id: 'map', icon: <MdMap />, label: 'Map' },
    { id: 'alfred', icon: <IoSparklesSharp />, label: 'SAGE Intelligence' },
    // { id: 'home', icon: <MdArrowBack />, label: 'Back Home' },

    { id: 'eraser', icon: <BsEraserFill />, label: 'Eraser', active: primaryActionMode === 'eraser' },
    { id: 'pen', icon: <BiPencil />, label: 'Annotate', active: primaryActionMode === 'pen' },
    { id: 'grab', icon: <LiaHandPaperSolid />, label: 'Grab', active: primaryActionMode === 'grab' },
    { id: 'lasso', icon: <LiaMousePointerSolid />, label: 'Selection', active: primaryActionMode === 'lasso' },

    { id: 'applications', icon: <MdApps />, label: 'Applications' },
    { id: 'users', icon: <MdPeople />, label: 'Users' },
    { id: 'screenshare', icon: <MdScreenShare />, label: 'Screenshares' },
    { id: 'kernels', icon: <HiChip />, label: 'Kernels' },
  ];

  const selectMode = useCallback(
    (mode: ActionMode) => {
      setPrimaryActionMode(mode);
      if (mode !== 'lasso') {
        setSelectedApp('');
        setSelectedAppsIds([]);
      }
      if (mode !== 'linker') clearLinkAppId();
    },
    [setPrimaryActionMode, setSelectedApp, setSelectedAppsIds, clearLinkAppId],
  );

  const handleSelect = useCallback(
    (id: string) => {
      if (ACTION_MODES.includes(id as ActionMode)) {
        selectMode(id as ActionMode);
        props.onClose();
      } else if (id in PANEL_TITLES) {
        // Keep the menu mounted, swap the ring for the panel
        setOpenPanel(id as PanelId);
      } else if (id === 'alfred') {
        props.onClose();
        props.openAlfred();
      } else if (id === 'home') {
        props.onClose();
        props.backHomeClick();
      }
    },
    [selectMode, props.onClose, props.openAlfred, props.backHomeClick],
  );

  if (openPanel) {
    return (
      <MenuPanel center={center} title={PANEL_TITLES[openPanel]} onClose={props.onClose}>
        {openPanel === 'users' && <UsersMenu boardId={props.boardId} />}
        {openPanel === 'screenshare' && <ScreenshareMenu boardId={props.boardId} roomId={props.roomId} />}
        {openPanel === 'applications' && <ApplicationsMenu roomId={props.roomId} boardId={props.boardId} />}
        {openPanel === 'plugins' && <PluginsMenu roomId={props.roomId} boardId={props.boardId} />}
        {openPanel === 'assets' && (
          <AssetsMenu roomId={props.roomId} boardId={props.boardId} downloadRoomAssets={props.downloadRoomAssets} />
        )}
        {openPanel === 'kernels' && <KernelsMenu roomId={props.roomId} boardId={props.boardId} />}
        {openPanel === 'map' && <NavigationMenu />}
      </MenuPanel>
    );
  }

  return (
    <RadialMenu
      position={props.position}
      items={items}
      radius={RING_RADIUS}
      onSelect={handleSelect}
      onCancel={props.onClose}
      onCenterChange={setCenter}
    />
  );
}

/**
 * A floating panel anchored on the radial menu center, kept inside the viewport.
 * Closes on escape or on a click outside of it.
 */
function MenuPanel(props: { center: { x: number; y: number }; title: string; onClose: () => void; children: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState<{ left: number; top: number } | null>(null);

  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const margin = 8;
    const { width, height } = el.getBoundingClientRect();
    const left = Math.min(Math.max(props.center.x - width / 2, margin), Math.max(margin, window.innerWidth - width - margin));
    const top = Math.min(Math.max(props.center.y - height / 2, margin), Math.max(margin, window.innerHeight - height - margin));
    setOffset({ left, top });
  }, [props.center.x, props.center.y, props.title]);

  useEffect(() => {
    // Give the radial menu release event a chance to finish before listening
    let armed = false;
    const arm = setTimeout(() => (armed = true), 0);

    const handleClick = (e: MouseEvent) => {
      if (!armed) return;
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) props.onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      clearTimeout(arm);
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [props.onClose]);

  return (
    <Box
      ref={panelRef}
      position="fixed"
      left={offset ? `${offset.left}px` : `${props.center.x}px`}
      top={offset ? `${offset.top}px` : `${props.center.y}px`}
      visibility={offset ? 'visible' : 'hidden'}
      zIndex={10000}
      background={bgColor}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="md"
      boxShadow="xl"
      maxHeight="80vh"
      overflowY="auto"
    >
      <Flex align="center" justify="space-between" px="3" py="2" borderBottom="1px solid" borderColor={borderColor}>
        <Text fontWeight="semibold" userSelect="none">
          {props.title}
        </Text>
        <CloseButton size="sm" onClick={props.onClose} />
      </Flex>
      <Box p="3">{props.children}</Box>
    </Box>
  );
}
