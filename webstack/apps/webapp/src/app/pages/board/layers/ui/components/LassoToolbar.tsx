/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
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
  Select,
} from '@chakra-ui/react';
import {
  MdAlignHorizontalCenter,
  MdAlignHorizontalLeft,
  MdAlignHorizontalRight,
  MdAlignVerticalBottom,
  MdAlignVerticalCenter,
  MdAlignVerticalTop,
  MdAutoAwesomeMotion,
  MdBarChart,
  MdCopyAll,
  MdGridView,
  MdSend,
  MdZoomOutMap,
} from 'react-icons/md';
import { VscVariableGroup } from 'react-icons/vsc';
import { HiOutlineTrash } from 'react-icons/hi';
// buttons for the toolbar
import { BsFillGrid3X3GapFill, BsFillPaletteFill, BsLayoutWtf } from 'react-icons/bs';

import { ConfirmModal, useAppStore, useBoardStore, useHexColor, useUIStore, useBoardUtils, useUser } from '@sage3/frontend';

import { colors } from '@sage3/shared';
import { useParams } from 'react-router-dom';

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
  const lassoApps = useUIStore((state) => state.selectedAppsIds);
  const fitApps = useUIStore((state) => state.fitApps);
  const [showLasso, setShowLasso] = useState(lassoApps.length > 0);
  const { user } = useUser();

  // Boards
  const boards = useBoardStore((state) => state.boards);
  const boardId = useParams<{ boardId: string }>().boardId;

  const { alignSelectedApps, assignColor, groupByTopic, organizeApps, assignKernel, smartAlign } = useBoardUtils();

  // Theme
  const background = useColorModeValue('gray.50', 'gray.700');
  const panelBackground = useHexColor(background);
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const borderColor = useColorModeValue('gray.200', 'gray.500');

  // Local store to track the current set of apps if they are the same type
  const [appGroup, setAppGroup] = useState('none');

  // Modal disclosure for the Close selected apps
  const { isOpen: deleteIsOpen, onClose: deleteOnClose, onOpen: deleteOnOpen } = useDisclosure();

  const [myKernels, setMyKernels] = useState<{ value: Record<string, any>; key: string }[]>([]);

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

  // Close all the selected apps
  const closeSelectedApps = () => {
    deleteApp(lassoApps);
    deleteOnClose();
    setShowLasso(false);
  };

  // Zoom the user's view to fit all the selected apps
  const fitSelectedApps = () => {
    const selectedApps = apps.filter((el) => lassoApps.includes(el._id));
    fitApps(selectedApps);
  };

  function getMyKernels() {
    if (!user || !lassoApps.length) return;
    if (lassoApps.length > 0 && appGroup === 'SageCell') {
      // get the available kernels from the first selected app
      const selectedApps = apps.filter((el) => lassoApps.includes(el._id));
      // get the board id
      const boardId = selectedApps[0].data.boardId;
      const availableKernels = selectedApps[0].data.state.availableKernels;
      // filter kernels by board
      const kernels = availableKernels.filter((el: { value: { board: string } }) => el.value.board === boardId);
      // keep public kernels and kernels owned by the user
      const myKernels = kernels.filter(
        (kernel: { value: { is_private: any; owner_uuid: string } }) => !kernel.value.is_private || kernel.value.owner_uuid === user?._id
      );
      setMyKernels(myKernels);
    }
  }

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
                {/* <Button onClick={() => alignSelectedApps('left', lassoApps)} size="xs" p="0" mx="2px" colorScheme={'teal'}> */}
                <Button
                  onClick={() => smartAlign(boardId ? boardId : 'none', 'left', lassoApps)}
                  size="xs"
                  p="0"
                  mx="2px"
                  colorScheme={'teal'}
                >
                  <MdAlignHorizontalLeft />
                </Button>
              </Tooltip>
              <Tooltip placement="top" hasArrow={true} label={'Align Right'} openDelay={400}>
                {/* <Button onClick={() => alignSelectedApps('right', lassoApps)} size="xs" p="0" mx="2px" colorScheme={'teal'}> */}
                <Button
                  onClick={() => smartAlign(boardId ? boardId : 'none', 'right', lassoApps)}
                  size="xs"
                  p="0"
                  mx="2px"
                  colorScheme={'teal'}
                >
                  <MdAlignHorizontalRight />
                </Button>
              </Tooltip>
              <Tooltip placement="top" hasArrow={true} label={'Align Top'} openDelay={400}>
                <Button onClick={() => smartAlign(boardId ? boardId : 'none', 'top', lassoApps)} size="xs" p="0" mx="2px">
                  <MdAlignVerticalTop />
                </Button>
              </Tooltip>
              <Tooltip placement="top" hasArrow={true} label={'Align Bottom'} openDelay={400}>
                <Button onClick={() => smartAlign(boardId ? boardId : 'none', 'bottom', lassoApps)} size="xs" p="0" mx="2px">
                  <MdAlignVerticalBottom />
                </Button>
              </Tooltip>
              <Tooltip placement="top" hasArrow={true} label={'Grid'} openDelay={400}>
                <Button onClick={() => alignSelectedApps('grid', lassoApps)} size="xs" p="0" mx="2px">
                  <MdGridView />
                </Button>
              </Tooltip>
            </ButtonGroup>
            <ButtonGroup size="xs" isAttached variant="outline" colorScheme={'teal'}>
              <Tooltip placement="top" hasArrow={true} label={'Align in Columns'} openDelay={400}>
                <Button onClick={() => alignSelectedApps('column', lassoApps)} size="xs" p="0" mx="2px">
                  <MdBarChart />
                </Button>
              </Tooltip>
              <Tooltip placement="top" hasArrow={true} label={'Align in Rows'} openDelay={400}>
                <Button
                  onClick={() => alignSelectedApps('row', lassoApps)}
                  size="xs"
                  p="0"
                  mx="2px"
                  colorScheme={'teal'}
                  transform={`rotate(90deg)`}
                >
                  <MdBarChart />
                </Button>
              </Tooltip>
              <Tooltip placement="top" hasArrow={true} label={'Center Align Column'} openDelay={400}>
                <Button onClick={() => alignSelectedApps('center', lassoApps)} size="xs" p="0" mx="2px">
                  <MdAlignHorizontalCenter />
                </Button>
              </Tooltip>
              <Tooltip placement="top" hasArrow={true} label={'Middle Align Row'} openDelay={400}>
                <Button onClick={() => alignSelectedApps('middle', lassoApps)} size="xs" p="0" mx="2px">
                  <MdAlignVerticalCenter />
                </Button>
              </Tooltip>
              <Tooltip placement="top" hasArrow={true} label={'Stack Apps'} openDelay={400}>
                <Button onClick={() => alignSelectedApps('stack', lassoApps)} size="xs" p="0" mx="2px" colorScheme={'teal'}>
                  <MdAutoAwesomeMotion />
                </Button>
              </Tooltip>
            </ButtonGroup>

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

            {appGroup === 'Stickie' && (
              <ButtonGroup size="xs" isAttached variant="outline" colorScheme={'teal'}>
                <Popover size={'md'}>
                  <Tooltip placement="top" hasArrow={true} label={'Change Color'} openDelay={400}>
                    <Box display="inline-block">
                      <PopoverTrigger>
                        <Button size="xs" p="0" mx="2px" colorScheme={'teal'}>
                          <BsFillPaletteFill />
                        </Button>
                      </PopoverTrigger>
                    </Box>
                  </Tooltip>
                  <PopoverContent width="450px">
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
                {boardId && ( // Board cannot be undefined
                  <Tooltip placement="top" hasArrow={true} label={'Group By Topic'} openDelay={400}>
                    <Button onClick={() => groupByTopic(boardId, lassoApps)} size="xs" p="0" mx="2px" colorScheme={'teal'}>
                      <BsFillGrid3X3GapFill />
                    </Button>
                  </Tooltip>
                )}
              </ButtonGroup>
            )}

            {appGroup === 'SageCell' && (
              <>
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
                  {'SAGECell Actions'}
                </Text>

                <ButtonGroup size="xs" isAttached variant="outline" colorScheme={'teal'}>
                  <Popover size={'md'}>
                    <Tooltip placement="top" hasArrow={true} label={'Group Assign Kernel'} openDelay={400}>
                      {/* Fix to allow tooltip and popover trigger - https://github.com/chakra-ui/chakra-ui/issues/2843 */}
                      <Box display="inline-block">
                        <PopoverTrigger>
                          <Button size="xs" p="0" mx="2px" colorScheme={'teal'} onClick={getMyKernels}>
                            <VscVariableGroup />
                          </Button>
                        </PopoverTrigger>
                      </Box>
                    </Tooltip>
                    <PopoverContent width="450px">
                      <PopoverArrow />
                      <PopoverCloseButton />
                      <PopoverHeader>Group Select Kernel</PopoverHeader>
                      <PopoverBody>
                        <Select onChange={(e) => assignKernel(e.target.value, lassoApps)} placeholder="Select Kernel">
                          {myKernels
                            .filter((el) => el.value.kernel_name === 'python3')
                            .map((el) => (
                              <option value={el.key} key={el.key}>
                                {el.value.is_private ? '<Private> ' : ''}
                                {el.value.kernel_alias} (
                                {el.value.kernel_name === 'python3' ? 'Python' : el.value.kernel_name === 'r' ? 'R' : 'Julia'})
                              </option>
                            ))}
                        </Select>
                      </PopoverBody>
                    </PopoverContent>
                  </Popover>
                </ButtonGroup>
              </>
            )}

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
              {boardId && (
                <Tooltip placement="top" hasArrow={true} label={'Organize Selected Apps'} openDelay={400}>
                  <Button
                    onClick={() => organizeApps(boardId, 'app_type', 'tiles', lassoApps)}
                    size="xs"
                    p="0"
                    mx="2px"
                    colorScheme={'teal'}
                  >
                    <BsLayoutWtf />
                  </Button>
                </Tooltip>
              )}
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
