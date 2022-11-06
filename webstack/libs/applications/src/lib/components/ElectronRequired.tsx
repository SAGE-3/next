/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import { Box } from '@chakra-ui/react';

import { useHexColor } from '@sage3/frontend';

/**
 * Props for ElectronRequired
 */
type ElectronRequiredWarningProps = {
  appName: string;
  // link information: href and text
  link: string;
  title: string;
};

/**
 * Display a warning that the application requires Electron.
 *
 * @export
 * @param {ElectronRequiredWarningProps} props
 * @returns {JSX.Element}
 */
export function ElectronRequired(props: ElectronRequiredWarningProps): JSX.Element {
  // Link Color
  const linkColor = useHexColor('teal');
  return (
    <Box fontSize="1.5rem" display="flex" flexDir="column" height="100%" width="100%" justifyContent="center" alignContent="center">
      <Box display="flex" justifyContent="center" width="100%" textAlign="center" fontWeight="bold">
        <span>
          {props.appName} is only supported within the <a href="https://sage3.sagecommons.org/" style={{ color: linkColor }} target="_blank">
            SAGE3 Desktop Application
          </a>
        </span>
      </Box>
      <Box display="flex" justifyContent="center" width="100%" textAlign="center" mt="40px">
        <a style={{ color: linkColor }} href={props.link} rel="noreferrer" target="_blank">
          {props.title}
        </a>
      </Box>
    </Box>
  );
}
