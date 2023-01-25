/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import {
  Box,
  Button, ButtonGroup,
  CloseButton,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Portal,
  Tooltip,
  VisuallyHidden,
} from '@chakra-ui/react';

import {FaPlay} from 'react-icons/fa';
import {BiErrorCircle, BiRun} from 'react-icons/bi';
import {HiMail} from 'react-icons/hi';
import {FiChevronDown} from 'react-icons/fi';

import {useAppStore, useUIStore} from '@sage3/frontend';

import {App} from '../../schema';
import {state as AppState} from './index';
import {AppWindow} from '../../components';

import './styles.css';

import {useEffect, useState, useRef} from 'react';

import {v4 as getUUID} from 'uuid';

type UpdateFunc = (id: string, state: Partial<AppState>) => Promise<void>;

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  const selectedAppId = useUIStore((state) => state.selectedAppId);
  const boardApps = useAppStore((state) => state.apps);
  const selApp = boardApps.find((el) => el._id === selectedAppId);

  const update = useAppStore((state) => state.update);

  /**
   * Keeps track of AI Pane previous position, necessary to move hosted apps with pane
   */
  const prevX = useRef(props.data.position.x);
  const prevY = useRef(props.data.position.y);

  const prevHosted = useRef(s.hostedApps);

  /**
   * supportedApps currently hardcoded in frontend
   */
    // TODO Need to let backend set supportedApps
  const supportedApps = ['ImageViewer', 'Notepad', 'PDFViewer'];

  /**
   * Checks for apps on or off the pane
   * Should work if pane or any hosted apps are moved, resized, or closed out
   */
  useEffect(() => {
    // Check all apps on board
    for (const app of boardApps) {
      const client = {[app._id]: app.data.type};


      // Doing this, a message for what apps are on the board will be re-added even after deletion from the popover if pane is moved
      // Or rerendered in some way
      const message = {[app._id]: app.data.title};


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
            ...client
          };
          const messages = {
            ...s.messages,
            ...message
          }
          updateState(props._id, {hostedApps: hosted});
          // TODO Make messages more informative rather than simply names of apps being hosted
          // Maybe show results in message? Objects detected and scores?
          updateState(props._id, {messages: messages});
          newAppAdded(app.data.type);
        }
      } else {
        // This code is necessary to remove hosted apps and messages once apps are no longer being hosted
        if (Object.keys(s.hostedApps).includes(app._id)) {
          const hostedCopy = {...s.hostedApps};
          const messagesCopy = {...s.messages};
          delete hostedCopy[app._id];
          delete messagesCopy[app._id];
          updateState(props._id, {messages: messagesCopy, hostedApps: hostedCopy});
        }
      }
    }
  }, [selApp?.data.position.x, selApp?.data.position.y, selApp?.data.size.height, selApp?.data.size.width, JSON.stringify(boardApps), JSON.stringify(s.hostedApps)]);


  /**
   * Currently, every client updates once one does. Eventually add a way to monitor userID's and let only one person send update to server
   * Refer to videoViewer play function
   * Currently needed to keep track of hosted apps that are added when created or removed when deleted from board, rather than only those moved on and off
   */
  // TODO Be mindful of client updates
  // TODO This seems pretty bad and does not clear messages if app is closed out instead of moved off pane
  useEffect(() => {
    const copyofhostapps = {} as { [key: string]: string };
    const copyofmessages = {} as { [key: string]: string };
    Object.keys(s.hostedApps).forEach((key: string) => {
      const app = boardApps.find((el) => el._id === key);
      if (app) {
        copyofhostapps[key] = app.data.type
        copyofhostapps[key] = app.data.title
      }
    });
    updateState(props._id, {hostedApps: copyofhostapps});
    updateState(props._id, {messages: copyofmessages})
  }, [boardApps.length]);

  /**
   * Move all apps together with the AIPane
   */
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

  /**
   * If there are no hostedApps, reset supportedTasks to empty
   */
  useEffect(() => {
    if (Object.keys(s.hostedApps).length === 0) {
      updateState(props._id, {supportedTasks: {}});
    }
  }, [Object.keys(s.hostedApps).length]);

  /**
   * Sets run status to error if user attempts to run pane on > 1 app type
   */
  useEffect(() => {

    /**
     * If more than 1 app added to pane, checks that all hosted apps are of the same type
     *   @return sets run status to error if there is more than 1 hosted app types.
     */
    const hostedTypes = new Set(Object.values(s.hostedApps));

    if (Array.from(hostedTypes).length > 1) {
      updateState(props._id, {runStatus: 2, supportedTasks: {}})
      // updateState(props._id, {supportedTasks: {}});
    } else {
      if (supportedApps.includes([...hostedTypes][0]) || Object.keys(s.hostedApps).length === 0) {
        updateState(props._id, {runStatus: 0, executeInfo: {executeFunc: 'new_app_added', params: {app_type: [...hostedTypes][0]}}})
      } else {
        updateState(props._id, {runStatus: 3})

      }
    }
  }, [Object.keys(s.hostedApps).length])


  /**
   * Notifies backend of a new app being added, and it's app type
   *
   * @param appType
   */
  function newAppAdded(appType: string) {
    updateState(props._id, {
      executeInfo: {executeFunc: 'new_app_added', params: {app_type: appType}},
    });
  }

  /**
   * Custom close button to remove messages from messages menu.
   *
   * @param info
   */
  // TODO need to permanently keep messages off menu. Currently reproduces full list of messages upon certain renders
  function closePopovers(info: string) {
    const unchecked = s.messages;
    delete unchecked[info];

    // these updateState calls should be combined
    // TODO Ask Ryan what he means
    updateState(props._id, {messages: unchecked});

    if (Object.keys(s.messages).includes(info)) {
      const messagesCopy = {...s.messages};
      delete messagesCopy[info];
      updateState(props._id, {messages: messagesCopy});
    }
  }

  return (
    <AppWindow app={props} lockToBackground={true}>
      <>
        <Box>
          <Box padding={'2rem'}>
            <Popover
              placement='bottom-start'
            >
              <PopoverTrigger>
                <div style={{display: Object.keys(s.hostedApps).length !== 0 ? 'block' : 'none'}}>
                  <IconButton padding={"1.5rem"} fontSize={'2.5rem'} aria-label="Notifications" variant="ghost"
                              icon={<HiMail/>}/>
                </div>
              </PopoverTrigger>

              <PopoverContent fontSize="1.5rem">
                <PopoverBody>
                  {s.runStatus === 2
                    ? 'Error: Unsupported file type'
                    : s.runStatus === 0
                      ? 'File type accepted'
                      : s.runStatus === 1
                        ? 'Running '
                        : 'Error: More than 1 app type on board'}
                  {/*{s.runStatus === 2*/}
                  {/*  ? 'Error: Unsupported file type'*/}
                  {/*  : s.runStatus === 0*/}
                  {/*    ? 'File type accepted'*/}
                  {/*    : 'Error: More than 1 app type on board'}*/}
                </PopoverBody>

                {Object.keys(s.messages)?.map((message: string) => (
                  <PopoverBody>
                    {s.messages[message]}
                    <CloseButton size="lg" className="popover-close" onClick={() => closePopovers(message)}/>
                  </PopoverBody>
                ))}
              </PopoverContent>
            </Popover>
          </Box>

          <Box className="status-container">
            {s.runStatus !== 0 ? (
              s.runStatus === 1 ? (
                <Tooltip label="Running jobs">
                  <span><Icon as={BiRun} w={10} h={10}/></span>
                </Tooltip>
              ) : (
                <Tooltip label="Error when trying to run model">
                  <span><Icon as={BiErrorCircle} w={12} h={12}/></span>
                </Tooltip>
              )
            ) : (
              <VisuallyHidden>Empty Board</VisuallyHidden>
            )}
          </Box>
        </Box>
      </>
    </AppWindow>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  const [aiModel, setAIModel] = useState('Models');
  const [task, setTask] = useState('Tasks');

  const hasHostedApps = Object.keys(s.hostedApps).length !== 0;
  // console.log("SupportedTasks", s.supportedTasks);

  /**
   * Sends request to backend to execute a model
   *
   * @param model
   */
  function runFunction(model: string) {
    updateState(props._id, {
      runStatus: 1,
      executeInfo: {
        executeFunc: 'execute_model',
        params: {exec_uuid: getUUID(), model_id: model},
      },
    });
  }

  /**
   * Sets local model selection.
   *
   * @param model
   */
  const handleSetModel = (model: string) => {
    setAIModel(model);
  };

  /**
   * Sets local task selection.
   *
   * @param task
   */
    // TODO Combine setModel and setTask
  const handleSetTask = (task: string) => {
      setTask(task);
      setAIModel('Models');
    };

  return (
    <>
      {hasHostedApps &&
        <div>

          <ButtonGroup spacing={1} size={'sm'}>
            <>
              {Object.keys(s.supportedTasks)?.map((type, idx) => {
                return (
                  <>
                    <Menu>
                      <MenuButton as={Button} rightIcon={<FiChevronDown/>} key={idx}>
                        {task}
                      </MenuButton>
                      <Portal>
                        <MenuList>
                          {Object.keys(s.supportedTasks[type])?.map((tasks, idx) => {
                            return <MenuItem onClick={() => handleSetTask(tasks)} key={idx}>{tasks}</MenuItem>;
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
                            {s.supportedTasks[type][task]?.map((modelOptions: string, idx: number) => {
                              return <MenuItem onClick={() => handleSetModel(modelOptions)}
                                               key={idx}>{modelOptions}</MenuItem>;
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
              isDisabled={aiModel !== 'Models' && s.runStatus === 0 ? false : true}
              onClick={() => {
                runFunction(aiModel);
              }}
            />
          </ButtonGroup>
        </div>
      }
    </>
  );
}

export default {AppComponent, ToolbarComponent};
