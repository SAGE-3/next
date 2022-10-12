/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
// Components
import { Box, Text, useDisclosure, useColorModeValue, IconButton, useToast, Flex, Icon, Spacer, Tooltip, Checkbox, Select } from '@chakra-ui/react';
import { useHexColor, useUser, EditBoardModal, useAppStore, useUIStore } from '@sage3/frontend';
import { useEffect, useState } from 'react';
import { MdLock, MdSettings, MdLockOpen, MdOutlineCopyAll } from 'react-icons/md';
import { Kernel } from '..';

// {"id":"cd3fad02-ddb1-473c-96d5-f4d87ce47ae8","name":"python3","last_activity":"2022-10-07T23:49:22.033517Z","execution_state":"starting","connections":0}

const KernelCard = (kernel: Kernel) => {

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isPrivate, setIsPrivate] = useState(false);

  const handleOpen = () => {
    onOpen();
  };

  const handleClose = () => {
    onClose();
  };

  const handlePrivate = () => {
    setIsPrivate(!isPrivate);
  };

  // Checkboxes
  function onKernelSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const k = e.target.value;
    const value = e.target.checked;
    // if (selected.includes(k) && !value) {
      // setSelected(
        // props._id,
        // selected.filter((v: string) => v !== k)
      // );
    // } else if (!selected.includes(k) && value) {
      // setSelected(props._id, [...selected, k]);
    }
  // }
  

  return (
    <Box>
      <Flex p={2} bg="cardHeaderBg" align="center" justify="space-between" shadow="sm">
        <Box>
          {/* <Checkbox colorScheme={'teal'} onChange={onKernelSelected} /> */}
          {/* <Checkbox colorScheme={"teal"} value={session.kernel.id} checked={selected.includes(session.id)} */}
          {/* <Select
            placeholder="Select kernel"
            width="150px"
            rounded="lg"
            size="sm"
            variant="outline"
            px={0}
            colorScheme="teal"
            // defaultValue={kernelType}
            // onChange={handleKernelType}
          >
            <option value="python3">python3</option>
          </Select> */}

          {/* // <IconButton fill="current" size="xs" mr={2} aria-label={''} onClick={onKernelSelected}/> */}
          {/* <Icon name="circle" fill={'red'} mr={1} /> */}
          <Text fontSize="xl" fontWeight="bold" color={useColorModeValue('#1A1A1A', '#E8E8E8')}>
            {kernel.name}
          </Text>
        </Box>
        <Flex alignItems="center">
          <Text color={'red'} fontWeight="bold">
            Busy
          </Text>
          <Spacer />
          {isPrivate ? (
            <Tooltip label="Private" aria-label="Private">
              <IconButton aria-label="Private" icon={<Icon as={MdLock} />} size="sm" variant="ghost" colorScheme="blue" />
            </Tooltip>
          ) : (
            <Tooltip label="Public" aria-label="Public">
              <IconButton aria-label="Public" icon={<Icon as={MdLockOpen} />} size="sm" variant="ghost" colorScheme="blue" />
            </Tooltip>
          )}
          <IconButton
            aria-label="Settings"
            icon={<Icon as={MdSettings} />}
            size="sm"
            variant="ghost"
            colorScheme="blue"
            onClick={handleOpen}
          />
        </Flex>
      </Flex>
    </Box>
  );
};

export default KernelCard;