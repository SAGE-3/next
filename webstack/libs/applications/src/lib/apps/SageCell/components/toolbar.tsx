/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { Badge, Button, ButtonGroup, HStack, Select, Tooltip, useDisclosure, useToast } from '@chakra-ui/react';
import { MdAdd, MdArrowDropDown, MdFileDownload, MdHelp, MdRefresh, MdRemove } from 'react-icons/md';
// Date manipulation (for filename)
import dateFormat from 'date-fns/format';

import { downloadFile, useAppStore, useUser, useUsersStore } from '@sage3/frontend';
import { App } from '../../../schema';
import { state as AppState } from '../index';
import { HelpModal } from './help';
import { User } from '@sage3/shared/types';
import { KernelInfo } from '../../KernelDashboard';

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
  // Update functions from the store
  const update = useAppStore((state) => state.update);
  const updateState = useAppStore((state) => state.updateState);
  const boardId = props.data.boardId;
  const [myKernels, setMyKernels] = useState<KernelInfo[]>([]);
  const [selected, setSelected] = useState<string>(s.kernel);
  const [ownerId, setOwnerId] = useState<string>('');
  const [ownerName, setOwnerName] = useState<string>('');
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const { isOpen: helpIsOpen, onOpen: helpOnOpen, onClose: helpOnClose } = useDisclosure();
  const baseURL = 'http://localhost:81';

  /**
   * This function gets the kernels for the board
   * @returns
   * @memberof ToolbarComponent
   */
  const getKernelCollection = async () => {
    try {
      const response = await fetch(`${baseURL}/collection`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      updateState(props._id, {
        kernels: data,
      });
    } catch (error) {
      if (error instanceof TypeError) {
        console.log(`The Jupyter proxy server appears to be offline. (${error.message})`);
      }
    }
  };

  /**
   * This function sets the state of the toolbar based on the kernels
   * @returns
   * @memberof ToolbarComponent
   */
  function setStates() {
    // get all the kernels in the wild
    const kernels = s.kernels;
    const b = kernels.filter((el) => el.board === boardId);
    // if there are no kernels for the board, or at all, reset the local state
    if (!kernels || kernels.length === 0 || b.length === 0) {
      // reset the local state
      setSelected('');
      setOwnerId('');
      setOwnerName('');
      // make it public by default
      setIsPrivate(false);
      // empty the user's list of kernels
      setMyKernels([]);
      // reset the title of the app
      update(props._id, { title: 'SAGECell>' });
      // clear the global selected kernel state
      updateState(props._id, { kernel: '' }); // this could be a problem since it is a global state
      // get the kernels for this board
      return;
    }
    if (b.length > 0) {
      // if there are kernels for this board then
      // get the public kernels and the kernels owned by the user
      const publicKernels = b.filter((el) => !el.is_private);
      const privateKernels = b.filter((el) => el.is_private);
      const ownedKernels = privateKernels.filter((el) => el.owner === user?._id);
      const myList: KernelInfo[] = [...publicKernels, ...ownedKernels];
      setMyKernels(myList);
      // get the selected kernel from the global state
      const selectedKernel = kernels.find((el) => el.kernel_id === s.kernel);
      // check if the selected kernel is in the list of kernels for this board
      const ownerId = selectedKernel?.owner;
      const ownerName = users.find((u: User) => u._id === ownerId)?.data.name;
      const isPrivate = selectedKernel?.is_private;
      const inBoard = b.find((el) => el.kernel_id === selectedKernel?.kernel_id);
      // if the selected kernel is not in the list of kernels for this board then
      // there is a problem so we should reset the state to the default
      if (!inBoard) {
        setSelected('');
        setOwnerId('');
        setOwnerName('');
        setIsPrivate(false);
        return;
      }
      // const inMyList = myList.find((el) => el.key === s.kernel);
      if (selectedKernel) {
        setSelected(selectedKernel.kernel_id);
        setOwnerId(ownerId ? ownerId : '');
        setOwnerName(ownerName ? ownerName : '');
        setIsPrivate(isPrivate ? isPrivate : false);
      }
    }
  }

  /**
   * Get the kernels when the app is mounted and update the state
   * This happens when the component is mounted but is not triggered
   * when the global state changes so we need to use the useEffect below
   * to force changes if the user has the app open already
   */
  useEffect(() => {
    if (!user) return;
    getKernelCollection();
    setStates();
    return () => {
      // cleanup
    };
  }, []);

  /**
   * This happens when the global state changes
   */
  useEffect(() => {
    // rebuild the state to reflect any changes affected
    // by the global state change
    setStates();
    return () => {
      // cleanup
    };
  }, [s.kernel, JSON.stringify(s.kernels)]);

  /**
   * This is called when the user selects a kernel from the dropdown
   * It updates the global state and the app description
   * @param {React.ChangeEvent<HTMLSelectElement>} e
   * @returns {void}
   */
  function selectKernel(e: React.ChangeEvent<HTMLSelectElement>): void {
    if (e.target.value !== s.kernel) {
      const name = e.currentTarget.selectedOptions[0].text.split(' ')[0];
      if (name && name !== 'Select Kernel' && name !== 'Private') {
        update(props._id, { title: `SAGECell> ${name}` });
        updateState(props._id, { kernel: e.target.value });
      } else {
        update(props._id, { title: 'SAGECell>' });
        updateState(props._id, { kernel: '' });
      }
    }
  }

  /**
   * Download the stickie as a text file
   * @returns {void}
   */
  const downloadPy = (): void => {
    // Current date
    const dt = dateFormat(new Date(), 'yyyy-MM-dd-HH:mm:ss');
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
      {
        <>
          {/* check if there are kernels available. if none show offline, if available but no access show online with no kernels,
           if available and access show online with kernels
          */}
          {s.kernels.length === 0 ? (
            <Badge colorScheme="red" rounded="sm" size="lg">
              Offline
            </Badge>
          ) : s.kernels.length > 0 && !selected ? (
            <Badge colorScheme="yellow" rounded="sm" size="lg">
              Online
            </Badge>
          ) : isPrivate ? (
            ownerId === user?._id ? (
              <Badge colorScheme="red" rounded="sm" size="lg">
                Locked
              </Badge>
            ) : (
              <Badge colorScheme="red" rounded="sm" size="lg">
                Locked by {ownerName}
              </Badge>
            )
          ) : (
            <Badge colorScheme="green" rounded="sm" size="lg">
              Ready
            </Badge>
          )}
          <Select
            placeholder={isPrivate ? 'Private' : 'Select Kernel'}
            rounded="lg"
            size="sm"
            width="150px"
            ml={2}
            px={0}
            colorScheme="teal"
            icon={<MdArrowDropDown />}
            onChange={(e) => selectKernel(e as React.ChangeEvent<HTMLSelectElement>)}
            value={
              // if the selected kernel is not the same as the global state, set the selected to the global state
              // selected !== s.kernel ? s.kernel : selected
              selected ?? undefined
            }
            variant={'outline'}
            isDisabled={
              // disable the dropdown there is a active kernel and the user does not have access
              isPrivate && user && user._id !== ownerId ? true : false
            }
          >
            {
              //filter only Python kernels at this time
              myKernels
                .filter((el) => el.name === 'python3')
                .map((el) => (
                  <option value={el.kernel_id} key={el.kernel_id}>
                    {el.alias} ({el.name === 'python3' ? 'Python' : el.name === 'r' ? 'R' : 'Julia'})
                  </option>
                ))
            }
          </Select>

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
        </>
      }
    </HStack>
  );
}
