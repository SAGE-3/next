/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

//SAGE imports
import { useAppStore } from '@sage3/frontend';
import { App } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState } from './index';

//Chakra Imports
import { Button } from '@chakra-ui/react';

//Vega-Lite Imports
import vegaEmbed from 'vega-embed';

// Styling
import './styling.css';
import { useEffect } from 'react';

/* App component for VegaLiteViewer */

function AppComponent(props: App): JSX.Element {
  //state
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  useEffect(() => {
    //Initilize error in specification to false
    updateState(props._id, { error: false });

    //Check if spec causes an error
    try {
      let VegaLiteSpec = JSON.parse(s.spec);

      //Resize Vega-Lite chart to div
      VegaLiteSpec.width = 'container';
      VegaLiteSpec.height = 'container';

      //Render Vega-Lite
      vegaEmbed(`#vis${props._createdAt}`, VegaLiteSpec as any);
    } catch (e) {
      //If error, set error to true that handles displaying error message
      updateState(props._id, { error: true });
    }
  }, [s.spec, props.data.size.width, props.data.size.height]);

  return (
    <AppWindow app={props}>
      <>
        {s.error ? (
          <h1 style={{ color: 'black', backgroundColor: 'white' }}>Your Vega-Lite Specification is Incorrect</h1>
        ) : (
          <div style={{ width: props.data.size.width, height: props.data.size.height }} id={`vis${props._createdAt}`}></div>
        )}
      </>
    </AppWindow>
  );
}

/* App toolbar component for the app VegaLiteViewer */

function ToolbarComponent(props: App): JSX.Element {
  return (
    <>
      <Button colorScheme="green">None</Button>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
