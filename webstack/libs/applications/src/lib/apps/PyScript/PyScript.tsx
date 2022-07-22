/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useAppStore } from '@sage3/frontend';
import { Button } from '@chakra-ui/react';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';


// Styling
import './styling.css';
import { useEffect, useRef } from 'react';

let loaded = false;

/* App component for PyScript */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  const updateState = useAppStore((state) => state.updateState);

  const fetchStyle = (url: string): Promise<void> => {
    return new Promise((resolve) => {
      const link = document.createElement('link');
      link.type = 'text/css';
      link.rel = 'stylesheet';
      link.onload = function () {
        resolve();
      };
      link.href = url;

      const headScript = document.querySelector('script');
      if (headScript && headScript.parentNode) {
        headScript.parentNode.insertBefore(link, headScript);
      }
    });
  };

  useEffect(() => {
    if (!loaded) {
      const script = document.createElement('script');
      script.src = 'https://pyscript.net/alpha/pyscript.js';
      script.async = true;
      document.body.appendChild(script);
      script.onload = () => {
        loaded = true;
        fetchStyle('https://pyscript.net/alpha/pyscript.css').then(() => {
          console.log('style has loaded');
        });
      };
    }

    const div = document.getElementById(props._id);
    if (div) {
      console.log('div', div);
      const py = document.createElement('py-script');
      py.setAttribute('id', 'pyscript' + props._id);
      py.innerHTML = `def add_task(*ags, **kws):
        print('Now you can!')`;
      div.appendChild(py);
      const pyb = document.createElement('py-button');
      pyb.setAttribute('label', 'OK');
      pyb.innerHTML = `
      def on_click(evt):
        add_task()
      `;
      div.appendChild(pyb);
    }

  }, []);

  return (
    <AppWindow app={props}>
      <>
        <div id={props._id}> </div>
      </>
    </AppWindow>
  );
}

/* App toolbar component for the app PyScript */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  return (
    <>
      <Button colorScheme="green">Action</Button>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
