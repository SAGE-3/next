/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import { useEffect, useState } from 'react';
import {
  Button,
  ButtonGroup,
  Tooltip,
  Stack,
  UnorderedList,
  ListItem,
  Select,
  Checkbox,
  CheckboxGroup,
  Text,
  Input,
  InputGroup,
} from '@chakra-ui/react';
// Zustand store between app and toolbar
import create from 'zustand';
import { v1 as uuidv1 } from 'uuid';
// Icons
import { MdAdd, MdRemove, MdRefresh } from 'react-icons/md';

import { GetConfiguration, useAppStore, useUser } from '@sage3/frontend';

import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { useParams } from 'react-router';
import { initialValues } from '@sage3/applications/initialValues';

// Store between app and toolbar
export const useStore = create((set: any) => ({
  selected: {} as { [key: string]: string[] },
  setSelected: (id: string, s: string[]) => set((state: any) => ({ selected: { ...state.selected, ...{ [id]: s } } })),
}));

/* App component for Kernels */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const [token, setToken] = useState<string>();
  const [prod, setProd] = useState<boolean>();
  const [sessions, setSessions] = useState<any[]>([]);
  const updateState = useAppStore((state) => state.updateState);
  const createApp = useAppStore((state) => state.create);
  const { user } = useUser();
  const { boardId, roomId } = useParams();

  const setSelected = useStore((state: any) => state.setSelected);
  const selected = useStore((state: any) => state.selected[props._id]);

  useEffect(() => {
    GetConfiguration().then((conf) => {
      if (conf.token) {
        setToken(conf.token);
        updateState(props._id, { refresh: true });
      }
      setProd(conf.production);
      setSelected(props._id, []);
    });
  }, []);

  useEffect(() => {
    if (token && s.refresh) {
      updateState(props._id, { refresh: false });
      // Jupyter URL
      let base: string;
      if (prod) {
        base = `https://${window.location.hostname}:4443`;
      } else {
        base = `http://${window.location.hostname}`;
      }
      const j_url = base + '/api/sessions';
      // Talk to the jupyter server API
      fetch(j_url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Token ' + token,
        },
      })
        .then((response) => response.json())
        .then((res) => {
          setSessions(res);
        })
        .catch((err) => {
          console.log('Jupyter> error', err);
        });
    }
  }, [token, s.refresh]);

  // Checkboxes
  function onKernelSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const k = e.target.value;
    const value = e.target.checked;
    if (selected.includes(k) && !value) {
      setSelected(
        props._id,
        selected.filter((v: string) => v !== k)
      );
    } else if (!selected.includes(k) && value) {
      setSelected(props._id, [...selected, k]);
    }
  }

  /* Info
   id: "bdc55112-02ad-49c2-9171-be81e5048e81"
   kernel: {
    id: 'c3e84c9d-9bf8-4cd8-8448-283df74de8b0',
    name: 'python3',
    last_activity: '2022-09-29T18:31:23.462066Z',
    execution_state: 'idle',
    connections: 0}
   name: "53f01e78-4fb5-4eea-ab64-f8bfbc389547"
   notebook: {path: 'boards/53f01e78-4fb5-4eea-ab64-f8bfbc389547.ipynb', name: '53f01e78-4fb5-4eea-ab64-f8bfbc389547'}
   path: "boards/53f01e78-4fb5-4eea-ab64-f8bfbc389547.ipynb"
   type: "notebook"
  */

  // Open a CodeCell for this kernel
  function openCell(kid: string) {
    if (!user) return;
    createApp({
      name: 'CodeCell',
      description: 'CodeCell',
      roomId: roomId!,
      boardId: boardId!,
      position: { x: props.data.position.x + props.data.size.width + 20, y: props.data.position.y, z: 0 },
      size: { width: 600, height: props.data.size.height, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'CodeCell',
      state: { ...initialValues['CodeCell'], kernel: kid },
      ownerId: user._id,
      minimized: false,
      raised: true,
    });
  }

  // Open JupyterLab
  function openJupyter() {
    if (!user) return;
    // TODO: open into the right kerne/notebook
    createApp({
      name: 'JupyterLab',
      description: 'JupyterLab',
      roomId: roomId!,
      boardId: boardId!,
      position: { x: props.data.position.x, y: props.data.position.y + props.data.size.height + 50, z: 0 },
      size: { width: props.data.size.width, height: props.data.size.width, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'JupyterLab',
      state: { ...initialValues['JupyterLab'] },
      ownerId: user._id,
      minimized: false,
      raised: true,
    });
  }

  return (
    <AppWindow app={props}>
      <Stack roundedBottom="md" bg="whiteAlpha.700" width="100%" height="100%" p={2} color="black">
        <Text>Kernels running: {sessions.length}</Text>
        <UnorderedList
          overflowY={'scroll'}
          css={{
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              width: '6px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'darkgray',
              borderRadius: 'sm',
            },
          }}
        >
          <CheckboxGroup>
            {sessions
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((session, i) => {
                return (
                  <ListItem key={i}>
                    <Checkbox
                      colorScheme={'teal'}
                      value={session.kernel.id}
                      checked={selected.includes(session.id)}
                      backgroundColor={'teal.200'}
                      borderRadius={2}
                      borderColor={'teal.300'}
                      verticalAlign={'middle'}
                      p={0}
                      ml={1}
                      onChange={onKernelSelected}
                    />{' '}
                    <b>Kernel: {session.name}</b>
                    <UnorderedList pl={'8'}>
                      <ListItem>
                        Kernel: {session.kernel.name}, {session.kernel.execution_state}
                      </ListItem>
                      <ListItem>Notebook: {session.path}</ListItem>
                      <ListItem>
                        Links:{' '}
                        <span onClick={() => openCell(session.kernel.id)} style={{ textDecoration: 'underline', cursor: 'pointer' }}>
                          new cell
                        </span>
                        &nbsp;{' '}
                        <span onClick={() => openJupyter()} style={{ textDecoration: 'underline', cursor: 'pointer' }}>
                          open jupyter
                        </span>
                      </ListItem>
                    </UnorderedList>
                  </ListItem>
                );
              })}
          </CheckboxGroup>
        </UnorderedList>
      </Stack>
    </AppWindow>
  );
}

