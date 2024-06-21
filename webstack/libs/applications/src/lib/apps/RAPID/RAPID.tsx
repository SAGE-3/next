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
import StationEditorModal from './components/StationEditorModal';

import * as rapidApis from './utils/apis';

// Styling
import './styling.css';
import { CATEGORIES } from './data/constants';
import { Box, Button, Link, Select, Tooltip } from '@chakra-ui/react';
import { FaDownload } from 'react-icons/fa';

/* App component for RAPID */
function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const createApp = useAppStore((state) => state.create);

  // used to get userId
  // const { user } = useUser();

  // Create RAPID charts
  // async function createRAPIDCharts() {
  //   try {
  //     const positionX = props.data.position.x;
  //     const positionY = props.data.position.y;
  //     const width = props.data.size.width;
  //     const height = props.data.size.height;
  //     const max = 4;

  //     const promises = [];

  //     for (const category in CATEGORIES) {
  //       console.log('category', category);
  //       // ignore creation of Control Panel
  //       const name = CATEGORIES[`${category}` as keyof typeof CATEGORIES].name;
  //       const order = CATEGORIES[`${category}` as keyof typeof CATEGORIES].order;

  //       if (name === 'Control Panel') continue;

  //       promises.push(
  //         createApp({
  //           title: 'RAPID',
  //           roomId: props.data.roomId!,
  //           boardId: props.data.boardId!,
  //           position: {
  //             x: (order % max) * width + positionX,
  //             y: Math.floor(order / max) * height + positionY,
  //             z: 0,
  //           },
  //           size: {
  //             width: props.data.size.width,
  //             height: props.data.size.height,
  //             depth: 0,
  //           },
  //           type: 'RAPID',
  //           rotation: { x: 0, y: 0, z: 0 },
  //           state: {
  //             parent: props._id,
  //             category: name,
  //           },
  //           raised: true,
  //           dragging: false,
  //           pinned: false,
  //         })
  //       );
  //     }

  //     const resolution = await Promise.all(promises);

  //     updateState(props._id, {
  //       children: [...s.children, ...resolution.map((res) => res.data._id)],
  //     });
  //   } catch (e) {
  //     console.log('ERROR in RAPID:', e);
  //   }
  // }

  return (
    <AppWindow app={props}>
      <Box
        height="100%"
        width="100%"
        minHeight="400px"
        minWidth="650px"
        overflow="auto"
      >
        <ComponentSelector props={props as App} />
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app RAPID */
function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const [isOpen, setIsOpen] = useState(false);

  const onClose = () => setIsOpen(false);
  const onOpen = () => setIsOpen(true);

  return (
    <>
      <Box display="flex" gap="2" alignItems="center">
        <Button size="xs" onClick={onOpen}>
          +
        </Button>
        <Button size="xs" padding="1em">
          Edit
        </Button>
        <Select size="xs">
          <option>Metric</option>
          <option>Option 1</option>
          <option>Option 2</option>
          <option>Option 3</option>
        </Select>
        <Select size="xs">
          <option>Time</option>
        </Select>
      </Box>
      <StationEditorModal isOpen={isOpen} onClose={onClose} />
    </>
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
