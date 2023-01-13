/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { Box, useColorModeValue, Text, Button, Tooltip, useDisclosure } from '@chakra-ui/react';
import { MdClose, MdZoomOutMap } from 'react-icons/md';
import { ConfirmModal, useAppStore, useHexColor, useUIStore } from '@sage3/frontend';

/**
 * Lasso Toolbar Component
 *
 * @export
 * @param {AppToolbarProps} props
 * @returns
 */
export function LassoToolbar() {
  // App Store
  const apps = useAppStore((state) => state.apps);
  const deleteApp = useAppStore((state) => state.delete);

  // UI Store
  const lassoApps = useUIStore((state) => state.selectedApps);
  const fitApps = useUIStore((state) => state.fitApps);
  const showLasso = lassoApps.length > 0;

  // Theme
  const background = useColorModeValue('gray.50', 'gray.700');
  const panelBackground = useHexColor(background);
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const borderColor = useColorModeValue('gray.200', 'gray.500');

  // Modal disclosure for the Close selected apps
  const { isOpen: deleteIsOpen, onClose: deleteOnClose, onOpen: deleteOnOpen } = useDisclosure();

  // Close all the selected apps
  const closeSelectedApps = () => {
    lassoApps.forEach((app) => {
      deleteApp(app);
    });
    deleteOnClose();
  };

  // Zoom the user's view to fit all the selected apps
  const fitSelectedApps = () => {
    const selectedApps = apps.filter((el) => lassoApps.includes(el._id));
    fitApps(selectedApps);
  };
  return (
    <>
      {showLasso && (
        <Box
          transform={`translateX(-50%)`}
          position="absolute"
          left="50vw"
          bottom="6px"
          border="solid 3px"
          borderColor={borderColor}
          bg={panelBackground}
          p="2"
          rounded="md"
        >
          <Box display="flex" flexDirection="column">
            <Text
              w="100%"
              textAlign="left"
              mx={1}
              color={textColor}
              fontSize={12}
              fontWeight="bold"
              h={'auto'}
              userSelect={'none'}
              className="handle"
            >
              {'Actions'}
            </Text>
            <Box alignItems="center" p="1" width="100%" display="flex" height="32px" userSelect={'none'}>
              <Tooltip placement="top" hasArrow={true} label={'Zoom To Selected Apps'} openDelay={400}>
                <Button
                  onClick={fitSelectedApps}
                  size="xs"
                  _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}
                  mr="2px"
                  colorScheme={'teal'}
                >
                  <MdZoomOutMap />
                </Button>
              </Tooltip>
              <Tooltip placement="top" hasArrow={true} label={'Close Selected Apps'} openDelay={400}>
                <Button onClick={deleteOnOpen} size="xs" _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }} mx="2px" colorScheme={'red'}>
                  <MdClose />
                </Button>
              </Tooltip>
            </Box>
          </Box>
        </Box>
      )}
      <ConfirmModal
        isOpen={deleteIsOpen}
        onClose={deleteOnClose}
        onConfirm={closeSelectedApps}
        title="Close Selected Apps"
        message={`Are you sure you want to close the selected ${lassoApps.length > 1 ? `${lassoApps.length} apps?` : 'app?'} `}
        cancelText="Cancel"
        confirmText="Yes"
        confirmColor="teal"
      ></ConfirmModal>
    </>
  );
}
