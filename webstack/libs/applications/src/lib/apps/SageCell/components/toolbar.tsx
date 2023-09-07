/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { Button, ButtonGroup, HStack, Select, Tooltip, useDisclosure } from '@chakra-ui/react';
import { MdAdd, MdArrowDropDown, MdFileDownload, MdHelp, MdRefresh, MdRemove } from 'react-icons/md';
// Date manipulation (for filename)
import dateFormat from 'date-fns/format';

import { downloadFile, useAppStore, useUser, useKernelStore, CreateKernelModal, useAbility } from '@sage3/frontend';
import { App } from '../../../schema';
import { state as AppState } from '../index';
import { HelpModal } from './help';
import { KernelInfo } from '@sage3/shared/types';

/**
 * UI toolbar for the SAGEcell application
 *
 * @param {App} props
 * @returns {JSX.Element}
 */
export function ToolbarComponent(props: App): JSX.Element {
  // App State
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  // Abilities
  const canCreateKernels = useAbility('create', 'kernels');

  // User state
  const { user } = useUser();

  // Access
  const [access, setAccess] = useState<boolean>(true); // Default true, it will be updated later

  // Disclousre for the create kernel modal
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Disclosure of Modal
  const { isOpen: helpIsOpen, onOpen: helpOnOpen, onClose: helpOnClose } = useDisclosure();

  // Kernel Store
  const { apiStatus, kernels, fetchKernels } = useKernelStore((state) => state);

  // Filter out this board's kernels and boards this user has access to
  const filterMyKernels = (kernels: KernelInfo[]) => {
    const filteredKernels = kernels.filter((kernel) => kernel.board === props.data.boardId && hasKernelAccess(kernel));
    return filteredKernels;
  };

  /**
   * Check if the user has access to the kernel
   * @param {KernelInfo} kernel
   * @returns {boolean}
   * @memberof SageCell
   */
  const hasKernelAccess = (kernel: KernelInfo): boolean => {
    return !kernel.is_private || (kernel.is_private && kernel.owner === user?._id);
  };

  // Local kernel info
  const myk = filterMyKernels(kernels);
  const [myKernels, setMyKernels] = useState<KernelInfo[]>(myk);
  const selectedKernel = kernels.find((kernel) => kernel.kernel_id === s.kernel);

  const [selected, setSelected] = useState<KernelInfo | undefined>(selectedKernel);

  // Checking Acccess
  useEffect(() => {
    // If the API Status is down, set the publicKernels to empty array
    if (!apiStatus) {
      setAccess(false);
      return;
    } else {
      const selectedKernel = kernels.find((kernel) => kernel.kernel_id === s.kernel);
      const isPrivate = selectedKernel?.is_private;
      const owner = selectedKernel?.owner;
      if (!isPrivate) setAccess(true);
      else if (isPrivate && owner === user?._id) setAccess(true);
      else setAccess(false);
    }
  }, [apiStatus, JSON.stringify(kernels), s.kernel, user]);

  // Set Selected Kernel
  useEffect(() => {
    if (kernels.length === 0) return;
    else {
      const selectedKernel = kernels.find((kernel) => kernel.kernel_id === s.kernel);
      setSelected(selectedKernel);
    }
  }, [kernels, s.kernel]);

  // Set My Kernels
  useEffect(() => {
    const myk = filterMyKernels(kernels);
    setMyKernels(myk);
  }, [kernels]);

  /**
   * This is called when the user selects a kernel from the dropdown
   * It updates the global state and the app description
   * @param {React.ChangeEvent<HTMLSelectElement>} e
   * @returns {void}
   */
  function selectKernel(e: React.ChangeEvent<HTMLSelectElement>): void {
    const newKernelValue = e.target.value;
    updateState(props._id, { kernel: newKernelValue });
  }

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

  // Increase font size
  const increaseFontSize = () => {
    updateState(props._id, { fontSize: Math.min(48, s.fontSize + 2) });
  };

  // Decrease font size
  const decreaseFontSize = () => {
    updateState(props._id, { fontSize: Math.max(8, s.fontSize - 2) });
  };

  return (
    <HStack>
      {myKernels.length === 0 ? (
        <Button onClick={onOpen} _hover={{ opacity: 0.7 }} size="xs" mr="1" colorScheme="teal" isDisabled={!apiStatus || !canCreateKernels}>
          Create Kernel <MdAdd />
        </Button>
      ) : (
        <Select
          placeholder={'Select Kernel'}
          rounded="lg"
          size="sm"
          width="150px"
          mr={1}
          colorScheme="teal"
          icon={<MdArrowDropDown />}
          onChange={(e) => selectKernel(e as React.ChangeEvent<HTMLSelectElement>)}
          value={selected?.kernel_id}
          variant={'outline'}
          isDisabled={(selected?.is_private && !access) || !canCreateKernels}
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
        <Button onClick={fetchKernels} _hover={{ opacity: 0.7 }} size="xs" mr="1" colorScheme="teal">
          <MdRefresh />
        </Button>
      </Tooltip>

      <Tooltip placement="top-start" hasArrow={true} label={'Click for help'} openDelay={400}>
        <Button onClick={helpOnOpen} _hover={{ opacity: 0.7 }} size="xs" mr="1" colorScheme="teal">
          <MdHelp />
        </Button>
      </Tooltip>

      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top-start" hasArrow={true} label={'Decrease Font Size'} openDelay={400}>
          <Button isDisabled={s.fontSize <= 8} onClick={decreaseFontSize} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}>
            <MdRemove />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Increase Font Size'} openDelay={400}>
          <Button isDisabled={s.fontSize > 42} onClick={increaseFontSize} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}>
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
      <HelpModal isOpen={helpIsOpen} onClose={helpOnClose} />
      <CreateKernelModal isOpen={isOpen} onClose={onClose} />
    </HStack>
  );
}
