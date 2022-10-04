/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, Tooltip, Text, useDisclosure, useColorModeValue, IconButton } from '@chakra-ui/react';
import { MdPerson, MdLock, MdSettings, MdLockOpen } from 'react-icons/md';

import { SBDocument } from '@sage3/sagebase';
import { sageColorByName } from '@sage3/shared';
import { BoardSchema } from '@sage3/shared/types';
import { EnterBoardModal } from '../modals/EnterBoardModal';
import { useUser } from '../../../hooks';
import { EditBoardModal } from '../modals/EditBoardModal';

export type BoardCardProps = {
  board: SBDocument<BoardSchema>;
  userCount: number;
  onSelect: () => void;
  onDelete: () => void;
};

/**
 * Board card
 *
 * @export
 * @param {BoardCardProps} props
 * @returns
 */
export function BoardCard(props: BoardCardProps) {
  const { user } = useUser();

  // Is it my board?
  const yours = user?._id === props.board.data.ownerId;

  // Custom color
  const boardColor = sageColorByName(props.board.data.color);

  // Edit Modal Disclousure
  const { isOpen: isOpenEdit, onOpen: onOpenEdit, onClose: onCloseEdit } = useDisclosure();

  // Enter Modal Disclosure
  const { isOpen: isOpenEnter, onOpen: onOpenEnter, onClose: onCloseEnter } = useDisclosure();

  const handleEnterBoard = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenEnter();
  };

  const handleOpenSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenEdit();
  };

  return (
    <>
      <EnterBoardModal
        id={props.board._id}
        roomId={props.board.data.roomId}
        name={props.board.data.name}
        isPrivate={props.board.data.isPrivate}
        privatePin={props.board.data.privatePin}
        isOpen={isOpenEnter}
        onClose={onCloseEnter}
      />
      <EditBoardModal board={props.board} isOpen={isOpenEdit} onClose={onCloseEdit} onOpen={onOpenEdit} />
      <Tooltip label={<BoardPreview board={props.board} />} placement="top" backgroundColor="transparent" openDelay={1000}>
        <Box
          display="flex"
          justifyContent="left"
          borderWidth="2px"
          borderRadius="md"
          height="60px"
          my="1"
          width="100%"
          cursor="pointer"
          alignItems="baseline"
          position="relative"
          onClick={handleEnterBoard}
        >
          <Box display="flex" height="100%" alignContent={'baseline'} justifyContent="space-between" width="100%">
            <Box display="flex" flexDirection={'column'} alignItems="center" pl="2">
              <Text fontSize="xl" textOverflow={'ellipsis'} width="100%" textAlign={'left'}>
                {props.board.data.name}
              </Text>
              <Text fontSize="sm" textOverflow={'ellipsis'} width="100%" textAlign={'left'}>
                {props.board.data.description}
              </Text>
            </Box>

            <Box width="200px" display="flex" alignItems="center" justifyContent="right" mr="2">
              <Box display="flex" alignItems={'center'}>
                <Text fontSize="sm">{props.userCount}</Text>
                <MdPerson fontSize="22px" />
              </Box>
              <Tooltip
                label={props.board.data.isPrivate ? 'Board is Locked' : 'Board is Unlocked'}
                openDelay={400}
                placement="top-start"
                hasArrow
              >
                <Box>{props.board.data.isPrivate ? <MdLock fontSize="20px" /> : <MdLockOpen fontSize="20px" />}</Box>
              </Tooltip>

              <Tooltip label={yours ? 'Edit board' : "Only the board's owner can edit"} openDelay={400} placement="top-start" hasArrow>
                <IconButton
                  onClick={handleOpenSettings}
                  color={boardColor}
                  aria-label="Board Edit"
                  fontSize="2xl"
                  variant="unstlyed"
                  disabled={!yours}
                  icon={<MdSettings />}
                />
              </Tooltip>
            </Box>
          </Box>
        </Box>
      </Tooltip>
    </>
  );
}

import { AppError, Applications } from '@sage3/applications/apps';
import { App } from '@sage3/applications/schema';
import { useAppStore, useUIStore } from '@sage3/frontend';
import { Board } from '@sage3/shared/types';
import { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

type BoardPreviewProps = {
  board: Board;
};

/**
 * Board Preview component
 * @returns
 */
export function BoardPreview(props: BoardPreviewProps) {
  const [apps, setApps] = useState<App[]>([]);

  const boardHeight = useUIStore((state) => state.boardHeight);
  const boardWidth = useUIStore((state) => state.boardWidth);

  const borderWidth = 4;
  const maxWidth = 600 - borderWidth * 2;
  const maxHeight = 300 - borderWidth * 2;

  const scale = Math.min(maxWidth / boardWidth, maxHeight / boardHeight);

  const fetchBoardApp = useAppStore((state) => state.fetchBoardApps);
  const backgroundColor = useColorModeValue('gray.100', 'gray.700');

  useEffect(() => {
    async function fetchApps() {
      const resApps = await fetchBoardApp(props.board._id);
      if (resApps) {
        setApps(resApps);
      }
    }
    fetchApps();
  }, [props.board._id]);

  return (
    <Box
      width={maxWidth + 'px'}
      height={maxHeight + 'px'}
      backgroundColor={backgroundColor}
      borderRadius="md"
      pointerEvents="none"
      border={`solid ${borderWidth}px ${sageColorByName(props.board.data.color)}`}
      overflow="hidden"
      transform={`translateX(-${maxWidth / 4}px)`}
    >
      <Box width={maxWidth + 'px'} height={maxHeight + 'px'} transform={`scale(${scale})`} transformOrigin="top left">
        {apps.map((app) => {
          const Component = Applications[app.data.type].AppComponent;
          return (
            // Wrap the components in an errorboundary to protect the board from individual app errors
            <ErrorBoundary
              key={app._id}
              fallbackRender={({ error, resetErrorBoundary }) => (
                <AppError error={error} resetErrorBoundary={resetErrorBoundary} app={app} />
              )}
            >
              <Component key={app._id} {...app}></Component>
            </ErrorBoundary>
          );
        })}
      </Box>
    </Box>
  );
}
