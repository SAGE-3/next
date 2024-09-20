/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { IconButton, Tooltip, ButtonGroup, Divider, Center } from '@chakra-ui/react';
import { LiaMousePointerSolid, LiaHandPaperSolid } from 'react-icons/lia';

import { useUserSettings, useUser, usePanelStore } from '@sage3/frontend';

import { BiPencil } from 'react-icons/bi';
import { BsEraserFill } from 'react-icons/bs';

export function Interactionbar() {
  // Settings
  const { settings, setPrimaryActionMode } = useUserSettings();
  const primaryActionMode = settings.primaryActionMode;

  // User
  const { user } = useUser();

  // Panel Stores
  const annotations = usePanelStore((state) => state.panels['annotations']);
  const updatePanel = usePanelStore((state) => state.updatePanel);

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
              // if (annotations.show) {
              //   updatePanel('annotations', { show: false });
              // }
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
              // if (annotations.show) {
              //   updatePanel('annotations', { show: false });
              // }
            }}
          ></IconButton>
        </Tooltip>
        {/* </ButtonGroup>

      <Center>
        <Divider orientation="vertical" />
      </Center>

      <ButtonGroup isAttached size="xs"> */}
        <Tooltip label={'Annotations'}>
          <IconButton
            size="sm"
            colorScheme={primaryActionMode === 'pen' ? user?.data.color || 'teal' : 'gray'}
            icon={<BiPencil />}
            fontSize="xl"
            aria-label={'input-type'}
            onClick={() => {
              setPrimaryActionMode('pen');
              if (!annotations.show) {
                updatePanel('annotations', { show: true });
              }
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
              if (!annotations.show) {
                updatePanel('annotations', { show: true });
              }
            }}
          ></IconButton>
        </Tooltip>
      </ButtonGroup>
    </>
  );
}
