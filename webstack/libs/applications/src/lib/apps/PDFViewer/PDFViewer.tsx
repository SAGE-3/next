/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import { useEffect, useState } from 'react';
import { Button } from '@chakra-ui/react';

import { useAppStore } from '@sage3/frontend';
import { AppSchema } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { useAssetStore } from '@sage3/frontend';

// Styling
import './styling.css';

function PDFViewer(props: AppSchema): JSX.Element {
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);
  const assets = useAssetStore((state) => state.assets);
  const s = props.state as AppState;
  const [url, setUrl] = useState('');
  const [originalfilename, setOriginalFilename] = useState('');

  useEffect(() => {
    console.log('PDFViewer>', s);
    console.log('assets>', assets);
    const myasset = assets.find((a) => a.file === s.filename);
    console.log('assets>', myasset);
    if (myasset) {
      setOriginalFilename(myasset.originalfilename);

      // @ts-ignore
      const pages = myasset.derived as any[];
      if (pages) {
        const page1 = pages[0];
        const k = Object.keys(page1)[0];
        setUrl(page1[k].url);

        // Update the app
        update(props.id, { description: 'PDF ' + myasset?.originalfilename });
        // Updte the state of the app
        updateState(props.id, { numPages: pages.length, currentPage: 0 });
      }
    }
  }, [s.filename, assets]);

  function handlePrev() {
    if (s.currentPage === 0) return;
    updateState(props.id, { currentPage: s.currentPage - 1 })
  }

  function handleNext() {
    if (s.currentPage === s.numPages - 1) return;
    updateState(props.id, { currentPage: s.currentPage + 1 })
  }

  return (
    <AppWindow app={props}>
      <>
        <img src={url} />
        <Button onClick={handlePrev} colorScheme="green">Prev</Button>
        <Button onClick={handleNext} colorScheme="red">Next</Button>
        <h1> page : {s.currentPage + 1}</h1>
      </>
    </AppWindow>
  );
}

export default PDFViewer;

/*
            const pages = d.derived as any[];
            const page1 = pages[0];
            const k = Object.keys(page1)[0];
            url = page1[k].url;

            createApp(
              'PDFViewer',
              'PDF Description',
              roomId,
              boardId,
              { x: 0, y: 0, z: 0 },
              { width: page1[k].width, height: page1[k].height, depth: 0 },
              { x: x, y: 0, z: 0 },
              'PDFViewer',
              // state
              {
                url: d.id,
              }
*/
