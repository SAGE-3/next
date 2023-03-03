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


import {useAppStore, useUIStore} from '@sage3/frontend';

import {App} from '../../schema';
import {state as AppState} from './index';
import {AppWindow} from '../../components';

import './styles.css';

import {useEffect, useState, useRef} from 'react';

import {v4 as getUUID} from 'uuid';
import {Position, Size} from "@sage3/shared/types";

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

  const [localHostedApps, setLocalHostedApps] = useState<Record<string, string>>({});

  /**
   * Checks for apps on or off the pane
   * Should work if pane or any hosted apps are moved, resized, or closed out
   */
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
        if (!Object.keys(localHostedApps).includes(app._id)) {
          setLocalHostedApps(localHostedApps => ({
            ...localHostedApps,
            ...client
          }));

        }
      } else {
        // This code is necessary to remove hosted apps and messages once apps are no longer being hosted
        if (Object.keys(localHostedApps).includes(app._id)) {
          const hostedCopy = {...localHostedApps};
          delete hostedCopy[app._id];
          setLocalHostedApps(hostedCopy)
        }
      }
    }
  }, [selApp?.data.position, selApp?.data.size, boardApps, JSON.stringify(localHostedApps)]);

  useEffect(() => {
    updateState(props._id, {hostedApps: localHostedApps});
    console.log('Updated hostedApps: ' + Object.keys(s.hostedApps))
  }, [localHostedApps]);

  /**
   * Move all apps together with the AIPane
   * TODO: Track movement in a local state
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
  }, [props.data.position.x, props.data.position.y, JSON.stringify(localHostedApps)]);


  return (
    <AppWindow app={props} lockToBackground={true}>
      <>
        <Box>
        </Box>
      </>
    </AppWindow>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);


  return (
    <Box>
    </Box>
  );
}

export default {
  AppComponent, ToolbarComponent
}
;
