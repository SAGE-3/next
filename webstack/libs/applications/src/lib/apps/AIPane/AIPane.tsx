/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
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

import {FaPlay} from 'react-icons/fa';
import {BiErrorCircle, BiRun} from 'react-icons/bi';
import {FiChevronDown} from 'react-icons/fi';

import {useAppStore, useUIStore} from '@sage3/frontend';

import {App} from '../../schema';
import {state as AppState} from './index';
import {AppWindow} from '../../components';

import './styles.css';

import {useEffect, useState, useRef} from 'react';

import {v4 as getUUID} from 'uuid';

type UpdateFunc = (id: string, state: Partial<AppState>) => Promise<void>;

// const heartBeatTimeCheck = 1000 * 10; // 1 min

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  const selectedAppId = useUIStore((state) => state.selectedAppId);
  const boardApps = useAppStore((state) => state.apps);
  const selApp = boardApps.find((el) => el._id === selectedAppId);

  const update = useAppStore((state) => state.update);

  const prevX = useRef(props.data.position.x);
  const prevY = useRef(props.data.position.y);

  const supportedApps = ['ImageViewer', 'Notepad', 'PDFViewer'];

  // Checks for apps on or off the pane
  useEffect(() => {
    for (const app of boardApps) {
      const client = {[app._id]: app.data.type};

      // TODO Handle AIPanes overlapping AIPanes
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
          updateState(props._id, {hostedApps: hosted});
          updateState(props._id, {messages: hosted});
          console.log('app ' + app._id + ' added');
          newAppAdded(app.data.type);
        } else {
          console.log('app ' + app._id + ' already in hostedApps');
        }
      } else {
        if (Object.keys(s.hostedApps).includes(app._id)) {
          const hostedCopy = {...s.hostedApps};
          delete hostedCopy[app._id];
          updateState(props._id, {messages: hostedCopy, hostedApps: hostedCopy});
        }
      }
    }
  }, [selApp?.data.position.x, selApp?.data.position.y, selApp?.data.size.height, selApp?.data.size.width, JSON.stringify(boardApps)]);

  //TODO Be mindful of client updates
  // Currently, every client updates once one does. Eventually add a way to monitor userID's and let only one person send update to server
  // Refer to videoViewer play function
  useEffect(() => {
    const appIds = boardApps.map((el) => el._id);
    const copyofhostapps = {} as { [key: string]: string };

    Object.keys(s.hostedApps).forEach((key: string) => {
      if (appIds.includes(key)) copyofhostapps[key] = key;
    });
    updateState(props._id, {hostedApps: copyofhostapps});
  }, [boardApps.length]);

  // Move all apps together with the AIPane
  useEffect(() => {
    const hostedCopy = {...s.hostedApps};
    const xDiff = props.data.position.x - prevX.current;
    const yDiff = props.data.position.y - prevY.current;

    for (const app of boardApps) {
      const client = {[app._id]: app.data.type};
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

  useEffect(() => {
    if (Object.keys(s.hostedApps).length === 0) {
      updateState(props._id, {supportedTasks: {}});
    }
  }, [Object.keys(s.hostedApps).length]);

  // Interval to check if the proxy is still alive
  // useEffect(() => {
  //   const checkHeartBeat = setInterval(async () => {
  //     const response = await fetch('/api/time');
  //     const time = await response.json();
  //     const delta = Math.abs(time.epoch - s.lastHeartBeat);
  //     console.log('Heartbeat Check', time.epoch, s.lastHeartBeat, delta, s.runStatus);
  //     if (delta > heartBeatTimeCheck && s.runStatus) {
  //       updateState(props._id, {runStatus: false});
  //     }
  //   }, 15 * 1000); // 15 Seconds
  //   return () => clearInterval(checkHeartBeat);
  // }, [s.lastHeartBeat, s.runStatus]);

  function checkAppType(app: string) {
    return supportedApps.includes(app);
  }

  function newAppAdded(appType: string) {
    updateState(props._id, {
      executeInfo: {executeFunc: 'new_app_added', params: {app_type: appType}},
    });
  }

  function closePopovers(info: string) {
    const unchecked = s.messages;
    delete unchecked[info];

    // these updateState calls should be combined
    updateState(props._id, {messages: unchecked});

    if (Object.keys(s.messages).includes(info)) {
      const messagesCopy = {...s.messages};
      delete messagesCopy[info];
      updateState(props._id, {messages: messagesCopy});
    }
  }

  return (
    <AppWindow app={props} lockToBackground={true}>
      <Box>

        <Popover>
          <PopoverTrigger>
            <div style={{display: Object.keys(s.hostedApps).length !== 0 ? 'block' : 'none'}}>
              <Button variant="ghost" size="lg" color="cyan">
                {s.runStatus}
              </Button>
            </div>
          </PopoverTrigger>

          <PopoverContent>
            <PopoverArrow/>

            <PopoverBody>
              {Object.values(s.hostedApps).every(checkAppType) ? 'File type accepted' : 'Error. Unsupported file type'}
            </PopoverBody>

            {Object.keys(s.messages)?.map((message: string) => (
              <PopoverBody>
                {s.messages[message]}
                <CloseButton size="sm" className="popover-close" onClick={() => closePopovers(message)}/>
              </PopoverBody>
            ))}
          </PopoverContent>
        </Popover>

        <Box className="status-container">
          {s.runStatus !== 0
            ? (s.runStatus === 1
                ? (<Icon as={BiRun} w={8} h={8}/>)
                : (<Icon as={BiErrorCircle} w={8} h={8}/>)
            )
            : (<VisuallyHidden>Empty Board</VisuallyHidden>)}
        </Box>
      </Box>
    </AppWindow>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  const supportedApps = ['ImageViewer', 'Notepad', 'PDFViewer'];

  const [aiModel, setAIModel] = useState('Models');
  const [task, setTask] = useState('Tasks');

  function checkAppType(app: string) {
    return supportedApps.includes(app);
  }

  function runFunction(model: string) {
    updateState(props._id, {
      runStatus: 1,
      executeInfo: {
        executeFunc: 'execute_model',
        params: {exec_uuid: getUUID(), model_id: model},
      },
    });
  }

  const handleSetModel = (model: string) => {
    setAIModel(model);
  };

  const handleSetTask = (task: string) => {
    setTask(task);
    setAIModel('Models');
  };

  return (
    <>
      <div style={{display: Object.keys(s.hostedApps).length !== 0 ? 'block' : 'none'}}>
        <Stack spacing={2} direction="row">
          <>
            {Object.keys(s.supportedTasks)?.map((type) => {
              return (
                <>
                  <Menu>
                    <MenuButton as={Button} rightIcon={<FiChevronDown/>}>
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

                  <div style={{display: task !== 'Tasks' ? 'block' : 'none'}}>
                    <Menu>
                      <MenuButton as={Button} rightIcon={<FiChevronDown/>}>
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
            icon={s.runStatus === 0 ? <FaPlay/> : s.runStatus === 1 ? <BiRun/> : <BiErrorCircle/>}
            _hover={{opacity: 0.7, transform: 'scaleY(1.3)'}}
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

export default {AppComponent, ToolbarComponent};
