/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { apiUrls, useAppStore } from '@sage3/frontend';
import { App, AppGroup } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { useCallback, useEffect, useState } from 'react';
import ComponentSelector from './components/ComponentSelector';
import { useUser } from '@sage3/frontend';

import * as rapidApis from './utils/apis';

// Styling
import './styling.css';
import { CATEGORIES } from './data/constants';
import { Box, Button, Link, Tooltip } from '@chakra-ui/react';
import { FaDownload } from 'react-icons/fa';

/* App component for RAPID */
function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const createApp = useAppStore((state) => state.create);

  // used to get userId
  const { user } = useUser();

  // Create RAPID charts
  async function createRAPIDCharts() {
    try {
      const positionX = props.data.position.x;
      const positionY = props.data.position.y;
      const width = props.data.size.width;
      const height = props.data.size.height;
      const max = 4;

      const promises = [];

      for (const category in CATEGORIES) {
        console.log('category', category);
        // ignore creation of Control Panel
        const name = CATEGORIES[`${category}` as keyof typeof CATEGORIES].name;
        const order = CATEGORIES[`${category}` as keyof typeof CATEGORIES].order;

        if (name === 'Control Panel') continue;

        promises.push(
          createApp({
            title: 'RAPID',
            roomId: props.data.roomId!,
            boardId: props.data.boardId!,
            position: {
              x: (order % max) * width + positionX,
              y: Math.floor(order / max) * height + positionY,
              z: 0,
            },
            size: {
              width: props.data.size.width,
              height: props.data.size.height,
              depth: 0,
            },
            type: 'RAPID',
            rotation: { x: 0, y: 0, z: 0 },
            state: {
              parent: props._id,
              category: name,
            },
            raised: true,
            dragging: false,
            pinned: false,
          })
        );
      }

      const resolution = await Promise.all(promises);

      updateState(props._id, {
        children: [...s.children, ...resolution.map((res) => res.data._id)],
      });
    } catch (e) {
      console.log('ERROR in RAPID:', e);
    }
  }

  const [test, setTest] = useState<any[]>([]);
  /**
   * Add userid to unique field. This is used to prevent useEffect to be triggered
   * by multiple clients upon generation of the apps
   */
  useEffect(() => {
    async function isUniqueClient() {
      await updateState(props._id, {
        unique: user?._id,
      });
    }
    if (!s.unique) {
      isUniqueClient();
    }
  }, []);

  console.log('test', test);

  // create charts
  useEffect(() => {
    if (s.unique === user?._id) {
      console.log('unique');
      // prevents charts from infinitely generating
      if (s.initialized === false) {
        updateState(props._id, {
          initialized: true,
        });
        console.log('creating charts');
        // creates charts
        createRAPIDCharts();
      }
    } else {
      console.log('not unique');
    }
  }, [s.unique]);

  return (
    <AppWindow app={props}>
      <>
        <ComponentSelector propsData={props as App} />
      </>
    </AppWindow>
  );
}

/* App toolbar component for the app RAPID */
function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  return (
    <Box display="flex" gap="2" alignItems="center">
    </Box>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = (props: { apps: AppGroup }) => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
