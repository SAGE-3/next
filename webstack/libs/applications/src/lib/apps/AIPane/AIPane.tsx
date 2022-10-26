/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import {useAppStore, useAssetStore, useUIStore} from '@sage3/frontend';
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
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Portal, Stack,
  Text,
  VisuallyHidden,
} from '@chakra-ui/react';
import {App, AppName} from '../../schema';
import './styles.css';

import {state as AppState} from './index';
import {AppWindow} from '../../components';
import React, {useEffect, useState, useRef} from 'react';
import {FaPlay} from 'react-icons/fa';
import {BiErrorCircle, BiRun} from 'react-icons/bi';
import {GiEmptyHourglass} from 'react-icons/gi';
import {CgSmileMouthOpen} from 'react-icons/cg';
import {FiChevronDown} from 'react-icons/fi';
import {useLocation} from 'react-router-dom';

type UpdateFunc = (id: string, state: Partial<AppState>) => Promise<void>;

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  const zindex = useUIStore((state) => state.zIndex);
  const selectedAppId = useUIStore((state) => state.selectedAppId);
  const boardApps = useAppStore((state) => state.apps);
  const selApp = boardApps.find((el) => el._id === selectedAppId);

  const location = useLocation();
  const locationState = location.state as { roomId: string };
  const assets = useAssetStore((state) => state.assets);
  // const roomAssets = assets.filter((el) => el.data.room == locationState.roomId);
  const update = useAppStore((state) => state.update);

  const prevX = useRef(props.data.position.x);
  const prevY = useRef(props.data.position.y);

  const [outputLocal, setOutputLocal] = useState<{ score: number, label: string, box: object }[]>([])

  const supportedApps = ['Counter', 'ImageViewer', 'Notepad', 'PDFViewer'];

  // Checks for apps on or off the pane
  useEffect(() => {
    for (const app of boardApps) {
      const client = {
        [app._id]: app.data.name,
      };
      if (app.data.name === 'AIPane' && app._id !== props._id) {
        break;
      } else {
        if (
          app.data.position.x + app.data.size.width < props.data.position.x + props.data.size.width &&
          app.data.position.x + app.data.size.width > props.data.position.x &&
          app.data.position.y + app.data.size.height < props.data.position.y + props.data.size.height &&
          app.data.size.height + app.data.position.y > props.data.position.y
        ) {
          if (!Object.keys(s.hostedApps).includes(app._id)) {
            const hosted = {
              ...s.hostedApps,
              ...client,
            };
            updateState(props._id, {hostedApps: hosted});
            updateState(props._id, {messages: hosted});
            console.log('app ' + app._id + ' added');
            newAppAdded(app.data.name);
          } else {
            console.log('app ' + app._id + ' already in hostedApps');
          }
        } else {
          if (Object.keys(s.hostedApps).includes(app._id)) {
            const hostedCopy = {...s.hostedApps};
            delete hostedCopy[app._id];
            updateState(props._id, {hostedApps: hostedCopy});
            updateState(props._id, {messages: hostedCopy});
            console.log('app ' + app._id + ' removed from hostedApps');
          }
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
      const client = {
        [app._id]: app.data.name,
      };
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
      updateState(props._id, {supportedTasks: ""});
    }
  }, [Object.keys(s.hostedApps).length])

  //TODO parse output
  useEffect(() => {
    if (s.output != undefined && Object.keys(s.output).length > 0) {
      const parsedOT = JSON.parse(s.output)
      const arrayOT = parsedOT.output.split("'")
      const parsedArrayOT = JSON.parse(arrayOT[0])
      const modelOutput: {score: number, label: string, box: object}[] = []
      Object.keys(parsedArrayOT).forEach((array) => {
        Object.keys(parsedArrayOT[array]).forEach((entity) => {
          modelOutput.push({
            score: parsedArrayOT[array][entity].score,
            label: parsedArrayOT[array][entity].label,
            box: parsedArrayOT[array][entity].box
          })
        })
      })
      setOutputLocal(modelOutput)
      console.log(modelOutput)
      for (const score in modelOutput) {
        console.log(modelOutput[score].score)
      }
    }
  }, [JSON.stringify(s.output)])



  function checkAppType(app: string) {
    return supportedApps.includes(app);
  }

  function newAppAdded(appType: string) {
    updateState(props._id, {
      executeInfo: {executeFunc: 'new_app_added', params: {app_type: appType}},
    });
    console.log(s.supported_tasks)
    Object.values(s.supported_tasks).forEach(el => console.log(el))
  }

  function closePopovers(info: string) {
    const unchecked = s.messages;
    delete unchecked[info]
    updateState(props._id, {messages: unchecked})

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
            <div style={{display: Object.keys(s.hostedApps).length !== 0 ? "block" : "none"}}>
              <Button variant="ghost" size="lg" color="cyan">
                Message
              </Button>
            </div>
          </PopoverTrigger>

          <PopoverContent>
            <PopoverArrow/>
            <PopoverCloseButton/>
            <PopoverHeader>History</PopoverHeader>

            <PopoverBody>
              {Object.values(s.hostedApps).every(checkAppType) ? 'File type accepted' : 'Error. Unsupported file type'}
            </PopoverBody>

            {Object.keys(s.messages)?.map((message: string, index: number) => (
              <PopoverBody>
                {s.messages[message]}
                <CloseButton size="sm" className="popover-close" onClick={() => closePopovers(message)}/>
              </PopoverBody>
            ))}
          </PopoverContent>
        </Popover>

        <Box className="status-container">
          {s.runStatus ? (
            Object.values(s.hostedApps).every(checkAppType) ? (
              <Icon as={BiRun} w={8} h={8}/>
            ) : (
              <Icon as={BiErrorCircle} w={8} h={8}/>
            )
          ) : (
            <VisuallyHidden>Empty Board</VisuallyHidden>
          )}
        </Box>

        {/*<Box className="output-container">*/}
        {/*  <Text>*/}
        {/*    {s.output}*/}
        {/*  </Text>*/}
        {/*</Box>*/}

      </Box>
    </AppWindow>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  const updateState = useAppStore((state) => state.updateState);

  const location = useLocation();
  const locationState = location.state as { roomId: string };
  const assets = useAssetStore((state) => state.assets);
  // const roomAssets = assets.filter((el) => el.data.room == locationState.roomId);
  const update = useAppStore((state) => state.update);


  const supportedApps = ['Counter', 'ImageViewer', 'Notepad', 'PDFViewer'];

  const [supportedTasks, setSupportedTasks] = useState<{ name: string, models: string[] }[]>([])

  useEffect(() => {
    if (s.supportedTasks != undefined && s.supportedTasks != '') {
      const parsedST = JSON.parse(s.supportedTasks)
      const newTasks: { name: string, models: string[] }[] = [];
      Object.keys(parsedST).forEach(aiType => {
        Object.keys(parsedST[aiType]).forEach(modelName => {
          newTasks.push({
            name: modelName,
            models: parsedST[aiType][modelName]
          })
        })
      })
      setSupportedTasks(newTasks)
    }
  }, [JSON.stringify(s.supportedTasks)])

  function checkAppType(app: string) {
    return supportedApps.includes(app);
  }

  function runFunction() {
    updateState(props._id, {
      executeInfo: {
        executeFunc: 'execute_model',
        params: {some_uuid: '12345678', model_id: 'facebook/detr-resnet-50'}
      },
    });
    updateState(props._id, {runStatus: true});
  }

  const handleModelClick = (model: string) => {
    console.log('run model: ', model)
  }

  return (
    <>
      <div style={{display: Object.keys(s.hostedApps).length !== 0 ? "block" : "none"}}>
        <Stack spacing={2} direction='row'>

          {supportedTasks.map(task => {
            return (
              <Menu>
                <MenuButton as={Button} rightIcon={<FiChevronDown/>}>
                  {task.name}
                </MenuButton>
                <Portal>
                  <MenuList>
                    {task.models.map((name) => {
                      return <MenuItem onClick={() => handleModelClick(name)}>{name}</MenuItem>;
                    })}
                  </MenuList>
                </Portal>
              </Menu>
            )
          })
          }

          <IconButton
            aria-label="Run AI"
            icon={s.runStatus ? <BiRun/> : <FaPlay/>}
            _hover={{opacity: 0.7, transform: 'scaleY(1.3)'}}
            isDisabled={!Object.values(s.hostedApps).every(checkAppType) || !(Object.keys(s.hostedApps).length > 0)}
            onClick={() => {
              runFunction();
            }}
          />
        </Stack>
      </div>

    </>
  );
}

export default {
  AppComponent,
  ToolbarComponent,
};
