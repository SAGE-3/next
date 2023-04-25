import { Badge, Stack, Spacer } from '@chakra-ui/react';
import { truncateWithEllipsis } from '@sage3/frontend';

interface StatusBarProps {
  kernel: string;
  access: boolean;
  isTyping: boolean;
  bgColor: string;
}

export const StatusBar = (props: StatusBarProps) => {
  return (
    <Stack direction="row" bgColor={props.bgColor} p={1}>
      <Badge variant="outline" colorScheme="blue">
        {props.kernel ? `Kernel: ${truncateWithEllipsis(props.kernel, 8)}` : 'No Kernel Selected'}
      </Badge>
      <Badge variant="ghost" colorScheme="red">
        {props.isTyping ? `typing...` : ''}
      </Badge>
      <Spacer />
      {!props.kernel && !props.access ? ( // no kernel selected and no access
        <Badge variant="outline" colorScheme="red">
          Offline{' '}
        </Badge>
      ) : !props.kernel && props.access ? ( // no kernel selected but access
        <Badge variant="outline" colorScheme="yellow">
          Online{' '}
        </Badge>
      ) : props.kernel && !props.access ? ( // kernel selected but no access
        <Badge variant="outline" colorScheme="red">
          No Access{' '}
        </Badge>
      ) : props.kernel && props.access ? ( // kernel selected and access
        <Badge variant="outline" colorScheme="green">
          Online{' '}
        </Badge>
      ) : null}
    </Stack>
  );
};
