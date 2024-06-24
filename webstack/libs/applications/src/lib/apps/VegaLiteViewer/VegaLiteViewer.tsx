/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';

// SAGE imports
import { useAppStore } from '@sage3/frontend';
import { App } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState } from './index';

// Vega-Lite Imports
import vegaEmbed from 'vega-embed';
import { Button, Input } from '@chakra-ui/react';

import { create } from 'zustand';

interface VegaStore {
  view: { [key: string]: any };
  setView: (id: string, view: any) => void;
}

// Store to communicate with toolbar
const useStore = create<VegaStore>()((set) => ({
  view: {},
  setView: (id: string, view: any) => set((state) => ({ view: { ...state.view, ...{ [id]: view } } })),
}));

/* App component for VegaLiteViewer */

function AppComponent(props: App): JSX.Element {
  //state
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const setView = useStore((state) => state.setView);
  const [spec, setSpec] = useState<string>('{}');

  useEffect(() => {
    // Initilize error in specification to false
    updateState(props._id, { error: false });

    // Check if spec causes an error
    try {
      const VegaLiteSpec = JSON.parse(spec);

      // Resize Vega-Lite chart to div
      VegaLiteSpec.width = 'container';
      VegaLiteSpec.height = 'container';
      VegaLiteSpec.title = '';
      // Render Vega-Lite
      // Put actions to false to hide the menu, but would be nice to add the controlbar
      vegaEmbed(`#vis${props._id}`, VegaLiteSpec as any, { actions: false }).then((result) => {
        setView(props._id, result.view);
      });
    } catch (e) {
      console.log('Error in 2');

      // If error, set error to true that handles displaying error message
      updateState(props._id, { error: true });
    }
  }, [s.spec, spec, props.data.size.width, props.data.size.height]);

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
  const view = useStore((state) => state.view[props._id]);
  const [prompt, setPrompt] = useState<string>('');
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
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPrompt(event.target.value);
  };
  const handleSubmit = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      console.log(prompt);
    }
  };
  return (
    <>
      <Button onClick={downloadAction} colorScheme="green" size="xs">
        Save as PNG
      </Button>
      <Input onKeyDown={handleSubmit} onChange={handleChange} />
    </>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = () => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
