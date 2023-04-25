import { Badge, Stack, Spacer, useDisclosure } from '@chakra-ui/react';
import { truncateWithEllipsis } from '@sage3/frontend';
import { memo, useState } from 'react';
import { HelpModal } from './help';

interface StatusBarProps {
  kernel: string;
  access: boolean;
  isTyping: boolean;
  bgColor: string;
}

// export const Status = memo(StatusBar);
const defaultPlaceHolderValue = 'Tell me what you want to do...';
const [placeHolderValue, setPlaceHolderValue] = useState<string>(defaultPlaceHolderValue);
const { isOpen: helpIsOpen, onOpen: helpOnOpen, onClose: helpOnClose } = useDisclosure();

export const TopBar = memo(({ kernel, access, isTyping, bgColor }: StatusBarProps) => {
  return (
    <Stack direction="row" mb={-1} mt={-1}>
      <Badge
        variant="outline"
        colorScheme="green"
        onMouseOver={() => setPlaceHolderValue('Load the file named "test.csv"')}
        onMouseLeave={() => setPlaceHolderValue(defaultPlaceHolderValue)}
      >
        Load a file
      </Badge>
      <Badge
        variant="outline"
        colorScheme="green"
        onMouseOver={() => setPlaceHolderValue('Select the first 10 rows of the dataframe named "working_df"')}
        onMouseLeave={() => setPlaceHolderValue(defaultPlaceHolderValue)}
      >
        Query a dataframe
      </Badge>
      <Badge
        variant="outline"
        colorScheme="green"
        onMouseOver={() => setPlaceHolderValue('Show me a histogram based on the column "age"')}
        onMouseLeave={() => setPlaceHolderValue(defaultPlaceHolderValue)}
      >
        Create a visualization
      </Badge>
      <Spacer />
      <Badge variant="ghost">{isTyping ? `typing...` : ''}</Badge>
      {!kernel && !access ? ( // no kernel selected and no access
        <Badge variant="outline" colorScheme="red">
          Offline{' '}
        </Badge>
      ) : !kernel && access ? ( // no kernel selected but access
        <Badge variant="outline" colorScheme="red">
          Error{' '}
        </Badge>
      ) : kernel && !access ? ( // kernel selected but no access
        <Badge variant="outline" colorScheme="red">
          No Access{' '}
        </Badge>
      ) : kernel && access ? ( // kernel selected and access
        <Badge variant="outline" colorScheme="green">
          Online{' '}
        </Badge>
      ) : null}
    </Stack>
  );
});

// export const StatusBar = memo(({ kernel, access, isTyping, bgColor }: StatusBarProps) => {
//   return (
//     <>
//       <TopBar kernel={kernel} access={access} isTyping={isTyping} bgColor={bgColor} />
//       <HelpModal isOpen={helpIsOpen} onClose={helpOnClose} />
//     </>
//   );
// });
