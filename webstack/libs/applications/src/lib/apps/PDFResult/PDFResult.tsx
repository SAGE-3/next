/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useAppStore } from '@sage3/frontend';
import { Text } from '@chakra-ui/react';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';

// Styling
import './styling.css';

/* App component for PDFResult */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  const updateState = useAppStore((state) => state.updateState);

  return (
    <AppWindow app={props}>
      <Text fontFamily="mono" fontSize={"xs"} >
        <pre style={{ overflowX: "clip", overflowY: "scroll", height: props.data.size.height + 'px' }} >
          {s.result}
        </pre>
      </Text>
    </AppWindow >
  );
}

/* App toolbar component for the app PDFResult */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  return (
    <>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
