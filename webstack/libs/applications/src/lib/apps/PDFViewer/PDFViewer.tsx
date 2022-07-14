/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import { useEffect, useState } from 'react';
import { Button } from '@chakra-ui/react';

import { App } from '../../schema';
import { Asset, ExtraPDFType } from '@sage3/shared/types';

import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { useAssetStore, useAppStore } from '@sage3/frontend';


function AppComponent(props: App): JSX.Element {
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);
  const assets = useAssetStore((state) => state.assets);
  const s = props.data.state as AppState;
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<Asset>();

  useEffect(() => {
    const myasset = assets.find((a) => a._id === s.id);
    if (myasset) {
      setFile(myasset);
      // Update the app title
      update(props._id, { description: 'PDF> ' + myasset?.data.originalfilename });
      // Updte the state of the app
      if (myasset.data.derived) {
        const pages = myasset.data.derived as ExtraPDFType;
        updateState(props._id, { numPages: pages.length });
      }
    }
  }, [s.id, assets]);

  useEffect(() => {
    if (file) {
      const pages = file.data.derived as ExtraPDFType;
      if (pages) {
        const page = pages[s.currentPage];

        // find the smallest image for this page (multi-resolution)
        const res = page.reduce(function (p, v) {
          return (p.width < v.width ? p : v);
        });

        setUrl(res.url);
        if (pages.length > 1) {
          const pageInfo = " - " + (s.currentPage + 1) + " of " + pages.length;
          update(props._id, { description: 'PDF> ' + file.data.originalfilename + pageInfo });
        }
      }
    }
  }, [file, s.currentPage]);

  function handlePrev() {
    if (s.currentPage === 0) return;
    updateState(props._id, { currentPage: s.currentPage - 1 })
  }

  function handleNext() {
    if (s.currentPage === s.numPages - 1) return;
    updateState(props._id, { currentPage: s.currentPage + 1 })
  }

  return (
    <AppWindow app={props}>
      <>
        <img src={url} width="100%" />
        <Button onClick={handlePrev} colorScheme="green">Prev</Button>
        <Button onClick={handleNext} colorScheme="red">Next</Button>
      </>
    </AppWindow>
  );
}
function ToolbarComponent(props: App): JSX.Element {

  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  function handlePrev() {
    if (s.currentPage === 0) return;
    updateState(props._id, { currentPage: s.currentPage - 1 })
  }

  function handleNext() {
    if (s.currentPage === s.numPages - 1) return;
    updateState(props._id, { currentPage: s.currentPage + 1 })
  }
  return (
    <>
      <Button onClick={handlePrev} colorScheme="green">Prev</Button>
      <Button onClick={handleNext} colorScheme="red">Next</Button>
    </>
  )
}

export default { AppComponent, ToolbarComponent };
