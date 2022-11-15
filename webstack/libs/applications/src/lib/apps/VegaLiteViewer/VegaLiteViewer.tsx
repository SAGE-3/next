/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect } from 'react';

// SAGE imports
import { useAppStore } from '@sage3/frontend';
import { App } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState } from './index';

// Vega-Lite Imports
import vegaEmbed from 'vega-embed';
import { Button } from '@chakra-ui/react';

import create from 'zustand';

// Store to communicate with toolbar
export const useStore = create((set: any) => ({
  view: {} as { [key: string]: any },
  setView: (id: string, view: any) => set((state: any) => ({ view: { ...state.view, ...{ [id]: view } } })),
}));

/* App component for VegaLiteViewer */

function AppComponent(props: App): JSX.Element {
  //state
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const setView = useStore((state) => state.setView);

  useEffect(() => {
    // Initilize error in specification to false
    updateState(props._id, { error: false });

    // Check if spec causes an error
    try {
      const VegaLiteSpec = JSON.parse(s.spec);

      // Resize Vega-Lite chart to div
      VegaLiteSpec.width = 'container';
      VegaLiteSpec.height = 'container';

      // Render Vega-Lite
      // Put actions to false to hide the menu, but would be nice to add the controlbar
      vegaEmbed(`#vis${props._id}`, VegaLiteSpec as any, { actions: false }).then((result) => {
        setView(props._id, result.view);
      });
    } catch (e) {
      // If error, set error to true that handles displaying error message
      updateState(props._id, { error: true });
    }
  }, [s.spec, props.data.size.width, props.data.size.height]);

  return (
    <AppWindow app={props}>
      <>
        {s.error ? (
          <h1 style={{ color: 'black', backgroundColor: 'white' }}>Your Vega-Lite Specification is Incorrect</h1>
        ) : (
          <div style={{ width: props.data.size.width, height: props.data.size.height }} id={`vis${props._id}`}></div>
        )}
      </>
    </AppWindow>
  );
}

/* App toolbar component for the app VegaLiteViewer */

function ToolbarComponent(props: App): JSX.Element {
  const view = useStore((state: any) => state.view[props._id]);

  const downloadAction = () => {
    // generate a PNG snapshot and then download the image
    // Scale up the image 2x
    view.toImageURL('png', 2).then(function (url: string) {
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('target', '_blank');
      link.setAttribute('download', 'vega-export.png');
      link.dispatchEvent(new MouseEvent('click'));
    });
  };
  return (
    <>
      <Button onClick={downloadAction} colorScheme="green" size="xs">
        Save as PNG
      </Button>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
