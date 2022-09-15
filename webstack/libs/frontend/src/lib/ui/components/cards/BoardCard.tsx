/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, Button, Tooltip, Text, Icon, useDisclosure, useColorModeValue, useToast } from '@chakra-ui/react';
import { MdPerson, MdLock, MdRemoveRedEye, MdContentCopy } from 'react-icons/md';

import { SBDocument } from '@sage3/sagebase';
import { sageColorByName } from '@sage3/shared';
import { BoardSchema } from '@sage3/shared/types';
import { EnterBoardModal } from '../modals/EnterBoardModal';
import { useUser } from '../../../hooks';

export type BoardCardProps = {
  board: SBDocument<BoardSchema>;
  userCount: number;
  onSelect: () => void;
  onDelete: () => void;
  onEdit: () => void;
};

/**
 * Board card
 *
 * @export
 * @param {BoardCardProps} props
 * @returns
 */
export function BoardCard(props: BoardCardProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { user } = useUser();
  // Is it my board?
  const yours = user?._id === props.board.data.ownerId;
  // Custom text
  const heading = yours ? 'Your' : 'This';
  // Custom color
  const otherColor = useColorModeValue('black', 'white');
  const yourColor = yours ? sageColorByName(user.data.color) : otherColor;

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
      <EnterBoardModal
        id={props.board._id}
        roomId={props.board.data.roomId}
        name={props.board.data.name}
        isPrivate={props.board.data.isPrivate}
        privatePin={props.board.data.privatePin}
        isOpen={isOpen}
        onClose={onClose}
      />
      <Box
        borderWidth="2px"
        borderRadius="md"
        overflow="hidden"
        height="80px"
        my="2"
        pt="2"
        border={`solid ${sageColorByName(props.board.data.color)} 2px`}
        transition="transform .2s"
        cursor="pointer"
        _hover={{ transform: 'scale(1.05)' }}
        style={{ background: `linear-gradient(${sageColorByName(props.board.data.color)} 10%, transparent 10% ) no-repeat` }}
        onClick={props.onSelect}
      >
        <Box px="2" display="flex" flexDirection="row" justifyContent="space-between" alignContent="center">
          <Box display="flex" flexDirection="column">
            <Text fontSize="2xl">{props.board.data.name}</Text>
            <Text fontSize="1xl">{props.board.data.description}</Text>
          </Box>

          <Box display="flex" mt="2" alignItems="center" flexShrink="3">
            <Tooltip label={`${heading} board is unlisted`} placement="top" hasArrow openDelay={200}>
              <div>
                {!props.board.data.isListed ? <Icon aria-label="unlisted" as={MdRemoveRedEye} boxSize={8} color={yourColor} /> : null}
              </div>
            </Tooltip>
            <Tooltip label={`${heading} board is protected`} placement="top" hasArrow openDelay={200}>
              <div>{props.board.data.isPrivate ? <Icon aria-label="protected" as={MdLock} boxSize={8} color={yourColor} /> : null}</div>
            </Tooltip>
            <Tooltip label="Enter this board" openDelay={400} hasArrow>
              <Button
                onClick={onOpen}
                background={sageColorByName(props.board.data.color)}
                _hover={{ transform: 'scale(1.15)' }}
                transition="transform .2s"
                mx="2"
                variant="outline"
              >
                Enter
              </Button>
            </Tooltip>
            <Tooltip label="Copy Board ID into clipboard" openDelay={400} hasArrow>
              <Button
                onClick={handleCopyId}
                background={sageColorByName(props.board.data.color)}
                _hover={{ transform: 'scale(1.15)' }}
                transition="transform .2s"
                variant="outline"
              >
                <MdContentCopy />
              </Button>
            </Tooltip>
            <Box width="50px" display="flex" alignItems="center" justifyContent="right">
              <Text fontSize="1xl" mx="2">
                {props.userCount}
              </Text>
              <MdPerson size="18" />
            </Box>
            <Box as="span" ml="2" color="gray.600" fontSize="sm"></Box>
          </Box>
        </Box>
      </Box>
    </>
  );
}
