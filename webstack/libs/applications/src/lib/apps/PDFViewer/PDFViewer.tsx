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
import { AssetType } from '@sage3/shared/types';

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
  const [file, setFile] = useState<AssetType>();

  useEffect(() => {
    const myasset = assets.find((a) => a.file === s.filename);
    if (myasset) {
      setFile(myasset);
      // Update the app
      update(props.id, { description: 'PDF ' + myasset?.originalfilename });
      // Updte the state of the app
      if (myasset.derived) {
        // @ts-ignore
        const pages = myasset.derived as any[];
        updateState(props.id, { numPages: pages.length });
      }
    }
  }, [s.filename, assets]);

  useEffect(() => {
    if (file) {
      // @ts-ignore
      const pages = file.derived as any[];
      if (pages) {
        const page = pages[s.currentPage];
        const k = Object.keys(page)[0];
        setUrl(page[k].url);
        if (pages.length > 1) {
          const pageInfo = " - " + (s.currentPage + 1) + " of " + pages.length;
          update(props.id, { description: 'PDF ' + file.originalfilename + pageInfo });
        }
      }
    }
  }, [file, s.currentPage]);

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
      </>
    </AppWindow>
  );
}

export default PDFViewer;
