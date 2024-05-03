/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect } from 'react';
import { Tldraw, useEditor } from 'tldraw';

import { useAppStore } from '@sage3/frontend';
import { genId } from '@sage3/shared';

import { App, AppGroup } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Styling
import 'tldraw/tldraw.css'

/* App component for TLDraw */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  const editor = useEditor();
  const components = { DebugMenu: null };

  useEffect(() => {
    if (s.persistenceKey === '') {
      updateState(props._id, { persistenceKey: genId() });
    }
  }, []);


  return (
    <AppWindow app={props}>
      <div style={{ position: 'fixed', inset: 0, borderRadius: 8, overflow: "hidden" }}>
        <Tldraw persistenceKey={s.persistenceKey} components={components} />
      </div>
    </AppWindow>
  );
}

/* App toolbar component for the app TLDraw */
function ToolbarComponent(props: App): JSX.Element {
  return <></>;
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = (props: { apps: AppGroup }) => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
