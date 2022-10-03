/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import {useAppStore, useAssetStore, useUIStore} from "@sage3/frontend";
import {
  Box,
  Button,
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
  Portal,
  Select,
  Tooltip,
  useToast,
} from "@chakra-ui/react";
import {App, AppName} from "../../schema";
import "./styles.css";

import {state as AppState} from "./index";
import {AppWindow} from "../../components";
import React, {useEffect, useState, useRef} from "react";
import {BsFillTriangleFill} from "react-icons/bs";
import {BiErrorCircle} from "react-icons/bi";
import {GiEmptyHourglass} from "react-icons/gi";
import {CgSmileMouthOpen} from "react-icons/cg";
import {FiChevronDown} from "react-icons/fi";
import {useLocation} from "react-router-dom";

type UpdateFunc = (id: string, state: Partial<AppState>) => Promise<void>;

function CustomToastExample(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  const toast = useToast();
  return (
    <Button
      onClick={() =>
        toast({
          position: "top-left",
          render: () => (
            <Box color="white" p={3} bg="blue.500">
              Hello World
            </Box>
          ),
        })
      }
    >
      Show Toast
    </Button>
  );
}

// function statusIcon(props: App): JSX.Element {
//   const s = props.data.state as AppState;
//   const updateState = useAppStore(state => state.updateState);
//
//   const toast = useToast()
//   return (
//     <Button
//       onClick={() =>
//         toast({
//           position: 'top-left',
//           render: () => (
//             <Box color='white' p={3} bg='blue.500'>
//               Hello World
//             </Box>
//           ),
//         })
//       }
//     >
//       Show Toast
//     </Button>
//   )
// }

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
  const roomAssets = assets.filter(
    (el) => el.data.room == locationState.roomId
  );
  const update = useAppStore((state) => state.update);

  const prevX = useRef(0);
  const prevY = useRef(0);

  const supportedApps = ["Counter", "Leaflet", "Notepad"];

  // Checks for apps on or off the pane
  useEffect(() => {
    for (const app of boardApps) {
      const client = {
        [app._id]: app.data.name,
      };
      // TODO Handle AIPanes overlapping AIPanes
      // const includedAppTypes: AppName[] = ['AIPane']
      if (app.data.name === "AIPane" && app._id !== props._id) {
        break;
      } else {
        if (
          app.data.position.x + app.data.size.width <
          props.data.position.x + props.data.size.width &&
          app.data.position.x + app.data.size.width > props.data.position.x &&
          app.data.position.y + app.data.size.height <
          props.data.position.y + props.data.size.height &&
          app.data.size.height + app.data.position.y > props.data.position.y
        ) {
          if (!Object.keys(s.hostedApps).includes(app._id)) {
            const hosted = {
              ...s.hostedApps,
              ...client,
            };
            updateState(props._id, {hostedApps: hosted});
            console.log("app " + app._id + " added");
          } else {
            console.log("app " + app._id + " already in hostedApps");
          }
        } else {
          if (Object.keys(s.hostedApps).includes(app._id)) {
            const hostedCopy = {...s.hostedApps};
            delete hostedCopy[app._id];
            updateState(props._id, {hostedApps: hostedCopy});
            console.log("app " + app._id + " removed from hostedApps");
          }
        }
      }
    }
  }, [
    selApp?.data.position.x,
    selApp?.data.position.y,
    selApp?.data.size.height,
    selApp?.data.size.width,
    JSON.stringify(boardApps),
  ]);

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
  }, [
    props.data.position.x,
    props.data.position.y,
    JSON.stringify(s.hostedApps),
  ]);

  function checkAppType(app: string) {
    console.log("App name: " + app);
    return supportedApps.includes(app);
  }

  return (
    <AppWindow app={props} lockToBackground={true}>
      <Box>
        <div>
          {/*<div className="message-container" style={{display: Object.keys(s.hostedApps).length !== 0 ? "block" : "none"}}>*/}
          <div>
            <Popover>
              <PopoverTrigger>
                <Button
                  isDisabled={
                    Object.keys(s.hostedApps).length !== 0 ? false : true
                  }
                  variant="ghost"
                >
                  Message
                </Button>
              </PopoverTrigger>

              {/*TODO Check app type, if hosted app is correct type then accept, else error*/}
              <PopoverContent>
                <PopoverArrow/>
                <PopoverCloseButton/>
                <PopoverHeader>
                  {Object.values(s.hostedApps).every(checkAppType)
                    ? "File type accepted"
                    : "Error. Unsupported file type"}
                </PopoverHeader>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <Box
          width="100%"
          height="100%"
          display="flex"
          alignItems="center"
          justifyContent="center"
          position="absolute"
        >
          <Box className="status-container" position="absolute">
            {Object.keys(s.hostedApps).length === 0 ? (
              <Tooltip label="Ready" fontSize="md">
                <Icon as={CgSmileMouthOpen} w={8} h={8}/>
              </Tooltip>
            ) : (
              <Tooltip label="Running" fontSize="md">
                <Icon as={GiEmptyHourglass} w={8} h={8}/>
              </Tooltip>
            )}
          </Box>

          <Box position="relative">
            selectedApp {selectedAppId}
            <br/>
            length of hostedappsarr: {Object.keys(s.hostedApps).length}
            <br/>
            hostedapps: {Object.values(s.hostedApps)}
            <br/>

          </Box>
        </Box>
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
  const roomAssets = assets.filter(
    (el) => el.data.room == locationState.roomId
  );
  const update = useAppStore((state) => state.update);

  const models = ["Model 1", "Model 2", "Model 3"];

  function testFunction() {
    updateState(props._id, {
      executeInfo: {executeFunc: "test_function", params: {}},
    });
  }

  return (
    <>
      {/* TODO Temporary - Board assets dropdown */}
      {/* <Box>
        <Select placeholder="Select File" onChange={handleFileSelected}>
          {roomAssets.map((el) => (
            <option value={el._id}>{el.data.originalfilename}</option>
          ))}
        </Select>
      </Box> */}
      <Menu>
        <MenuButton as={Button} rightIcon={<FiChevronDown/>}>
          Models
        </MenuButton>
        <Portal>
          <MenuList>
            {models.map((model) => {
              return <MenuItem>{model}</MenuItem>;
            })}
          </MenuList>
        </Portal>
      </Menu>
      <IconButton
        aria-label="Run AI"
        icon={<BsFillTriangleFill/>}
        _hover={{opacity: 0.7, transform: "scaleY(1.3)"}}
        onClick={() => {
          testFunction();
        }}
      />
    </>
  );
}

export default {AppComponent, ToolbarComponent};
