/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  Text,
  ModalCloseButton,
  Box,
  useToast,
  useColorModeValue,
  Tooltip,
} from '@chakra-ui/react';

import { getBrowserType, GetServerInfo, isElectron, useHexColor } from '@sage3/frontend';
import { useEffect, useState } from 'react';

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
      const electron = window.require('electron');
      const ipcRenderer = electron.ipcRenderer;
      ipcRenderer.send('client-info-request', {});
      ipcRenderer.on('client-info-response', async (evt: any, info: any) => {
        setClientVersion(info.version);
      });
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
    const electron = window.require('electron');
    const ipcRenderer = electron.ipcRenderer;
    ipcRenderer.send('client-update-check', {});
  };

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>About</ModalHeader>
        <ModalCloseButton />
        <ModalBody px={8} pb={8}>
          <Box display="flex" flexDir="row" justifyContent="space-evenly">
            <Box display="flex" flexDir="column" textAlign={'left'} width="55%">
              <Box fontWeight={'bold'}>Authors</Box>
              <Box fontWeight={'bold'}>License</Box>
              <Box fontWeight={'bold'}>Client Version</Box>
              <Box fontWeight={'bold'}>Server Version</Box>
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
 * Component to render a website link that will account for client type of Electorn or normal Browser
 * @param props ()
 * @returns
 */
function WebsiteLink(props: WebsiteLinkProps): JSX.Element {
  const electron = isElectron();
  const toast = useToast();

  // Copy the website url to the clipboard
  // This is for electron only, so we don't redirect the user within electron to the sage3 website
  const copyWebsiteUrl = () => {
    navigator.clipboard.writeText(props.url);
    toast({
      title: 'Success',
      description: `Copied URL to clipboard.`,
      duration: 3000,
      isClosable: true,
      status: 'success',
    });
  };

  return electron ? (
    <>
      <Tooltip
        label="Copy website url to clipboard"
        aria-label="Copy website url to clipboard"
        shouldWrapChildren
        openDelay={500}
        hasArrow
        placement="top"
      >
        <Text color={props.color} cursor="pointer" onClick={copyWebsiteUrl}>
          {props.displayText}
        </Text>
      </Tooltip>
    </>
  ) : (
    <a href={props.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: props.color }}>
      {props.displayText}
    </a>
  );
}
