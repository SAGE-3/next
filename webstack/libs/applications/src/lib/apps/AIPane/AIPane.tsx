/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useRef } from "react";

import {
  Box, Button, IconButton, Menu, MenuButton,
  MenuItem, MenuList, Popover, PopoverArrow, PopoverBody,
  PopoverCloseButton, PopoverContent, PopoverHeader, PopoverTrigger,
  Portal, useToast
} from '@chakra-ui/react';

import { BsFillTriangleFill } from "react-icons/bs";
import { FiChevronDown } from "react-icons/fi";

import { useAppStore, useUIStore } from '@sage3/frontend';

import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';

import './styles.css';

// type UpdateFunc = (id: string, state: Partial<AppState>) => Promise<void>;

function CustomToastExample(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore(state => state.updateState);
  const toast = useToast();

  return (<Button
    onClick={() =>
      toast({
        position: 'top-left',
        render: () => (
          <Box color='white' p={3} bg='blue.500'>
            Hello World
          </Box>
        ),
      })
    }
  >
    Show Toast
  </Button>);
}

/**
 * App
 *
 * @param {App} props
 * @returns {JSX.Element}
 */
function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);

  const selectedAppId = useUIStore((state) => state.selectedAppId);
  const boardApps = useAppStore(state => state.apps);
  const selApp = boardApps.find(el => el._id === selectedAppId);

  const prevX = useRef(0)
  const prevY = useRef(0)

  // Way to manage a collection of App objects in local state
  // const apps = useAppStore(state => state.apps);

  // const [selApps, setSelApps] = useState<App[]>([]);
  //
  // useEffect(() => {
  //   const selAppsArray = [] as App[];
  //   Object.keys(s.hostedApps).forEach(id => {
  //     const app = apps.find(app => app._id === id);
  //     if (app) selAppsArray.push(app)
  //   });
  //   setSelApps(selAppsArray);
  // }, [JSON.stringify(s.hostedApps), apps])

  // Checks for apps on or off the pane
  useEffect(() => {
    for (const app of boardApps) {
      const client = { [app._id]: app.data.name };

      // TODO Handle AIPanes overlapping AIPanes
      // const includedAppTypes: AppName[] = ['AIPane']
      if (app.data.type === 'AIPane' && app._id !== props._id) {
        break;
      } else {
        if (
          app.data.position.x + app.data.size.width < props.data.position.x + props.data.size.width &&
          app.data.position.x + app.data.size.width > props.data.position.x &&
          app.data.position.y + app.data.size.height < props.data.position.y + props.data.size.height &&
          app.data.size.height + app.data.position.y > props.data.position.y
        ) {
          // TODO do something to ignore AIPanes
          if (!Object.keys(s.hostedApps).includes(app._id)) {
            const hosted = {
              ...s.hostedApps,
              ...client
            }
            updateState(props._id, { hostedApps: hosted })
            console.log('AIPane> app', app._id, 'added');
          } else {
            console.log('AIPane> app ' + app._id + ' already in hostedApps')
          }
        } else {
          if (Object.keys(s.hostedApps).includes(app._id)) {
            const hostedCopy = { ...s.hostedApps };
            delete hostedCopy[app._id];
            updateState(props._id, { hostedApps: hostedCopy });
            console.log('AIPane> app', app._id, 'removed from hostedApps');
          }
        }
      }

    }
  }, [selApp?.data.position, selApp?.data.size])

  //TODO Be mindful of client updates
  // Currently, every client updates once one does. Eventually add a way to monitor userID's and let only one person send update to server
  // Refer to videoViewer play function
  useEffect(() => {
    const appIds = boardApps.map(el => el._id);
    const copyofhostapps = {} as { [key: string]: string };

    Object.keys(s.hostedApps).forEach((key: string) => {
      if (appIds.includes(key)) copyofhostapps[key] = key;
    });
    updateState(props._id, { hostedApps: copyofhostapps });
  }, [boardApps.length])

  // // Test function for backend, just prints hosted app ID's
  // useEffect(() => {
  //   testFunction()
  // }, [Object.keys(s.hostedApps).length])

  //TODO Move all apps together with the AIPane
  useEffect(() => {
    const hostedCopy = { ...s.hostedApps };
    const xDiff = props.data.position.x - prevX.current;
    const yDiff = props.data.position.y - prevY.current;

    // console.log("xDiff " + xDiff);
    // console.log("yDiff " + yDiff);

    for (const app of boardApps) {
      const client = { [app._id]: app.data.name };
      if (Object.keys(hostedCopy).includes(app._id)) {
        update(app._id, {
          position: {
            x: app.data.position.x += xDiff,
            y: app.data.position.y += yDiff,
            z: app.data.position.z
          }
        })
      }
    }
    // console.log("Cluster useEffect")
    prevX.current = props.data.position.x;
    prevY.current = props.data.position.y;
  }, [props.data.position.x, props.data.position.y])

  const handleFileSelected = () => {
    // TODO
  }

  function testFunction() {
    updateState(props._id, { executeInfo: { "executeFunc": "test_function", "params": {} } });
  }

  return (
    <AppWindow app={props} lockToBackground={true}>
      <Box>
        <div className="message-container" style={{ display: Object.keys(s.hostedApps).length !== 0 ? "block" : "none" }}>
          <Popover>
            <PopoverTrigger>
              <Button>Trigger</Button>
            </PopoverTrigger>
            <PopoverContent>
              <PopoverArrow />
              <PopoverCloseButton />
              <PopoverHeader>Confirmation!</PopoverHeader>
              <PopoverBody>Are you sure you want to have that milkshake?</PopoverBody>
            </PopoverContent>
          </Popover>
          <CustomToastExample {...props} />
        </div>
        <Box width="100%" height="100%" display="flex" alignItems="center" justifyContent="center" position="absolute">
          <Box className="status-container">
            {Object.keys(s.hostedApps).length > 0 ? (<span className="green-circle" />) : (<span className="red-circle" />)}
          </Box>

          <>
            selectedApp {selectedAppId}<br />
            length of hostedappsarr: {Object.keys(s.hostedApps).length}<br />
            hostedapps: {Object.values(s.hostedApps)}<br />

            {/*Board assests dropdown*/}
            {/*<Select placeholder='Select File' onChange={handleFileSelected}>*/}
            {/*  {roomAssets.map(el =>*/}
            {/*    <option value={el._id}>{el.data.originalfilename}</option>)*/}
            {/*  }*/}
            {/*</Select>*/}
          </>
          <CustomToastExample {...props} />
        </Box>
      </Box>
    </AppWindow>
  );
}

/**
 * UI compoent
 *
 * @param {App} props
 * @returns {JSX.Element}
 */
function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const models = ["Model 1", "Model 2", "Model 3"];

  function testFunction() {
    updateState(props._id, { executeInfo: { "executeFunc": "test_function", "params": {} } })
  }

  return (
    <>
      <Menu>
        <MenuButton as={Button} rightIcon={<FiChevronDown />}>
          Models
        </MenuButton>
        <Portal>
          <MenuList>
            {models.map((model) => {
              return (
                <MenuItem>
                  {model}
                </MenuItem>
              )
            })
            }
          </MenuList>
        </Portal>

      </Menu>
      <IconButton
        aria-label="Run AI"
        icon={<BsFillTriangleFill />}
        _hover={{ opacity: 0.7 }}
        onClick={() => {
          testFunction()
        }
        }
      />
    </>
  );
}

export default { AppComponent, ToolbarComponent };
