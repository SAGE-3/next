/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import { useEffect, useState } from 'react';
import { Button, ButtonGroup, Tooltip, Stack, UnorderedList, ListItem } from '@chakra-ui/react';
// Icons
import { MdAdd, MdRemove } from 'react-icons/md';

import { GetConfiguration, useAppStore } from '@sage3/frontend';

import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';

/* App component for Kernels */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const [token, setToken] = useState<string>();
  const [prod, setProd] = useState<boolean>();
  const [sessions, setSessions] = useState<any[]>([]);
  const updateState = useAppStore((state) => state.updateState);

  useEffect(() => {
    GetConfiguration().then((conf) => {
      if (conf.token) {
        setToken(conf.token);
      }
      setProd(conf.production);
    });
  }, []);

  useEffect(() => {
    if (token) {
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
          console.log('Jupyter> sessions', res);
          setSessions(res);
        })
        .catch((err) => {
          console.log('Jupyter> error', err);
        });
    }
  }, [token]);

  /*
  0:
 id: "bdc55112-02ad-49c2-9171-be81e5048e81"
 kernel: {id: 'c3e84c9d-9bf8-4cd8-8448-283df74de8b0', name: 'python3', last_activity: '2022-09-29T18:31:23.462066Z',
  execution_state: 'idle', connections: 0}
 name: "53f01e78-4fb5-4eea-ab64-f8bfbc389547"
 notebook: {path: 'boards/53f01e78-4fb5-4eea-ab64-f8bfbc389547.ipynb', name: '53f01e78-4fb5-4eea-ab64-f8bfbc389547'}
 path: "boards/53f01e78-4fb5-4eea-ab64-f8bfbc389547.ipynb"
 type: "notebook"
*/

  return (
    <AppWindow app={props}>
      <Stack roundedBottom="md" bg="whiteAlpha.700" width="100%" height="100%" p={2}
        color="black">
        <UnorderedList>
          {sessions.map((session, i) => {
            return (
              <ListItem key={i}>
                <b>Session</b> {i} - {session.name}
                <UnorderedList >
                  <ListItem>id: {session.id}</ListItem>
                  <ListItem>kernel: {session.kernel.name} {session.kernel.id}</ListItem>
                  <ListItem>state: {session.kernel.execution_state}</ListItem>
                  <ListItem>notebook: {session.notebook.path}</ListItem>
                </UnorderedList>
              </ListItem>
            );
          })}
        </UnorderedList>
      </Stack>
    </AppWindow>
  );
}

/* App toolbar component for the app Kernels */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  function handleNewKernel() {
    console.log('New Kernel');
  }
  function handleDeleteKernel() {
    console.log('New Kernel');
  }

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal" >
        <Tooltip placement="top-start" hasArrow={true} label={'Remove Kernel'} openDelay={400}>
          <Button isDisabled={false} onClick={() => handleDeleteKernel()} _hover={{ opacity: 0.7 }}>
            <MdRemove />
          </Button>
        </Tooltip>
        <Tooltip placement="top-start" hasArrow={true} label={'Add Kernel'} openDelay={400}>
          <Button isDisabled={false} onClick={() => handleNewKernel()} _hover={{ opacity: 0.7 }}>
            <MdAdd />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
