/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { IconButton, Tooltip, ButtonGroup, useColorModeValue } from '@chakra-ui/react';

import { BiPencil } from 'react-icons/bi';
import { BsEraserFill } from 'react-icons/bs';
import { LiaMousePointerSolid, LiaHandPaperSolid } from 'react-icons/lia';

import { useUserSettings, useUser, useHotkeys, useUIStore } from '@sage3/frontend';

export function Interactionbar() {
  // Settings
  const { settings, setPrimaryActionMode } = useUserSettings();
  const primaryActionMode = settings.primaryActionMode;

  // User
  const { user } = useUser();

  // UiStore
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  const setSelectedAppsIds = useUIStore((state) => state.setSelectedAppsIds);

  // Panel Stores
  // const annotations = usePanelStore((state) => state.panels['annotations']);
  // const updatePanel = usePanelStore((state) => state.updatePanel);

  return (
    <>
      <ButtonGroup isAttached size="xs">
        <Tooltip label={'Grab (Panning Tool) — [1]'}>
          <IconButton
            size="sm"
            colorScheme={primaryActionMode === 'grab' ? user?.data.color || 'teal' : 'gray'}
            sx={{
              _dark: {
                bg: primaryActionMode === 'grab' ? `${user?.data.color}.200` : 'gray.700', // 'inherit' didnt seem to work
              },
            }}
            icon={<LiaHandPaperSolid />}
            fontSize="xl"
            aria-label={'input-type'}
            onClick={() => {
              setPrimaryActionMode('grab');
            }}
          ></IconButton>
        </Tooltip>
        <Tooltip label={'Selection — [2]'}>
          <IconButton
            size="sm"
            colorScheme={primaryActionMode === 'lasso' ? user?.data.color || 'teal' : 'gray'}
            sx={{
              _dark: {
                bg: primaryActionMode === 'lasso' ? `${user?.data.color}.200` : 'gray.700',
              },
            }}
            icon={<LiaMousePointerSolid />}
            fontSize="xl"
            aria-label={'input-type'}
            onClick={() => {
              setPrimaryActionMode('lasso');
            }}
          ></IconButton>
        </Tooltip>

        <Tooltip label={'Marker — [3]'}>
          <IconButton
            size="sm"
            colorScheme={primaryActionMode === 'pen' ? user?.data.color || 'teal' : 'gray'}
            sx={{
              _dark: {
                bg: primaryActionMode === 'pen' ? `${user?.data.color}.200` : 'gray.700',
              },
            }}
            icon={<BiPencil />}
            fontSize="xl"
            aria-label={'input-type'}
            onClick={() => {
              setPrimaryActionMode('pen');
              setSelectedApp('');
              setSelectedAppsIds([]);
            }}
          ></IconButton>
        </Tooltip>
        <Tooltip label={'Eraser — [4]'}>
          <IconButton
            size="sm"
            colorScheme={primaryActionMode === 'eraser' ? user?.data.color || 'teal' : 'gray'}
            sx={{
              _dark: {
                bg: primaryActionMode === 'eraser' ? `${user?.data.color}.200` : 'gray.700',
              },
            }}
            icon={<BsEraserFill />}
            fontSize="xl"
            aria-label={'input-type'}
            onClick={() => {
              setPrimaryActionMode('eraser');
              setSelectedApp('');
              setSelectedAppsIds([]);
            }}
          ></IconButton>
        </Tooltip>
      </ButtonGroup>
    </>
  );
}