/* App toolbar component for the app Kernels */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const selected: string[] = useStore((state: any) => state.selected[props._id]);
  const setSelected = useStore((state: any) => state.setSelected);
  const [token, setToken] = useState<string>();
  const [prod, setProd] = useState<boolean>();
  const [name, setName] = useState<string>();
  const [kernelType, setKernelType] = useState('python3');

  useEffect(() => {
    let refreshInterval: number;
    GetConfiguration().then((conf) => {
      if (conf.token) {
        setToken(conf.token);
      }
      setProd(conf.production);
      // refresh list every minute
      refreshInterval = window.setInterval(handleRefresh, 60 * 1000);
    });
    return () => {
      // Cancel interval timer on unmount
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);

  // Plus button
  function handleNewKernel() {
    if (token) {
      // Jupyter URL
      let base: string;
      if (prod) {
        base = `https://${window.location.hostname}:4443`;
      } else {
        base = `http://${window.location.hostname}`;
      }
      // Create a new kernel: notebook + kernel + session
      const j_url = base + '/api/contents/boards/' + `${name}.ipynb`;
      const payload = { type: 'notebook', path: '/', format: 'text' };
      // Create a new notebook
      fetch(j_url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Token ' + token,
        },
        body: JSON.stringify(payload),
      })
        .then((response) => response.json())
        .then((res) => {
          // Create a new kernel
          const k_url = base + '/api/kernels';
          // name (string) – Kernel spec name (defaults to default kernel spec for server)
          // path (string) – API path from root to the cwd of the kernel
          const kpayload = { name: kernelType, path: '/boards' };
          fetch(k_url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Token ' + token,
            },
            body: JSON.stringify(kpayload),
          })
            .then((response) => response.json())
            .then((res) => {
              const kernel = res;
              // Create a new session
              const s_url = base + '/api/sessions';
              const sid = uuidv1();
              const spayload = {
                id: sid.replace(/-/g, ''),
                kernel: kernel,
                name: name,
                path: `boards/${name}.ipynb`,
                notebook: {
                  name: `${name}.ipynb`,
                  path: `boards/${name}.ipynb`,
                },
                type: 'notebook',
              };
              fetch(s_url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: 'Token ' + token,
                },
                body: JSON.stringify(spayload),
              })
                .then((response) => response.json())
                .then(() => {
                  handleRefresh();
                });
            });
        })
        .catch((err) => {
          console.log('Jupyter> error', err);
        });
    }
  }

  // Triggered on every keystroke
  function changeName(e: React.ChangeEvent<HTMLInputElement>) {
    const cleanName = e.target.value.replace(/[^a-zA-Z0-9\-_]/g, '');
    setName(cleanName);
  }

  // Triggered on 'enter' key
  function submitName(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Delete a kernel
  function handleDeleteKernel() {
    if (token) {
      // Jupyter URL
      let base: string;
      if (prod) {
        base = `https://${window.location.hostname}:4443`;
      } else {
        base = `http://${window.location.hostname}`;
      }
      // Iterate over selected kernels
      selected.forEach((k: string) => {
        const k_url = base + '/api/kernels/' + k;
        // Talk to the jupyter server API
        fetch(k_url, {
          method: 'DELETE',
          headers: { Authorization: 'Token ' + token },
        })
          .then((response) => {
            if (response.ok) {
              setSelected(
                props._id,
                selected.filter((v: string) => v !== k)
              );
              updateState(props._id, { refresh: true });
            }
          })
          .catch((err) => {
            console.log('Jupyter> delete error', err);
          });
      });
    }
  }

  // Select the kernel type: python3, r, julia...
  function handleKernelType(e: React.ChangeEvent<HTMLSelectElement>) {
    if (e.target.value) setKernelType(e.target.value);
  }

  // Reload the list of kernels
  function handleRefresh() {
    updateState(props._id, { refresh: true });
  }

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top-start" hasArrow={true} label={'Delete Selected Kernel(s)'} openDelay={400}>
          <Button isDisabled={!selected || selected.length === 0} onClick={() => handleDeleteKernel()} _hover={{ opacity: 0.7 }}>
            <MdRemove />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'New Kernel'} openDelay={400}>
          <Button isDisabled={!name || !kernelType} onClick={() => handleNewKernel()} _hover={{ opacity: 0.7 }}>
            <MdAdd />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Refresh'} openDelay={400}>
          <Button onClick={handleRefresh}>
            <MdRefresh />
          </Button>
        </Tooltip>
      </ButtonGroup>

      <form onSubmit={submitName}>
        <InputGroup size="sm" width="150px" px={2}>
          <Input
            placeholder="Kernel Name"
            _placeholder={{ opacity: 1, color: 'gray.600' }}
            value={name}
            onChange={changeName}
            onPaste={(event) => {
              event.stopPropagation();
            }}
            backgroundColor="whiteAlpha.300"
            padding={'0 4px 0 4px'}
          />
        </InputGroup>
      </form>

      <Select
        placeholder="Select kernel"
        width="150px"
        rounded="lg"
        size="sm"
        variant="outline"
        px={0}
        colorScheme="teal"
        defaultValue={kernelType}
        onChange={handleKernelType}
      >
        <option value="python3">python3</option>
      </Select>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
