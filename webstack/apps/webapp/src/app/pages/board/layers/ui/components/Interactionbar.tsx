/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { IconButton, Tooltip, ButtonGroup } from '@chakra-ui/react';

import { BiPencil } from 'react-icons/bi';
import { BsEraserFill } from 'react-icons/bs';
import { LiaMousePointerSolid, LiaHandPaperSolid } from 'react-icons/lia';

import { useUserSettings, useUser } from '@sage3/frontend';

export function Interactionbar() {
  // Settings
  const { settings, setPrimaryActionMode } = useUserSettings();
  const primaryActionMode = settings.primaryActionMode;

  // User
  const { user } = useUser();

  // Panel Stores
  // const annotations = usePanelStore((state) => state.panels['annotations']);
  // const updatePanel = usePanelStore((state) => state.updatePanel);

  return (
    <>
      <ButtonGroup isAttached size="xs">
        <Tooltip label={'Grab (Panning Tool)'}>
          <IconButton
            size="sm"
            colorScheme={primaryActionMode === 'grab' ? user?.data.color || 'teal' : 'gray'}
            icon={<LiaHandPaperSolid />}
            fontSize="xl"
            aria-label={'input-type'}
            onClick={() => {
              setPrimaryActionMode('grab');
            }}
          ></IconButton>
        </Tooltip>
        <Tooltip label={'Selection'}>
          <IconButton
            size="sm"
            colorScheme={primaryActionMode === 'lasso' ? user?.data.color || 'teal' : 'gray'}
            icon={<LiaMousePointerSolid />}
            fontSize="xl"
            aria-label={'input-type'}
            onClick={() => {
              setPrimaryActionMode('lasso');
            }}
          ></IconButton>
        </Tooltip>

        <Tooltip label={'Annotations'}>
          <IconButton
            size="sm"
            colorScheme={primaryActionMode === 'pen' ? user?.data.color || 'teal' : 'gray'}
            icon={<BiPencil />}
            fontSize="xl"
            aria-label={'input-type'}
            onClick={() => {
              setPrimaryActionMode('pen');
            }}
          ></IconButton>
        </Tooltip>
        <Tooltip label={'Eraser'}>
          <IconButton
            size="sm"
            colorScheme={primaryActionMode === 'eraser' ? user?.data.color || 'teal' : 'gray'}
            icon={<BsEraserFill />}
            fontSize="xl"
            aria-label={'input-type'}
            onClick={() => {
              setPrimaryActionMode('eraser');
            }}
          ></IconButton>
        </Tooltip>
      </ButtonGroup>
    </>
  );
}
