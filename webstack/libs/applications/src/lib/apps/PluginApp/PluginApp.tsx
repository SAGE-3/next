/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { useEffect, useRef } from 'react';

import { useUser } from '@sage3/frontend';

import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Styling
import './styling.css';
import { HiPuzzle } from 'react-icons/hi';

declare module 'react' {
  interface IframeHTMLAttributes<T> extends React.HTMLAttributes<T> {
    credentialless?: string;
  }
}

// React., HTMLIFrameElement>

/* App component for PluginApp */
function AppComponent(props: App): JSX.Element {
  const pluginName = (props.data.state as AppState).pluginName;
  const iRef = useRef<HTMLIFrameElement>(null);
  const { user } = useUser();

  useEffect(() => {
    if (iRef.current) {
      const win = iRef.current.contentWindow;
      if (win) {
        // Wait for the iframe to load until you send the init message
        // This is a hacky way to do it, need a better solution
        setTimeout(() => {
          win.postMessage({
            type: 'init',
            state: props,
            user: user?.data.name || '',
          });
        }, 1000);
      }
    }
  }, [iRef.current]);

  // If a State update happens, update the state
  useEffect(() => {
    if (iRef.current) {
      const win = iRef.current.contentWindow;
      if (win) {
        win.postMessage({
          type: 'update',
          state: props,
        });
      }
    }
  }, [JSON.stringify(props)]);

  const allow = 'clipboard-write *; clipboard-read *; geolocation *; microphone *; camera *;';

  return (
    <AppWindow app={props} hideBackgroundIcon={HiPuzzle}>
      <>
        <iframe
          allow={allow}
          ref={iRef}
          loading="eager"
          src={`/plugins/apps/${pluginName}`}
          style={{ width: '100%', height: '100%' }}
        ></iframe>
      </>
    </AppWindow>
  );
}

/* App toolbar component for the app PluginApp */
function ToolbarComponent() {
  return null;
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = () => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
