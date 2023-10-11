/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';

import { Button, ButtonGroup, HStack, Select, Tooltip, useDisclosure } from '@chakra-ui/react';
import { MdAdd, MdArrowDropDown, MdFileDownload, MdHelp, MdWeb, MdRemove } from 'react-icons/md';
// Date manipulation (for filename)
import dateFormat from 'date-fns/format';

import { downloadFile, useAppStore, useUser, useKernelStore, CreateKernelModal, useAbility } from '@sage3/frontend';
import { KernelInfo } from '@sage3/shared/types';

import { App, AppGroup } from '../../../schema';
import { state as AppState } from '../index';
import { HelpModal } from './help';
import { useStore } from './store';

/**
 * UI toolbar for the SAGEcell application
 *
 * @param {App} props
 * @returns {JSX.Element}
 */
export function ToolbarComponent(props: App): JSX.Element {
  // Store between toolbar and appWindow
  const setDrawer = useStore((state: any) => state.setDrawer);
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
  const { apiStatus, kernels } = useKernelStore((state) => state);

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

  const openInDrawer = async () => {
    // Set the drawer to open
    setDrawer(props._id, true);
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

      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top-start" hasArrow={true} label={'Click for help'} openDelay={400}>
          <Button onClick={helpOnOpen} _hover={{ opacity: 0.7 }} size="xs" colorScheme="teal">
            <MdHelp />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Open in Drawer'} openDelay={400}>
          <Button onClick={openInDrawer}>
            <MdWeb />
          </Button>
        </Tooltip>
      </ButtonGroup>

      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top-start" hasArrow={true} label={'Decrease Font Size'} openDelay={400}>
          <Button isDisabled={s.fontSize <= 8} onClick={decreaseFontSize} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}>
            <MdRemove />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Current Font Size'} openDelay={400}>
          <Button _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}>{s.fontSize}</Button>
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

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
export const GroupedToolbarComponent = (props: { apps: AppGroup }) => {
  // Disclousre for the create kernel modal
  const { isOpen, onOpen, onClose } = useDisclosure();

  // User
  const { user } = useUser();

  // Abilities
  const canCreateKernels = useAbility('create', 'kernels');

  // Kernel Store
  const { apiStatus, kernels } = useKernelStore((state) => state);

  // App Store
  const { updateStateBatch } = useAppStore((state) => state);

  // Access
  const [access, setAccess] = useState<boolean>(true); // Default true, it will be updated later

  // Params
  const { boardId } = useParams();

  /**
   * Check if the user has access to the kernel
   * @param {KernelInfo} kernel
   * @returns {boolean}
   * @memberof SageCell
   */
  const hasKernelAccess = (kernel: KernelInfo): boolean => {
    return !kernel.is_private || (kernel.is_private && kernel.owner === user?._id);
  };

  // Filter out this board's kernels and boards this user has access to
  const filterMyKernels = (kernels: KernelInfo[]) => {
    const filteredKernels = kernels.filter((kernel) => kernel.board === boardId && hasKernelAccess(kernel));
    return filteredKernels;
  };

  // Local kernel info
  const myk = filterMyKernels(kernels);
  const [myKernels, setMyKernels] = useState<KernelInfo[]>(myk);

  const [selected, setSelected] = useState<KernelInfo | undefined>(undefined);
  const selectRef = useRef<HTMLSelectElement>(null);

  // Set My Kernels
  useEffect(() => {
    const myk = filterMyKernels(kernels);
    setMyKernels(myk);
  }, [kernels]);

  const handleIncreaseFont = () => {
    // Array of update to batch at once
    const ps: Array<{ id: string; updates: Partial<AppState> }> = [];
    props.apps.forEach((app) => {
      if (app.data.state.lock) return;
      const size = app.data.state.fontSize + 2;
      if (size > 128) return;
      ps.push({ id: app._id, updates: { fontSize: size } });
    });
    // Update all the apps at once
    updateStateBatch(ps);
  };

  const handleDecreaseFont = () => {
    // Array of update to batch at once
    const ps: Array<{ id: string; updates: Partial<AppState> }> = [];
    props.apps.forEach((app) => {
      if (app.data.state.lock) return;
      const size = app.data.state.fontSize - 2;
      if (size <= 8) return;
      ps.push({ id: app._id, updates: { fontSize: size } });
    });
    // Update all the apps at once
    updateStateBatch(ps);
  };

  /**
   * This is called when the user selects a kernel from the dropdown
   * It updates the global state and the app description
   * @param {React.ChangeEvent<HTMLSelectElement>} e
   * @returns {void}
   */
  function selectKernel(e: React.ChangeEvent<HTMLSelectElement>): void {
    setSelected(myKernels.find((kernel) => kernel.kernel_id === e.target.value));
    const newKernelValue = e.target.value;
    // Array of update to batch at once
    const ps: Array<{ id: string; updates: Partial<AppState> }> = [];
    props.apps.forEach((app) => {
      if (app.data.state.lock) return;
      // if (!myKernels.find((kernel) => kernel.kernel_id === app.data.state.kernel)) return;
      ps.push({ id: app._id, updates: { kernel: newKernelValue } });
    });
    // Update all the apps at once
    updateStateBatch(ps);
  }

  return (
    <HStack>
      {myKernels.length === 0 ? (
        <Button onClick={onOpen} _hover={{ opacity: 0.7 }} size="xs" mr="1" colorScheme="teal" isDisabled={!apiStatus || !canCreateKernels}>
          Create Kernel <MdAdd />
        </Button>
      ) : (
        <Select
          ref={selectRef}
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
            // Deselect Kernel
            <option value={''} key={''}>
              **Deselect Kernels**
            </option>
          }
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
      <ButtonGroup isAttached size="xs" colorScheme="teal" mr="2">
        <Tooltip placement="top-start" hasArrow={true} label={'Decrease Font Size'} openDelay={400}>
          <Button onClick={handleDecreaseFont} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}>
            <MdRemove />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Current Font Size'} openDelay={400}>
          <Button _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}>
            {Math.min(...props.apps.map((app) => app.data.state.fontSize))}
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Increase Font Size'} openDelay={400}>
          <Button onClick={handleIncreaseFont} _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }}>
            <MdAdd />
          </Button>
        </Tooltip>
      </ButtonGroup>
      <CreateKernelModal isOpen={isOpen} onClose={onClose} />
    </HStack>
  );
};
