/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, Button, Tooltip, Text, Icon } from '@chakra-ui/react';
import { SBDocument } from '@sage3/sagebase';
import { sageColorByName } from '@sage3/shared';
import { BoardSchema } from '@sage3/shared/types';
import { MdPerson, MdLock, MdRemoveRedEye } from 'react-icons/md';

export type BoardCardProps = {
  board: SBDocument<BoardSchema>;
  userCount: number;
  onSelect: () => void;
  onEnter: () => void;
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
  // const textColor = useColorModeValue("white", "black");
  return (
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
          <Tooltip label={'This board is unlisted.'} placement="top" hasArrow openDelay={400}>
            <div>
              {!props.board.data.isListed ? (
                <Icon aria-label="unlisted" as={MdRemoveRedEye} boxSize={8} />
              ) : null}
            </div>
          </Tooltip>
          <Tooltip label={'This board is protected.'} placement="top" hasArrow openDelay={400}>
            <div>
              {props.board.data.isPrivate ? (
                <Icon aria-label="protected" as={MdLock} boxSize={8} />
              ) : null}
            </div>
          </Tooltip>
          <Tooltip label="Enter this board" openDelay={400}>
            <Button
              onClick={props.onEnter}
              background={sageColorByName(props.board.data.color)}
              _hover={{ transform: 'scale(1.15)' }}
              transition="transform .2s"
              mx="2"
              variant="outline"
            >
              Enter
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
  );
}
