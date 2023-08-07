/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, ButtonGroup, HStack, Select, Tooltip, useDisclosure } from '@chakra-ui/react';
import { MdAdd, MdArrowDropDown, MdFileDownload, MdHelp, MdRefresh, MdRemove } from 'react-icons/md';
// Date manipulation (for filename)
import dateFormat from 'date-fns/format';

import { downloadFile, useAppStore, useUser, useUsersStore, useBoardStore } from '@sage3/frontend';
import { App } from '../../../schema';
import { state as AppState } from '../index';
import { HelpModal } from './help';
import { User } from '@sage3/shared/types';
import { KernelInfo } from '../../KernelDashboard';
import { usePrevious, createKernel, fetchKernels, haveSameKernelIds } from '../useKernelUtils';

/**
 * UI toolbar for the SAGEcell application
 *
 * @param {App} props
 * @returns {JSX.Element}
 */
export function ToolbarComponent(props: App): JSX.Element {
  // Access the global app state
  const s = props.data.state as AppState;
  const { user } = useUser();
  const users = useUsersStore((state) => state.users);
  const updateState = useAppStore((state) => state.updateState);
  const boardId = props.data.boardId;
  const [myKernels, setMyKernels] = useState<KernelInfo[]>(s.kernels);
  const [selected, setSelected] = useState<KernelInfo | undefined>(s.kernels?.find((kernel) => kernel.kernel_id === s.kernel));
  const [online, setOnline] = useState<boolean>(s.online);
  const [access, setAccess] = useState<boolean>(true); // Default true, it will be updated later
  const { isOpen: helpIsOpen, onOpen: helpOnOpen, onClose: helpOnClose } = useDisclosure();
  const boardName = useBoardStore((state) => state.boards).find((board) => board._id === boardId)?.data.name;
  const prevKernel = usePrevious(s.kernel);
  const prevKernelsRef = useRef<KernelInfo[]>();

  useEffect(() => {
    const selectedKernel = s.kernels?.find((kernel) => kernel.kernel_id === s.kernel);
    if (selectedKernel) {
      setAccess(selectedKernel.is_private ? selectedKernel.owner === user?._id : true);
    }
  }, []);

  useEffect(() => {
    prevKernelsRef.current = s.kernels;
  }, [s.kernels]);

  useEffect(() => {
    if (online !== s.online) {
      setOnline(s.online);
    }
    if (!s.online) {
      updateState(props._id, {
        streaming: false,
        kernel: '',
        kernels: [],
        msgId: '',
      });
    }
  }, [s.online]);

  /**
   * This is called when the user selects a kernel from the dropdown or when the
   * kernel collection is updated.
   */
  useEffect(() => {
    if (prevKernelsRef.current) {
      const hasSameIds = haveSameKernelIds(prevKernelsRef.current, s.kernels);
      if (hasSameIds) return;
    }
    getKernelCollection();
  }, [s.kernels]);

  useEffect(() => {
    if (prevKernel !== s.kernel) {
      getKernelCollection();
    }
  }, [s.kernel]);

  const [badgeText, badgeColorScheme] = useMemo(() => {
    if (s.online) {
      if (s.kernel && selected) {
        const owner = users.find((u: User) => u._id === selected.owner);
        if (selected.is_private) {
          return [selected.owner === user?._id ? 'Locked' : `Locked by ${owner?.data.name}`, 'red'];
        }
        return [`Ready`, 'green'];
      }
      return ['No Available Kernels', 'yellow'];
    }
    return ['Offline', 'red'];
  }, [online, selected, user?._id]);

  const getKernelCollection = async () => {
    if (!s.online) return;
    try {
      const kernels: KernelInfo[] = await fetchKernels();
      if (!kernels.length) {
        updateState(props._id, { kernels: [] });
        return;
      }
      // Determine the default kernel
      const defaultKernel = kernels.find(
        (kernel) => kernel.board === props.data.boardId && (!kernel.is_private || (kernel.is_private && kernel.owner === user?._id))
      );

      // Check if s.kernel exists in the fetched kernels list, otherwise use the default kernel
      const validSelectedKernel = kernels.find((kernel) => kernel.kernel_id === s.kernel) || defaultKernel;

      // If we have a valid kernel, update the state, else clear the selected details
      if (validSelectedKernel) {
        if (validSelectedKernel.kernel_id !== s.kernel) {
          updateState(props._id, { kernel: validSelectedKernel.kernel_id });
        }
      }
      setSelected(validSelectedKernel || undefined);
      filterAndSetMyKernels(kernels);

      // Check access based on the valid kernel
      const hasAccess = !!validSelectedKernel && myKernels.some((kernel) => kernel.kernel_id === validSelectedKernel.kernel_id);
      setAccess(hasAccess);
    } catch (error) {
      if (error instanceof TypeError) {
        console.log(`The Jupyter proxy server appears to be offline. (${error.message})`);
      }
    }
  };

  const filterAndSetMyKernels = (kernels: KernelInfo[]) => {
    const filteredKernels = kernels.filter((kernel) => kernel.board === props.data.boardId && hasKernelAccess(kernel));
    setMyKernels(filteredKernels);
  };

  /**
   *
   * Add a kernel to the list of kernels by sending a request to the backend
   * and updating the state. Defaults to python3 kernel. Expects a kernel alias
   * and a kernel name.
   *
   * @returns  void
   */
  const createDefaultKernel = async () => {
    if (!user || !s.online) return;
    const defaultAlias = boardName ? boardName.replace(/[^a-zA-Z0-9\-_]/g, '') : 'default';
    const kernelInfo = {
      kernel_id: '', // will be generated by the backend
      room: props.data.roomId,
      board: props.data.boardId,
      name: 'python3',
      alias: defaultAlias,
      is_private: false,
      owner: user._id,
    };
    const success = await createKernel(kernelInfo);
    if (success) {
      getKernelCollection();
    }
  };

  /**
   * This is called when the user selects a kernel from the dropdown
   * It updates the global state and the app description
   * @param {React.ChangeEvent<HTMLSelectElement>} e
   * @returns {void}
   */
  function selectKernel(e: React.ChangeEvent<HTMLSelectElement>): void {
    const newKernelValue = e.target.value;
    if (newKernelValue !== s.kernel) {
      updateState(props._id, { kernel: newKernelValue });
    }
  }

  /**
   * Check if the user has access to the kernel
   * @param {KernelInfo} kernel
   * @returns {boolean}
   * @memberof SageCell
   */
  const hasKernelAccess = (kernel: KernelInfo): boolean => {
    return !kernel.is_private || (kernel.is_private && kernel.owner === user?._id);
  };

  /**
   * Download the stickie as a text file
   * @returns {void}
   */
  const downloadPy = (): void => {
    // Current date
    const dt = dateFormat(new Date(), 'yyyy-MM-dd-HH:mm:ss');
    // Get the text of the note
    const content = `${s.code}`;
    // generate a URL containing the text of the note
    const txturl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
    // Make a filename with username and date
    const filename = 'sagecell-' + dt + '.py';
    // Go for download
    downloadFile(txturl, filename);
  };

  return (
    <HStack>
      <HelpModal isOpen={helpIsOpen} onClose={helpOnClose} />
      <Badge colorScheme={badgeColorScheme} rounded="sm" size="lg">
        {badgeText}
      </Badge>
      {myKernels.length === 0 ? (
        <Button onClick={createDefaultKernel} _hover={{ opacity: 0.7 }} size="xs" mx="1" colorScheme="teal" isDisabled={!s.online}>
          Create Default Kernel <MdAdd />
        </Button>
      ) : !selected ? null : (
        <Select
          // placeholder={selected?.is_private && user?._id !== selected.owner ? 'Private' : 'Select Kernel'}
          rounded="lg"
          size="sm"
          width="150px"
          ml={2}
          colorScheme="teal"
          icon={<MdArrowDropDown />}
          onChange={(e) => selectKernel(e as React.ChangeEvent<HTMLSelectElement>)}
          value={selected?.kernel_id}
          variant={'outline'}
          isDisabled={selected?.is_private && !access}
        >
          {
            //show my kernels
            myKernels
              .filter((el) => el.name === 'python3')
              .map((el) => (
                <option value={el.kernel_id} key={el.kernel_id}>
                  {el.alias} ({el.name === 'python3' ? 'Python' : el.name === 'r' ? 'R' : 'Julia'})
                </option>
              ))
          }
        </Select>
      )}

      <Tooltip placement="top-start" hasArrow={true} label={'Refresh Kernel List'} openDelay={400}>
        <Button onClick={getKernelCollection} _hover={{ opacity: 0.7 }} size="xs" mx="1" colorScheme="teal">
          <MdRefresh />
        </Button>
      </Tooltip>

      <Tooltip placement="top-start" hasArrow={true} label={'Click for help'} openDelay={400}>
        <Button onClick={() => helpOnOpen()} _hover={{ opacity: 0.7 }} size="xs" mx="1" colorScheme="teal">
          <MdHelp />
        </Button>
      </Tooltip>

      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top-start" hasArrow={true} label={'Decrease Font Size'} openDelay={400}>
          <Button
            isDisabled={s.fontSize <= 8}
            onClick={() => updateState(props._id, { fontSize: Math.max(10, s.fontSize - 2) })}
            _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}
          >
            <MdRemove />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Increase Font Size'} openDelay={400}>
          <Button
            isDisabled={s.fontSize > 42}
            onClick={() => updateState(props._id, { fontSize: Math.min(48, s.fontSize + 2) })}
            _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}
          >
            <MdAdd />
          </Button>
        </Tooltip>
      </ButtonGroup>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top-start" hasArrow={true} label={'Download Code'} openDelay={400}>
          <Button onClick={downloadPy} _hover={{ opacity: 0.7 }}>
            <MdFileDownload />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </HStack>
  );
}
