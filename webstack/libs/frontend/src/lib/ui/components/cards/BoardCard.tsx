/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Badge, Box, Button } from "@chakra-ui/react";
import { BoardSchema } from "@sage3/shared/types";

export type BoardCardProps = {
  board: BoardSchema;
  onEnter: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

export function BoardCard(props: BoardCardProps) {
  return (
    <Box borderWidth='2px' borderRadius='lg' overflow='hidden' width="250px" height="225px">

      <Box p='6'>
        <Box display='flex' alignItems='baseline'>
          <Badge colorScheme={props.board.color}>{props.board.name}</Badge>
        </Box>

        <Box
          mt='1'
          fontWeight='semibold'
          as='h4'
          lineHeight='tight'
        >
          {props.board.description}
        </Box>

        <Box display='flex' flexDirection='column' width="200px">
          <Button size="sm" onClick={props.onEnter} colorScheme="teal" mt='2'>Enter</Button>
          <Button size="sm" onClick={props.onEdit} colorScheme="green" mt='2'>Edit</Button>
          <Button size="sm" onClick={props.onDelete} colorScheme="red" mt='2'>Delete</Button>
        </Box>
      </Box>
    </Box>
  );
}