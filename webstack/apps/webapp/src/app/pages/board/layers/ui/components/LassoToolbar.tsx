/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';

// import { useParams } from 'react-router-dom';

import {
  Box,
  useColorModeValue,
  Text,
  Button,
  Tooltip,
  useDisclosure,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  ButtonGroup,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  color,
} from '@chakra-ui/react';
import { MdCopyAll, MdSend, MdZoomOutMap } from 'react-icons/md';

// import { ToolbarComponent as StickieToolbar} from 'libs/applications/src/lib/apps/Stickie';

import { ColorPicker, ConfirmModal, useAppStore, useBoardStore, useHexColor, useUIStore, useBoardUtils } from '@sage3/frontend';
import { HiOutlineTrash } from 'react-icons/hi';

// buttons for the toolbar
import { BsFillGrid3X3GapFill, BsFillPaletteFill, BsLayoutWtf, BsTypeBold, BsTypeH1, BsWindowStack } from 'react-icons/bs';
import { AiOutlineAppstore } from 'react-icons/ai';
import { CiAlignBottom, CiAlignCenterH, CiAlignLeft, CiAlignCenterV, CiAlignRight, CiAlignTop } from 'react-icons/ci';
import { SAGEColors, colors } from '@sage3/shared';
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
  const duplicate = useAppStore((state) => state.duplicateApps);

  // UI Store
  const lassoApps = useUIStore((state) => state.selectedApps);
  const fitApps = useUIStore((state) => state.fitApps);
  const [showLasso, setShowLasso] = useState(lassoApps.length > 0);

  // Board Utils
  const { alignSelectedApps, organizeApps, assignColor, groupByTopic } = useBoardUtils();
  // const { organizeApps } = useBoardUtils();

  // Local store to track the current set of apps if they are the same type
  const [appGroup, setAppGroup] = useState('none');

  // Boards
  const boards = useBoardStore((state) => state.boards);

  useEffect(() => {
    setShowLasso(lassoApps.length > 0);
    setAppGroup('none');
    // Check if all the selected apps are the same type
    if (lassoApps.length > 0) {
      const selectedApps = apps.filter((el) => lassoApps.includes(el._id));
      const appType = selectedApps[0].data.type;
      const sameType = selectedApps.every((el) => el.data.type === appType);
      if (sameType) {
        setAppGroup(appType);
      } else {
        setAppGroup('none');
      }
    }
  }, [lassoApps]);

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
    setShowLasso(false);
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
              {'Layout Actions'}
            </Text>
            {/* Button Group for all the layout options */}
            <ButtonGroup size="xs" isAttached variant="outline" colorScheme={'teal'}>
              <Tooltip placement="top" hasArrow={true} label={'Align Left'} openDelay={400}>
                <Button onClick={() => alignSelectedApps('left', lassoApps)} size="xs" p="0" mx="2px" colorScheme={'teal'}>
                  <CiAlignLeft />
                </Button>
              </Tooltip>
              <Tooltip placement="top" hasArrow={true} label={'Align Right'} openDelay={400}>
                <Button onClick={() => alignSelectedApps('right', lassoApps)} size="xs" p="0" mx="2px" colorScheme={'teal'}>
                  <CiAlignRight />
                </Button>
              </Tooltip>
              <Tooltip placement="top" hasArrow={true} label={'Align Top'} openDelay={400}>
                <Button onClick={() => alignSelectedApps('top', lassoApps)} size="xs" p="0" mx="2px">
                  <CiAlignTop />
                </Button>
              </Tooltip>
              <Tooltip placement="top" hasArrow={true} label={'Align Bottom'} openDelay={400}>
                <Button onClick={() => alignSelectedApps('bottom', lassoApps)} size="xs" p="0" mx="2px">
                  <CiAlignBottom />
                </Button>
              </Tooltip>
              <Tooltip placement="top" hasArrow={true} label={'Align Evenly'} openDelay={400}>
                <Button onClick={() => alignSelectedApps('even', lassoApps)} size="xs" p="0" mx="2px">
                  <AiOutlineAppstore />
                </Button>
              </Tooltip>
              <Tooltip placement="top" hasArrow={true} label={'Stack Apps'} openDelay={400}>
                <Button onClick={() => alignSelectedApps('stack', lassoApps)} size="xs" p="0" mx="2px" colorScheme={'teal'}>
                  <BsWindowStack />
                </Button>
              </Tooltip>
            </ButtonGroup>

            {/* Button group for the app type specific actions */}
            {/* {appGroup === 'SageCell' && ( // SageCell specific actions (assign kernel, run all, etc)
              <ButtonGroup size="xs" isAttached variant="outline" colorScheme={'teal'}>
                <Tooltip placement="top" hasArrow={true} label={'Assign Kernel'} openDelay={400}>
                  <Button onClick={() => assignKernel(lassoApps)} size="xs" p="0" mx="2px" colorScheme={'teal'}>
                    <BsTerminalFill />
                  </Button>
                </Tooltip>
                <Tooltip placement="top" hasArrow={true} label={'Run All'} openDelay={400}>
                  <Button onClick={() => runAll(lassoApps)} size="xs" p="0" mx="2px" colorScheme={'teal'}>
                    <BsPlayFill />
                  </Button>
                </Tooltip>
                <Tooltip placement="top" hasArrow={true} label={'Stop All'} openDelay={400}>
                  <Button onClick={() => stopAll(lassoApps)} size="xs" p="0" mx="2px" colorScheme={'teal'}>
                    <BsStopFill />
                  </Button>
                </Tooltip>
              </ButtonGroup>
            )} */}
            {/* Add a label for the button group */}
            {appGroup === 'Stickie' && (
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
                {'Stickie Actions'}
              </Text>
            )}
            {/* Button group for the app type specific actions related to Stickies*/}
            {appGroup === 'Stickie' && (
              <ButtonGroup size="xs" isAttached variant="outline" colorScheme={'teal'}>
                <Tooltip placement="top" hasArrow={true} label={'Change Color'} openDelay={400}>
                  {/* Dropdown for color picker */}
                  <Popover size={'md'}>
                    <PopoverTrigger>
                      <Button size="xs" p="0" mx="2px" colorScheme={'teal'}>
                        <BsFillPaletteFill />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <PopoverArrow />
                      <PopoverCloseButton />
                      <PopoverHeader>Change Color</PopoverHeader>
                      <PopoverBody>
                        <ButtonGroup size="md" colorScheme="teal">
                          {colors.map((color) => {
                            const c = useHexColor(color);
                            return (
                              <Button
                                key={c}
                                value={c}
                                bgColor={c}
                                _hover={{ background: c, opacity: 0.7, transform: 'scaleY(1.2)' }}
                                _active={{ background: c, opacity: 0.9 }}
                                size={'md'}
                                onClick={() => assignColor(color, lassoApps)}
                              />
                            );
                          })}
                        </ButtonGroup>
                      </PopoverBody>
                    </PopoverContent>
                  </Popover>
                </Tooltip>
                <Tooltip placement="top" hasArrow={true} label={'Group By Topic'} openDelay={400}>
                  <Button onClick={() => groupByTopic(lassoApps)} size="xs" p="0" mx="2px" colorScheme={'teal'}>
                    <BsFillGrid3X3GapFill />
                  </Button>
                </Tooltip>

                {/* <Tooltip placement="top" hasArrow={true} label={'Change Font'} openDelay={400}>
                  <Button onClick={() => changeFont(lassoApps)} size="xs" p="0" mx="2px" colorScheme={'teal'}>
                    <BsTypeBold />
                  </Button>
                </Tooltip>
                <Tooltip placement="top" hasArrow={true} label={'Change Font Size'} openDelay={400}>
                  <Button onClick={() => changeFontSize(lassoApps)} size="xs" p="0" mx="2px" colorScheme={'teal'}>
                    <BsTypeH1 />
                  </Button>
                </Tooltip> */}
              </ButtonGroup>
            )}

            <Box alignItems="center" p="1" width="100%" display="flex" height="32px" userSelect={'none'}>
              <Tooltip placement="top" hasArrow={true} label={'Organize Selected Apps'} openDelay={400}>
                <Button onClick={() => organizeApps('app_type', 'tiles', lassoApps)} size="xs" p="0" mx="2px" colorScheme={'teal'}>
                  <BsLayoutWtf />
                </Button>
              </Tooltip>

              <Tooltip placement="top" hasArrow={true} label={'Zoom to selected Apps'} openDelay={400}>
                <Button onClick={fitSelectedApps} size="xs" p="0" mr="2px" colorScheme={'teal'}>
                  <MdZoomOutMap />
                </Button>
              </Tooltip>
              <Tooltip placement="top" hasArrow={true} label={'Duplicate Apps'} openDelay={400}>
                <Button onClick={() => duplicate(lassoApps)} size="xs" p="0" mx="2px" colorScheme={'teal'}>
                  <MdCopyAll />
                </Button>
              </Tooltip>

              <Menu preventOverflow={false} placement={'top'}>
                <Tooltip placement="top" hasArrow={true} label={'Duplicate Apps to a different Board'} openDelay={400}>
                  <MenuButton mx="2px" size={'xs'} as={Button} colorScheme={'teal'}>
                    <MdSend />
                  </MenuButton>
                </Tooltip>
                <MenuList>
                  {boards.map((b) => {
                    return (
                      <MenuItem key={b._id} onClick={() => duplicate(lassoApps, b)}>
                        {b.data.name}
                      </MenuItem>
                    );
                  })}
                </MenuList>
              </Menu>

              <Tooltip placement="top" hasArrow={true} label={'Close the selected Apps'} openDelay={400}>
                <Button onClick={deleteOnOpen} size="xs" p="0" mx="2px" colorScheme={'red'}>
                  <HiOutlineTrash size="18px" />
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
