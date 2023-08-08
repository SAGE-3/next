import { Badge, Stack, Spacer } from '@chakra-ui/react';
import { truncateWithEllipsis, useHexColor } from '@sage3/frontend';

interface StatusBarProps {
  kernel: string;
  access: boolean;
  online: boolean;
}

export const StatusBar = (props: StatusBarProps) => {
  const green = useHexColor('green');
  const yellow = useHexColor('yellow');
  const red = useHexColor('red');

  return (
    <Stack direction="row" p={1}>
      <Badge variant="ghost" color={!props.access ? yellow : green}>
        {props.kernel ? `Kernel: ${truncateWithEllipsis(props.kernel, 8)}` : 'No Kernel Selected'}
      </Badge>
      <Spacer />
      {!props.online ? ( // no kernel selected and no access
        <Badge variant="ghost" color={red}>
          Offline
        </Badge>
      ) : props.online ? ( // no kernel selected but access
        <Badge variant="ghost" color={props.kernel ? green : yellow}>
          Online
        </Badge>
      ) : !props.access ? ( // kernel selected but no access
        <Badge variant="ghost" color={red}>
          No Access
        </Badge>
      ) : null}
    </Stack>
  );
};
