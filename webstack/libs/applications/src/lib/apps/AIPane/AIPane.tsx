/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import {
  Box,
  Button,
  CloseButton,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Portal,
  Stack,
  VisuallyHidden,
} from '@chakra-ui/react';

import { FaPlay } from 'react-icons/fa';
import { BiErrorCircle, BiRun } from 'react-icons/bi';
import { HiMail } from 'react-icons/hi';
import { FiChevronDown } from 'react-icons/fi';

import { useAppStore, useUIStore } from '@sage3/frontend';

import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';

import './styles.css';

import { useEffect, useState, useRef } from 'react';

import { v4 as getUUID } from 'uuid';

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  const selectedAppId = useUIStore((state) => state.selectedAppId);
  const boardApps = useAppStore((state) => state.apps);
  const selApp = boardApps.find((el) => el._id === selectedAppId);

  const update = useAppStore((state) => state.update);

  // Keeps track of AI Pane previous position, necessary to move hosted apps with pane
  const prevX = useRef(props.data.position.x);
  const prevY = useRef(props.data.position.y);

  // supportedApps currently hardcoded in frontend
  // TODO Need to let backend set supportedApps
  const supportedApps = ['ImageViewer', 'PDFViewer'];

  // Checks for apps on or off the pane
  useEffect(() => {
    // Check all apps on board
    for (const app of boardApps) {
      const client = { [app._id]: app.data.type };

      // Hosted app window should fall within AI Pane window
      // Ignore apps already being hosted
      if (
        app.data.position.x + app.data.size.width < props.data.position.x + props.data.size.width &&
        app.data.position.x + app.data.size.width > props.data.position.x &&
        app.data.position.y + app.data.size.height < props.data.position.y + props.data.size.height &&
        app.data.size.height + app.data.position.y > props.data.position.y &&
        app.data.type !== 'AIPane'
      ) {
        if (!Object.keys(s.hostedApps).includes(app._id)) {
          const hosted = {
            ...s.hostedApps,
            ...client,
          };
          updateState(props._id, { hostedApps: hosted });
          // TODO Make messages more informative rather than simply types of apps being hosted
          updateState(props._id, { messages: hosted });
          // console.log('app ' + app._id + ' added');
          newAppAdded(app.data.type);
        } else {
          // console.log('app ' + app._id + ' already in hostedApps');
        }
      } else {
        if (Object.keys(s.hostedApps).includes(app._id)) {
          const hostedCopy = { ...s.hostedApps };
          delete hostedCopy[app._id];
          updateState(props._id, { messages: hostedCopy, hostedApps: hostedCopy });
        }
      }
    }
  }, [selApp?.data.position.x, selApp?.data.position.y, selApp?.data.size.height, selApp?.data.size.width, JSON.stringify(boardApps)]);

  // TODO Be mindful of client updates
  // Currently, every client updates once one does. Eventually add a way to monitor userID's and let only one person send update to server
  // Refer to videoViewer play function
  // Currently needed to keep track of hosted apps that are added when created or removed when deleted from board, rather than only those moved on and off
  useEffect(() => {
    const copyofhostapps = {} as { [key: string]: string };
    Object.keys(s.hostedApps).forEach((key: string) => {
      const app = boardApps.find((el) => el._id === key);
      if (app) copyofhostapps[key] = app.data.type;
    });
    updateState(props._id, { hostedApps: copyofhostapps });
  }, [boardApps.length]);

  // Move all apps together with the AIPane
  useEffect(() => {
    const hostedCopy = { ...s.hostedApps };
    const xDiff = props.data.position.x - prevX.current;
    const yDiff = props.data.position.y - prevY.current;

    for (const app of boardApps) {
      if (Object.keys(hostedCopy).includes(app._id)) {
        update(app._id, {
          position: {
            x: (app.data.position.x += xDiff),
            y: (app.data.position.y += yDiff),
            z: app.data.position.z,
          },
        });
      }
    }
    prevX.current = props.data.position.x;
    prevY.current = props.data.position.y;
  }, [props.data.position.x, props.data.position.y, JSON.stringify(s.hostedApps)]);

  // If there are no hostedApps, reset supportedTasks to empty
  useEffect(() => {
    if (Object.keys(s.hostedApps).length === 0) {
      updateState(props._id, { supportedTasks: {} });
    }
  }, [Object.keys(s.hostedApps).length]);

  // If more than 1 app added to pane, checks that all hosted apps are of the same type
  // @return error and disables pane if there is more than 1 hosted app types.
  function checkAppType() {
    const hostedTypes = new Set(Object.values(s.hostedApps));

    if (Array.from(hostedTypes).length > 1) {
      return 2;
    } else {
      if (supportedApps.includes([...hostedTypes][0])) {
        return 1;
      } else {
        return 0;
      }
    }
  }

  // Notifies backend of a new app being added and it's app type
  function newAppAdded(appType: string) {
    // updateState(props._id, {
    //   executeInfo: { executeFunc: 'new_app_added', params: { app_type: appType } },
    // });
  }

  // Custom close button to remove messages from messages menu.
  // TODO need to permanently keep messages off menu. Currently reproduces full list of messages upon certain renders
  function closePopovers(info: string) {
    const unchecked = s.messages;
    delete unchecked[info];

    // these updateState calls should be combined
    // TODO Ask Ryan what he means
    updateState(props._id, { messages: unchecked });

    if (Object.keys(s.messages).includes(info)) {
      const messagesCopy = { ...s.messages };
      delete messagesCopy[info];
      updateState(props._id, { messages: messagesCopy });
    }
  }

  return (
    <AppWindow app={props} lockToBackground={true}>
      <Box>
        <Popover>
          <PopoverTrigger>
            <div style={{ display: Object.keys(s.hostedApps).length !== 0 ? 'block' : 'none' }}>
              <IconButton size="lg" aria-label="Notifications" variant="ghost" icon={<HiMail />} />
            </div>
          </PopoverTrigger>

          <PopoverContent>
            <PopoverArrow />

            <PopoverBody>
              {checkAppType() === 0
                ? 'Error. Unsupported file type'
                : checkAppType() === 1
                  ? 'File type accepted'
                  : 'Error. More than 1 app type on board'}
            </PopoverBody>

            {Object.keys(s.messages)?.map((message: string) => (
              <PopoverBody>
                {s.messages[message]}
                <CloseButton size="sm" className="popover-close" onClick={() => closePopovers(message)} />
              </PopoverBody>
            ))}
          </PopoverContent>
        </Popover>

        <Box className="status-container">
          {s.runStatus !== 0 ? (
            s.runStatus === 1 ? (
              <Icon as={BiRun} w={8} h={8} />
            ) : (
              <Icon as={BiErrorCircle} w={8} h={8} />
            )
          ) : (
            <VisuallyHidden>Empty Board</VisuallyHidden>
          )}
        </Box>
      </Box>
    </AppWindow>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  const [aiModel, setAIModel] = useState('Models');
  const [task, setTask] = useState('Tasks');

  // Sends request to backend to execute a model
  function runFunction(model: string) {
    updateState(props._id, {
      runStatus: 1,
      executeInfo: {
        executeFunc: 'execute_model',
        params: { exec_uuid: getUUID(), model_id: model },
      },
    });
  }

  // Sets local model selection.
  const handleSetModel = (model: string) => {
    setAIModel(model);
  };

  // Sets local task selection.
  // TODO Combine setModel and setTask
  const handleSetTask = (task: string) => {
    setTask(task);
    setAIModel('Models');
  };

  return (
    <>
      <div style={{ display: Object.keys(s.hostedApps).length !== 0 ? 'block' : 'none' }}>
        <Stack spacing={2} direction="row">
          <>
            {Object.keys(s.supportedTasks)?.map((type) => {
              return (
                <>
                  <Menu>
                    <MenuButton as={Button} rightIcon={<FiChevronDown />}>
                      {task}
                    </MenuButton>
                    <Portal>
                      <MenuList>
                        {Object.keys(s.supportedTasks[type]).map((tasks) => {
                          return <MenuItem onClick={() => handleSetTask(tasks)}>{tasks}</MenuItem>;
                        })}
                      </MenuList>
                    </Portal>
                  </Menu>

                  <div style={{ display: task !== 'Tasks' ? 'block' : 'none' }}>
                    <Menu>
                      <MenuButton as={Button} rightIcon={<FiChevronDown />}>
                        {aiModel}
                      </MenuButton>
                      <Portal>
                        <MenuList>
                          {s.supportedTasks[type][task]?.map((modelOptions: string) => {
                            return <MenuItem onClick={() => handleSetModel(modelOptions)}>{modelOptions}</MenuItem>;
                          })}
                        </MenuList>
                      </Portal>
                    </Menu>
                  </div>
                </>
              );
            })}
          </>

          <IconButton
            aria-label="Run AI"
            icon={s.runStatus === 0 ? <FaPlay /> : s.runStatus === 1 ? <BiRun /> : <BiErrorCircle />}
            isDisabled={aiModel === 'Models' || s.runStatus !== 0 ? true : false}
            onClick={() => {
              runFunction(aiModel);
            }}
          />
        </Stack>
      </div>
    </>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = () => { return null; };

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
