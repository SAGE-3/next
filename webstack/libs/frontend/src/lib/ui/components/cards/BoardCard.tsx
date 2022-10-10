/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, Tooltip, Text, useDisclosure, useColorModeValue, IconButton, useToast } from '@chakra-ui/react';
import { MdLock, MdSettings, MdLockOpen, MdOutlineCopyAll } from 'react-icons/md';

import { SBDocument } from '@sage3/sagebase';
import { BoardSchema } from '@sage3/shared/types';
import { EnterBoardModal } from '../modals/EnterBoardModal';
import { useHexColor, useUser } from '../../../hooks';
import { EditBoardModal } from '../modals/EditBoardModal';

import { App } from '@sage3/applications/schema';
import { useAppStore, useUIStore } from '@sage3/frontend';
import { Board } from '@sage3/shared/types';
import { useEffect, useState } from 'react';

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
  const boardColor = useHexColor(props.board.data.color);
  const backgroundColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.300', 'gray.700');
  const bColor = useHexColor(borderColor);
  // const scale = useUIStore((state) => state.scale);

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

  // Copy the board id to the clipboard
  const toast = useToast();
  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(props.board._id);
    toast({
      title: 'Success',
      description: `BoardID Copied to Clipboard`,
      duration: 3000,
      isClosable: true,
      status: 'success',
    });
  };

  return (
    <>
      <EnterBoardModal board={props.board} isOpen={isOpenEnter} onClose={onCloseEnter} />
      <EditBoardModal board={props.board} isOpen={isOpenEdit} onClose={onCloseEdit} onOpen={onOpenEdit} />
      {/* <Tooltip label={<BoardPreview board={props.board} />} placement="top" backgroundColor={'transparent'} openDelay={1000}> */}
      <Box
        display="flex"
        justifyContent="left"
        height="60px"
        my="1"
        width="100%"
        cursor="pointer"
        alignItems="baseline"
        position="relative"
        onClick={handleEnterBoard}
        transition="all 0.25s "
        backgroundColor={backgroundColor}
        borderRadius="md"
        border="1px solid"
        borderLeft="solid 4px"
        borderColor={boardColor}
        // borderColor={`${bColor + 'FF'}`}
        _hover={{ boxShadow: 'lg', borderColor: bColor + '00' }}
      >
        <Box display="flex" height="100%" alignContent={'center'} justifyContent="space-between" width="100%">
          <Box display="flex" flexDirection={'column'} ml="2" pt="1" flexGrow={1}>
            <Text fontSize="lg" textOverflow={'ellipsis'} width="100%" textAlign={'left'} fontWeight="semibold">
              {props.board.data.name}
            </Text>
            <Text fontSize="sm" textOverflow={'ellipsis'} width="100%" textAlign={'left'} fontWeight="light">
              {props.board.data.description}
            </Text>
          </Box>

          <Box display="flex" alignItems="center" justifyContent="right" mr="2">
            <Tooltip label={props.userCount + ' connected clients'} openDelay={400} placement="top-start" hasArrow>
              <Text fontSize="22px" mr="2">
                {props.userCount}
              </Text>
            </Tooltip>

            <Tooltip
              label={props.board.data.isPrivate ? 'Board is Locked' : 'Board is Unlocked'}
              openDelay={400}
              placement="top-start"
              hasArrow
            >
              <Box>{props.board.data.isPrivate ? <MdLock fontSize="20px" /> : <MdLockOpen fontSize="20px" />}</Box>
            </Tooltip>

            <Tooltip label={'Copy Board ID'} openDelay={400} placement="top-start" hasArrow>
              <IconButton onClick={handleCopyId} aria-label="Board Edit" fontSize="2xl" variant="unstlyed" icon={<MdOutlineCopyAll />} />
            </Tooltip>

            <Tooltip label={yours ? 'Edit board' : "Only the board's owner can edit"} openDelay={400} placement="top-start" hasArrow>
              <IconButton
                onClick={handleOpenSettings}
                aria-label="Board Edit"
                fontSize="2xl"
                variant="unstlyed"
                disabled={!yours}
                marginLeft={-3} // Weird margin on the icon
                icon={<MdSettings />}
              />
            </Tooltip>
          </Box>
        </Box>
      </Box>
      {/* </Tooltip> */}
    </>
  );
}

type BoardPreviewProps = {
  board: Board;
};

/**
 * Board Preview component
 * @returns
 */
// export function BoardPreview(props: BoardPreviewProps) {
//   const [apps, setApps] = useState<App[]>([]);

//   const boardHeight = useUIStore((state) => state.boardHeight);
//   const boardWidth = useUIStore((state) => state.boardWidth);
//   const aspectRatio = boardWidth / boardHeight;

//   const borderWidth = 2;
//   const borderColor = useHexColor(props.board.data.color);

//   let maxWidth = 600;
//   let maxHeight = maxWidth / aspectRatio;

//   const scale = Math.min(maxWidth / boardWidth, maxHeight / boardHeight);

//   const fetchBoardApp = useAppStore((state) => state.fetchBoardApps);
//   const backgroundColor = useColorModeValue('gray.100', 'gray.800');
//   // const boardColor = props.board.data.color + '.400';

//   useEffect(() => {
//     async function fetchApps() {
//       const resApps = await fetchBoardApp(props.board._id);
//       if (resApps) {
//         setApps(resApps);
//       }
//     }
//     fetchApps();
//   }, [props.board._id]);

//   return (
//     <Box
//       width={maxWidth + 'px'}
//       height={maxHeight + 'px'}
//       backgroundColor={backgroundColor}
//       borderRadius="md"
//       pointerEvents="none"
//       // overflow="hidden"
//       transform={`translateX(-${maxWidth / 4}px)`}
//       boxShadow="md"
//       border={`${borderWidth}px solid`}
//       borderColor={borderColor}
//     >
//       {apps.map((app) => {
//         const left = app.data.position.x * scale;
//         const top = app.data.position.y * scale;
//         const width = app.data.size.width * scale;
//         const height = app.data.size.height * scale;
//         return (
//           <Box
//             position="absolute"
//             left={left + 'px'}
//             top={top + 'px'}
//             width={width + 'px'}
//             height={height + 'px'}
//             transition={'all .2s'}
//             _hover={{ backgroundColor: 'teal.200', transform: 'scale(1.1)' }}
//             borderWidth="1px"
//             borderStyle="solid"
//             borderColor={borderColor}
//             backgroundColor={'gray.700'}
//             borderRadius="md"
//             cursor="pointer"
//             display="flex"
//             justifyContent="center"
//             alignItems="center"
//           >
//             <Box backgroundColor="gray.700" p="1" borderRadius="md">
//               <Text fontSize="2xs" color="white">
//                 {app.data.type}
//               </Text>
//             </Box>
//           </Box>
//         );
//         // const Component = Applications[app.data.type].AppComponent;
//         // return (
//         //   // Wrap the components in an errorboundary to protect the board from individual app errors
//         //   <ErrorBoundary
//         //     key={app._id}
//         //     fallbackRender={({ error, resetErrorBoundary }) => (
//         //       <AppError error={error} resetErrorBoundary={resetErrorBoundary} app={app} />
//         //     )}
//         //   >
//         //     <Component key={app._id} {...app}></Component>
//         //   </ErrorBoundary>
//         // );
//       })}
//     </Box>
//   );
// }
