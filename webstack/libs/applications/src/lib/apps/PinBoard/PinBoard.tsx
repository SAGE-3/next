/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import {
  Box,
  IconButton,
  Popover,
  PopoverTrigger,
  useColorModeValue,
} from '@chakra-ui/react';

import {HiMail} from 'react-icons/hi';

import {useAppStore, useUIStore, useHexColor} from '@sage3/frontend';

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

  // Keeps track of Pin Board previous position, necessary to move hosted apps with board
  const prevX = useRef(props.data.position.x);
  const prevY = useRef(props.data.position.y);

  // Generate a random color
  // const randColor = () => {
  //   const colors =
  //     [
  //       "red.400",
  //       "green.400",
  //       "blue.400",
  //       "yellow.400",
  //       "purple.400",
  //       "pink.400",
  //       "teal.400",
  //     ]
  //   const randomIndex = Math.floor(Math.random() * colors.length);
  //   return colors[randomIndex];
  // }

  // Colors
  const bg = useColorModeValue('yellow.100', 'yellow.400');
  const backgroundColor = useHexColor(bg);

  // Checks for apps on or off the pane
  useEffect(() => {
    // Check all apps on board
    for (const app of boardApps) {
      const client = {[app._id]: app.data.type};

      // Hosted app window should fall within AI Pane window
      // Ignore apps already being hosted
      if (
        app.data.position.x + app.data.size.width < props.data.position.x + props.data.size.width &&
        app.data.position.x + app.data.size.width > props.data.position.x &&
        app.data.position.y + app.data.size.height < props.data.position.y + props.data.size.height &&
        app.data.size.height + app.data.position.y > props.data.position.y &&
        app.data.type !== 'PinBoard'
      ) {
        if (!Object.keys(s.hostedApps).includes(app._id)) {
          const hosted = {
            ...s.hostedApps,
            ...client,
          };
          updateState(props._id, {hostedApps: hosted});
          // TODO Make messages more informative rather than simply types of apps being hosted
          // console.log('app ' + app._id + ' added');
          newAppAdded(app.data.type);
        } else {
          // console.log('app ' + app._id + ' already in hostedApps');
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
    updateState(props._id, {hostedApps: copyofhostapps});
  }, [boardApps.length]);

  // Move all apps together with the Pin Board
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

  // Notifies backend of a new app being added and it's app type
  function newAppAdded(appType: string) {
    updateState(props._id, {
      executeInfo: {executeFunc: 'new_app_added', params: {app_type: appType}},
    });
  }

  return (
    <AppWindow app={props} lockToBackground={true}>
      <Box bgColor={bg} w={'100%'} h={'100%'} opacity={0.3}></Box>
    </AppWindow>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  return (
    <>
    </>
  );
}

export default {AppComponent, ToolbarComponent};
