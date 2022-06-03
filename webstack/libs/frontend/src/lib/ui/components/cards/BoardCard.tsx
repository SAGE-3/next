/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, Button, Divider, IconButton, Text } from "@chakra-ui/react";
import { sageColorByName } from "@sage3/shared";
import { BoardSchema } from "@sage3/shared/types";
import { MdPerson, MdSettings } from "react-icons/md";

export type BoardCardProps = {
  board: BoardSchema;
  onEnter: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

export function BoardCard(props: BoardCardProps) {
  return (
    <Box
      borderWidth='2px'
      borderRadius='lg'
      overflow='hidden'
      height="80px"
      my="2"
      pt="2"
      border={`solid ${sageColorByName(props.board.color)} 2px`}
      transition="transform .2s"
      cursor="pointer"
      _hover={{ transform: "scale(1.1)" }}
      style={{ background: `linear-gradient(${sageColorByName(props.board.color)} 10%, transparent 10% ) no-repeat` }}
      onClick={props.onEnter}>

      <Box px="2" display='flex' flexDirection="row" justifyContent="space-between" alignContent="center">
        <Box display='flex' flexDirection="column">
          <Text fontSize='2xl'>{props.board.name}
          </Text>
          <Text fontSize='1xl'>{props.board.description}
          </Text>
        </Box>
        <Box display='flex' mt='2' alignItems='center'>
          <Text fontSize='1xl' mx="2">{Math.floor(Math.random() * 20)}
          </Text>
          <MdPerson
            size="18"
            color={'white'}
          />

          <Box as='span' ml='2' color='gray.600' fontSize='sm'>

          </Box>
        </Box>
      </Box>
    </Box >
  );
}