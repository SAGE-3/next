/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useAppStore } from '@sage3/frontend';
import { Button } from '@chakra-ui/react';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Styling
import './styling.css';
import { useEffect, useRef } from 'react';

/* App component for PluginApp */

function AppComponent(props: App): JSX.Element {
  const pluginName = (props.data.state as AppState).pluginName;
  const iRef = useRef<HTMLIFrameElement & { S3API: any }>(null);

  useEffect(() => {
    if (iRef.current) {
      const win = iRef.current.contentWindow;
      if (win) {
        win.postMessage({
          id: props._id,
          type: 'init',
          state: props,
        });
      }
    }
  }, [iRef.current]);

  // If a State update happens, update the state
  useEffect(() => {
    if (iRef.current) {
      const win = iRef.current.contentWindow;
      if (win) {
        win.postMessage({
          id: props._id,
          type: 'update',
          state: props,
        });
      }
    }
  }, [JSON.stringify(props)]);

  return (
    <AppWindow app={props}>
      <>
        <iframe ref={iRef} src={`/plugins/apps/${pluginName}`} style={{ width: '100%', height: '100%' }}></iframe>
      </>
    </AppWindow>
  );
}

/* App toolbar component for the app PluginApp */

function ToolbarComponent(props: App): JSX.Element {
  return <></>;
}

export default { AppComponent, ToolbarComponent };
