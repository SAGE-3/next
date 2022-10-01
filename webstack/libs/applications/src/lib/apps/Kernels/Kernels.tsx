/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import { useEffect, useState } from 'react';
import {
  Button, ButtonGroup, Tooltip, Stack, UnorderedList, ListItem, Select,
  Checkbox, CheckboxGroup, Text
} from '@chakra-ui/react';
// Zustand store between app and toolbar
import create from 'zustand';
// Icons
import { MdAdd, MdRemove, MdRefresh } from 'react-icons/md';

import { GetConfiguration, useAppStore } from '@sage3/frontend';

import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';


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
          'Authorization': 'Token ' + token,
        },
      }).then((response) => response.json())
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
      setSelected(props._id, selected.filter((v: string) => v !== k));
    } else if (!selected.includes(k) && value) {
      setSelected(props._id, [...selected, k]);
    }
  }

  /*
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

  return (
    <AppWindow app={props}>
      <Stack roundedBottom="md" bg="whiteAlpha.700" width="100%" height="100%" p={2}
        color="black">
        <Text>Kernels running: {sessions.length}</Text>
        <UnorderedList overflowY={"scroll"} id="toto">
          <CheckboxGroup>
            {sessions.map((session, i) => {
              return (
                <ListItem key={i}>
                  <Checkbox colorScheme={"teal"} value={session.kernel.id} checked={selected.includes(session.id)}
                    backgroundColor={"teal.200"} borderRadius={2} borderColor={"teal.300"}
                    verticalAlign={"middle"} p={0} ml={1} onChange={onKernelSelected}
                  /> <b>Session</b> {i} - {session.name}
                  <UnorderedList >
                    <ListItem>kernel: {session.kernel.name} {session.kernel.id}</ListItem>
                    <ListItem>state: {session.kernel.execution_state}</ListItem>
                    <ListItem>{session.type}: {session.path}</ListItem>
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
  const selected = useStore((state: any) => state.selected[props._id]);
  const setSelected = useStore((state: any) => state.setSelected);
  const [token, setToken] = useState<string>();
  const [prod, setProd] = useState<boolean>();

  useEffect(() => {
    GetConfiguration().then((conf) => {
      if (conf.token) {
        setToken(conf.token);
      }
      setProd(conf.production);
    });
  }, []);

  function handleNewKernel() {
    // console.log('New Kernel');
  }
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
          headers: { 'Authorization': 'Token ' + token }
        }).then((response) => {
          if (response.ok) {
            setSelected(props._id, selected.filter((v: string) => v !== k));
            updateState(props._id, { refresh: true });
          }
        }).catch((err) => {
          console.log('Jupyter> delete error', err);
        });
      });
    }
  }
  function handleRefresh() {
    updateState(props._id, { refresh: true });
  }

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal" >
        <Tooltip placement="top-start" hasArrow={true} label={'Delete Selected Kernel(s)'} openDelay={400}>
          <Button isDisabled={false} onClick={() => handleDeleteKernel()} _hover={{ opacity: 0.7 }}>
            <MdRemove />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'New Kernel'} openDelay={400}>
          <Button isDisabled={false} onClick={() => handleNewKernel()} _hover={{ opacity: 0.7 }}>
            <MdAdd />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Refresh'} openDelay={400}>
          <Button onClick={handleRefresh} >
            <MdRefresh />
          </Button>
        </Tooltip>
      </ButtonGroup>

      <Select placeholder='Select kernel' rounded='lg' size='sm' variant='outline' ml={2} colorScheme="teal">
        <option value='python3'>python3</option>
      </Select>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
