import { Badge, Stack, Spacer, Box } from '@chakra-ui/react';
import { truncateWithEllipsis, useHexColor } from '@sage3/frontend';

interface StatusBarProps {
  kernelName: string;
  access: boolean;
  online: boolean;
}

export const StatusBar = (props: StatusBarProps) => {
  const green = useHexColor('green');
  const yellow = useHexColor('yellow');
  const red = useHexColor('red');

  const accessDeniedColor = useHexColor('red');
  const accessAllowColor = useHexColor('green');

  return (
    <Box w={'100%'} borderBottom={`5px solid ${props.access ? accessAllowColor : accessDeniedColor}`}>
      <Stack direction="row" p={1}>
        {!props.online ? (
          <></>
        ) : (
          <Badge variant="ghost" color={props.kernelName ? green : yellow} textOverflow={'ellipsis'} width="200px">
            {props.kernelName ? `Kernel: ${props.kernelName}` : 'No Kernel Selected'}
          </Badge>
        )}

        <Spacer />
        {props.online ? ( // no kernel selected and no access
          <Badge variant="ghost" color={green}>
            Online
          </Badge>
        ) : (
          <Badge variant="ghost" color={red}>
            Offline
          </Badge>
        )}
      </Stack>
    </Box>
  );
};
