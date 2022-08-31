/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState, useRef } from 'react';
import { Box, useColorModeValue } from '@chakra-ui/react';

import { App } from '../../schema';
import { Asset } from '@sage3/shared/types';

import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { useAssetStore, useAppStore, useUser } from '@sage3/frontend';

import OpenSeadragon from "openseadragon";

/* App component for Zoom */

function AppComponent(props: App): JSX.Element {
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);
  const assets = useAssetStore((state) => state.assets);
  const s = props.data.state as AppState;
  const [file, setFile] = useState<Asset>();
  const [viewer, setViewer] = useState<OpenSeadragon.Viewer>();
  // const [driving, setDriving] = useState<boolean>(false);
  // const [zoomLevel, setZoomLevel] = useState<number>(s.zoomLevel);

  const { user } = useUser();

  // Div around the pages to capture events
  const divRef = useRef<HTMLDivElement>(null);

  // Chakra Color Mode for grid color
  const bgColor = useColorModeValue('white', 'black');

  useEffect(() => {
    const myasset = assets.find((a) => a._id === s.zid);
    if (myasset) {
      setFile(myasset);
      // Update the app title
      update(props._id, { description: 'Zoom> ' + myasset?.data.originalfilename });
    }
  }, [s.zid, assets]);

  const zoomHandler = (event: OpenSeadragon.ZoomEvent) => {
    updateState(props._id, { zoomLevel: event.zoom });
  };
  const panHandler = (event: OpenSeadragon.PanEvent) => {
    updateState(props._id, { zoomCenter: [event.center.x, event.center.y] });
  }

  // update from backend
  useEffect(() => {
    if (viewer) {
      viewer.removeAllHandlers('zoom');
      if (props._updatedBy !== user?._id)
        viewer.viewport.zoomTo(s.zoomLevel);
      viewer.addHandler('zoom', zoomHandler);
    }
  }, [s.zoomLevel]);

  useEffect(() => {
    if (viewer) {
      viewer.removeAllHandlers('pan');
      if (props._updatedBy !== user?._id)
        viewer.viewport.panTo(new OpenSeadragon.Point(s.zoomCenter[0], s.zoomCenter[1]), true);
      viewer.addHandler('pan', panHandler);
    }
  }, [s.zoomCenter]);

  useEffect(() => {
    if (file) {
      // create the image viewer with the right data and path
      const viewer = OpenSeadragon({
        // suppporting div
        id: 'zoom_' + props._id,
        // icons for the library
        prefixUrl: '/images/',
        // show the little overview window (auto-hides)
        showNavigator: true,
        // remove the navigation button bar
        showNavigationControl: false,
        // minimum dimension of the viewport, here allows half size
        minZoomImageRatio: 0.5,
        // maximum ratio to allow a zoom-in
        maxZoomPixelRatio: 10,
        // animation in sec.
        animationTime: 1.0,
        // At least half in the window
        visibilityRatio: 0.5,
        // change tileSources for your dataset
        tileSources: '/api/assets/static/' + file.data.file,
      });
      // Save the viewer to state
      setViewer(viewer);

      // Handler when dataset is loaded
      viewer.addHandler('open', () => {
        // @ts-expect-error source missing dimensions
        const imginfo = { w: viewer.source.width, h: viewer.source.height };
        const info = imginfo.w.toLocaleString() + " x " + imginfo.h.toLocaleString() + " pixels";
        // Update the app title
        update(props._id, { description: 'Zoom> ' + file.data.originalfilename + ' ' + info });
      });

      viewer.addHandler('zoom', zoomHandler);
      viewer.addHandler('pan', panHandler);
    }
  }, [file]);

  return (
    <AppWindow app={props}>
      <Box id={'zoom_' + props._id} roundedBottom="md" bg={bgColor} width="100%" height="100%" p={2} ref={divRef}>
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app Zoom */

function ToolbarComponent(props: App): JSX.Element {

  return (
    <>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
