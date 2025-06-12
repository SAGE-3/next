/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { ButtonGroup, Button, Tooltip } from '@chakra-ui/react';
import { MdRefresh } from 'react-icons/md';
import { renderToStaticMarkup } from 'react-dom/server';

// Markdown
import Markdown from 'markdown-to-jsx';

// SAGE3
import { useAppStore } from '@sage3/frontend';

import { AppWindow } from '../../components';
import { App, AppGroup } from '../../schema';
import { state as AppState } from './index';



/* App component for IFrame */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  const allow = "clipboard-write *; clipboard-read *; geolocation *; microphone *; camera *;";

  return (
    <AppWindow app={props}>
      {s.source ? <iframe loading='eager' src={s.source} width={"100%"} height={"100%"} allow={allow} /> :
        <iframe loading='eager' srcDoc={s.doc} width={"100%"} height={"100%"} allow={allow} />}
    </AppWindow>
  );
}

/* App toolbar component for the app IFrame */
function ToolbarComponent(props: App): JSX.Element {
  const updateState = useAppStore((state) => state.updateState);

  const reloadFrame = () => {
    if (props.data.sourceApps) {
      if (props.data.sourceApps.length === 1) {
        const sourceApp = props.data.sourceApps[0];
        const app = useAppStore.getState().apps.find((app) => app._id === sourceApp);
        if (app && app.data.type === 'CodeEditor') {
          const doc = app.data.state.content;
          if (app.data.state.language === 'html') {
            updateState(props._id, { doc: doc });
          } else if (app.data.state.language === 'markdown') {
            const elt = <Markdown>{doc}</Markdown>;
            const htmlResult = renderToStaticMarkup(elt);
            updateState(props._id, { doc: htmlResult });
          }
        }
      }
    } else {
      // just do a reload of the iframe
      const iframe = document.querySelector('iframe');
      if (iframe) {
        iframe.contentWindow?.location.reload();
      }
    }
  };

  return (<>
    <ButtonGroup isAttached size="xs" colorScheme="teal">
      <Tooltip placement="top-start" hasArrow={true} label={'Reload Page'} openDelay={400}>
        <Button onClick={reloadFrame}>
          <MdRefresh />
        </Button>
      </Tooltip>
    </ButtonGroup>
  </>);
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = (props: { apps: AppGroup }) => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
