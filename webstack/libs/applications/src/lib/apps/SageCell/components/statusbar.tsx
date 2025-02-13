/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { Badge, Grid, Box, Text, Tooltip } from '@chakra-ui/react';
import { useHexColor } from '@sage3/frontend';

interface StatusBarProps {
  kernelName: string;
  access: boolean;
  online: boolean;
  rank: number;
}

export const StatusBar = (props: StatusBarProps) => {
  const green = useHexColor('green');
  const yellow = useHexColor('yellow');
  const red = useHexColor('red');
  const accessDeniedColor = useHexColor('red');
  const accessAllowColor = useHexColor('green');

  return (
    <Box w={'100%'} borderBottom={`5px solid ${props.access ? accessAllowColor : accessDeniedColor}`} userSelect={'none'}>
      <Grid templateColumns='repeat(3, 1fr)' gap={4}>

        {!props.online ? (
          <></>
        ) : (
          <Badge alignContent={"center"} variant="ghost" color={props.kernelName ? green : yellow} textOverflow={'ellipsis'} fontSize={'lg'}>
            <Tooltip label={'Current evaluation kernel'} placement="top" hasArrow={true} openDelay={400} maxWidth={'fit-content'} >
              {props.kernelName ? `Kernel: ${props.kernelName}` : 'No Kernel Selected'}
            </Tooltip>
          </Badge>
        )}

        <Tooltip label={'Rank in evaluation'} placement="top" hasArrow={true} openDelay={400} maxWidth={'fit-content'}>
          <Text align={"center"} color="teal.500" fontSize={'lg'} fontWeight={'bold'}># {props.rank == 0 ? '' : props.rank}</Text>
        </Tooltip>

        {props.online ? ( // no kernel selected and no access
          <Badge alignContent={"center"} variant="ghost" color={green} textAlign={"right"} fontSize={'lg'}>
            <Tooltip label={'Kernel state'} placement="top" hasArrow={true} openDelay={400} maxWidth={'fit-content'}>
              Online
            </Tooltip>
          </Badge>
        ) : (
          <Badge alignContent={"center"} variant="ghost" color={red} textAlign={"right"} fontSize={'lg'}>
            <Tooltip label={'Kernel state'} placement="top" hasArrow={true} openDelay={400} maxWidth={'fit-content'}>
              Offline
            </Tooltip>
          </Badge>
        )}
      </Grid>
    </Box>
  );
};
