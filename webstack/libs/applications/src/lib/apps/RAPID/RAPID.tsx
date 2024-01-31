/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useAppStore } from '@sage3/frontend';
import { Button } from '@chakra-ui/react';
import { App, AppGroup } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { useEffect } from 'react';
import ComponentSelector from './components/ComponentSelector';

// Styling
import './styling.css';

/* App component for RAPID */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  const updateState = useAppStore((state) => state.updateState);
  const createApp = useAppStore((state) => state.create);

  // Creates rapid apps
  // TODO: Try to create 2 apps, one with graph, and another one with min, max, average
  // TODO: Make toolbar for control panel more comprehensive
  async function createRAPIDApp() {
    const app = await createApp({
      title: 'RAPID',
      roomId: props.data.roomId!,
      boardId: props.data.boardId!,
      position: {
        x: props.data.position.x + props.data.size.width,
        y: props.data.position.y,
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
        initialized: true,
        parent: props._id,
        category: 'Graph'
      },
      raised: true,
      dragging: false,
      pinned: false,
    });

    console.log(app);
    if (app.success) {
      console.log("id of app", app.data._id);
      updateState(props._id, {
        children: [...s.children, app.data._id],
      });
    } else {
      console.log("Failed to create control panel:", app.message);
    }
  }

  useEffect(() => {
    // create charts upon creation of application
    if (!s.initialized) {
      console.log('creating charts');
      // creates charts
      createRAPIDApp();
      updateState(props._id, {
        initialized: true,
      });
    }

    if (s.category === 'Control Panel') {
      
    }
  }, []);

  // console.log("children", s.children);
  return (
    <AppWindow app={props}>
      <ComponentSelector category={s.category} />
    </AppWindow>
  );
}

/* App toolbar component for the app RAPID */
function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  return (
    <div>
      <Button colorScheme="green">Action</Button>
    </div>
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
