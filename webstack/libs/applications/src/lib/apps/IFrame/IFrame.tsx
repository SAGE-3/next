/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// import { useAppStore } from '@sage3/frontend';
import { App, AppGroup } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';


/* App component for IFrame */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  // const updateState = useAppStore((state) => state.updateState);

  return (
    <AppWindow app={props}>
      {/* credentialless */}
      {s.source ? <iframe loading='eager' src={s.source} width={"100%"} height={"100%"} /> :
        <iframe loading='eager' srcDoc={s.doc} width={"100%"} height={"100%"} />}
    </AppWindow>
  );
}

/* App toolbar component for the app IFrame */
function ToolbarComponent(props: App): JSX.Element {
  // const s = props.data.state as AppState;
  // const updateState = useAppStore((state) => state.updateState);

  return (<></>);
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = (props: { apps: AppGroup }) => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
