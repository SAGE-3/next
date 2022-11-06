/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import { Box } from '@chakra-ui/react';
import { useHexColor } from '@sage3/frontend';

type ElectronRequiredWarningProps = {
  appName: string;
};

export function ElectronRequired(props: ElectronRequiredWarningProps): JSX.Element {
  // Link Color
  const linkColor = useHexColor('teal');
  return (
    <Box display="flex" flexDir="column" height="100%" width="100%" justifyContent="center" alignContent="center">
      <Box display="flex" justifyContent="center" width="100%" textAlign="center" fontWeight="bold">
        <span>
          {props.appName} is only supported within the {''}
          <a href="https://sage3.sagecommons.org/" style={{ color: linkColor }} target="_blank">
            <u>SAGE3 Desktop Application</u>
          </a>
        </span>
      </Box>
    </Box>
  );
}
