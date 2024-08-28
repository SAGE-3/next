/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  Text,
  ModalCloseButton,
  Box,
  useColorModeValue,
} from '@chakra-ui/react';

import { getBrowserType, GetServerInfo, isElectron, useHexColor } from '@sage3/frontend';

// Props for the AboutModal
interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * About Modal
 * @param props
 * @returns
 */
export function AboutModal(props: AboutModalProps): JSX.Element {
  // URLs of SAGE3 resources
  const s3homeURL = 'https://sage3.sagecommons.org';
  const s3homeDisplay = 'sage3.sagecommons.org';
  const licenseURL = 'https://sage3.sagecommons.org/?page_id=79';
  const licenseDisplay = 'SAGE3 License';
  const authorsURL = 'https://sage3.sagecommons.org/?page_id=57';
  const authorsDisplay = 'SAGE3 Development Team';

  // Versions
  const [clientVersion, setClientVersion] = useState('');
  const [serverVersion, setServerVersion] = useState('');

  const cc = useColorModeValue('teal.600', 'teal.200');
  const copyColor = useHexColor(cc);
  const electron = isElectron();

  // Get Client info
  useEffect(() => {
    if (electron) {
      window.electron.on('client-info-response', async (info: { version: string }) => {
        setClientVersion(info.version);
      });
      window.electron.send('client-info-request', {});
    } else {
      const browser = getBrowserType();
      setClientVersion(browser);
    }
  }, []);

  // Get Server info
  useEffect(() => {
    async function getServerInfo() {
      const info = await GetServerInfo();
      const version = info.version;
      setServerVersion(version ? version : 'Unknown');
    }
    getServerInfo();
  }, []);

  // Send a IPC message to the main process to check for updates
  // Uses Luc's update checker
  const checkForUpdates = () => {
    window.electron.send('client-update-check', {});
  };

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>About SAGE3</ModalHeader>
        <ModalCloseButton />
        <ModalBody px={8} pb={8}>
          <Box display="flex" flexDir="row" justifyContent="space-evenly">
            <Box display="flex" flexDir="column" textAlign={'left'} width="55%">
              <Box fontWeight={'bold'}>Authors</Box>
              <Box fontWeight={'bold'}>License</Box>
              <Box fontWeight={'bold'}>Client Version</Box>
              <Box fontWeight={'bold'}>Hub Version</Box>
              <Box fontWeight={'bold'}>Website</Box>
            </Box>
            <Box display="flex" flexDir="column" textAlign={'left'} width="100%">
              {/* Authors */}
              <Box>
                <WebsiteLink url={authorsURL} displayText={authorsDisplay} color={copyColor} />
              </Box>

              {/* License */}
              <Box>
                <WebsiteLink url={licenseURL} displayText={licenseDisplay} color={copyColor} />
              </Box>

              {/* Client Info */}
              <Box>
                {/* If a browser just show the browser type. If Electron display the version number and allow user's to click to run the update checker */}
                {electron ? (
                  <Text onClick={checkForUpdates} cursor="pointer" color={copyColor}>
                    {clientVersion}
                  </Text>
                ) : (
                  clientVersion
                )}
              </Box>

              {/* Server Info */}
              <Box>{serverVersion}</Box>

              {/* Website */}
              <Box display="flex">
                <WebsiteLink url={s3homeURL} displayText={s3homeDisplay} color={copyColor} />
              </Box>
            </Box>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

/**
 * Website Link Props
 */
type WebsiteLinkProps = { url: string; displayText: string; color: string };

/**
 * Component to render a website link that will account for client type of Electron or normal Browser
 * @param props ()
 * @returns
 */
function WebsiteLink(props: WebsiteLinkProps): JSX.Element {
  // the target 'sage3' target is recognized by the electron main process and will open the url in the user's default browser
  return (
    <a href={props.url} target="sage3" rel="noreferrer" style={{ textDecoration: 'none', color: props.color }}>
      {props.displayText}
    </a>
  );
}
