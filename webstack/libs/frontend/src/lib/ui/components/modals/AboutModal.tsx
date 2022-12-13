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
  ModalFooter,
  ModalBody,
  Button,
  ModalCloseButton,
  Box,
  useToast,
  useColorModeValue,
  Tooltip,
} from '@chakra-ui/react';

import { MdContentCopy } from 'react-icons/md';
import { GetServerInfo, useHexColor } from '@sage3/frontend';
import { useEffect, useState } from 'react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Check if browser is Electron based on the userAgent.
 * @returns {boolean}
 */
export function isElectron(): boolean {
  return typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.includes('Electron');
}

/**
 * About Modal
 * @param props
 * @returns
 */
export function AboutModal(props: AboutModalProps): JSX.Element {
  const [clientVersion, setClientVersion] = useState('');
  const [serverVersion, setServerVersion] = useState('');
  const authors = 'SAGE3 Development Team';
  const liscense = 'SAGE3 License';
  const website = 'sage3.sagecommons.org';
  const toast = useToast();
  const cc = useColorModeValue('teal.600', 'teal.200');
  const copyColor = useHexColor(cc);

  // Get Client info
  useEffect(() => {
    if (isElectron()) {
      const electron = window.require('electron');
      const ipcRenderer = electron.ipcRenderer;
      ipcRenderer.send('client-info-request', {});
      ipcRenderer.on('client-info-response', async (evt: any, info: any) => {
        setClientVersion('Electron ' + info.version);
      });
    } else {
      setClientVersion('Browser');
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

  const copyWebsiteUrl = () => {
    navigator.clipboard.writeText('https://' + website);
    toast({
      title: 'Success',
      description: `Copied website url to clipboard.`,
      duration: 3000,
      isClosable: true,
      status: 'success',
    });
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
              <Box fontWeight={'bold'}>Author</Box>
              <Box fontWeight={'bold'}>License</Box>
              <Box fontWeight={'bold'}>Client Version</Box>
              <Box fontWeight={'bold'}>Server Version</Box>
              <Box fontWeight={'bold'}>Website</Box>
            </Box>
            <Box display="flex" flexDir="column" textAlign={'left'} width="100%">
              <Box>{authors}</Box>
              <Box>{liscense}</Box>
              <Box>{clientVersion}</Box>
              <Box>{serverVersion}</Box>
              <Box display="flex">
                {website}
                <Tooltip
                  label="Copy website url to clipboard"
                  aria-label="Copy website url to clipboard"
                  shouldWrapChildren
                  openDelay={500}
                  hasArrow
                  placement="top"
                >
                  <MdContentCopy
                    color={copyColor}
                    style={{ transform: 'translateY(4px)', paddingLeft: '2px', cursor: 'pointer', fontSize: '20px' }}
                    onClick={copyWebsiteUrl}
                  />
                </Tooltip>
              </Box>
            </Box>
          </Box>
        </ModalBody>

        {/* <ModalFooter>
          <Button colorScheme="teal" onClick={props.onClose}>
            Close
          </Button>
        </ModalFooter> */}
      </ModalContent>
    </Modal>
  );
}
