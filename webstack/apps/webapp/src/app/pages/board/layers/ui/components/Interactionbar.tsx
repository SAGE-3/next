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

import { useUserSettings, useUser, useHotkeys } from '@sage3/frontend';

export function Interactionbar() {
  // Settings
  const { settings, setPrimaryActionMode } = useUserSettings();
  const primaryActionMode = settings.primaryActionMode;

  // User
  const { user } = useUser();

  // Panel Stores
  // const annotations = usePanelStore((state) => state.panels['annotations']);
  // const updatePanel = usePanelStore((state) => state.updatePanel);

  // useHotkeys(
  //   'h',
  //   (event: KeyboardEvent): void | boolean => {
  //     event.stopPropagation();
  //     setPrimaryActionMode('grab');
  //   },
  //   { dependencies: [] }
  // );

  // useHotkeys(
  //   's',
  //   (event: KeyboardEvent): void | boolean => {
  //     event.stopPropagation();
  //     setPrimaryActionMode('lasso');
  //   },
  //   { dependencies: [] }
  // );

  // useHotkeys(
  //   'p',
  //   (event: KeyboardEvent): void | boolean => {
  //     event.stopPropagation();
  //     setPrimaryActionMode('pen');
  //   },
  //   { dependencies: [] }
  // );

  // useHotkeys(
  //   'e',
  //   (event: KeyboardEvent): void | boolean => {
  //     event.stopPropagation();
  //     setPrimaryActionMode('eraser');
  //   },
  //   { dependencies: [] }
  // );

  // useHotkeys(
  //   '1',
  //   (event: KeyboardEvent): void | boolean => {
  //     event.stopPropagation();
  //     setPrimaryActionMode('grab');
  //   },
  //   { dependencies: [] }
  // );

  // useHotkeys(
  //   '2',
  //   (event: KeyboardEvent): void | boolean => {
  //     event.stopPropagation();
  //     setPrimaryActionMode('lasso');
  //   },
  //   { dependencies: [] }
  // );

  // useHotkeys(
  //   '3',
  //   (event: KeyboardEvent): void | boolean => {
  //     event.stopPropagation();
  //     setPrimaryActionMode('pen');
  //   },
  //   { dependencies: [] }
  // );

  // useHotkeys(
  //   '4',
  //   (event: KeyboardEvent): void | boolean => {
  //     event.stopPropagation();
  //     setPrimaryActionMode('eraser');
  //   },
  //   { dependencies: [] }
  // );

  return (
    <>
      <ButtonGroup isAttached size="xs">
        <Tooltip label={'Grab (Panning Tool) — [1]'}>
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
        <Tooltip label={'Selection — [2]'}>
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

        <Tooltip label={'Marker — [3]'}>
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
        <Tooltip label={'Eraser — [4]'}>
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
