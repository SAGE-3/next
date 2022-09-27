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

/* App component for DeepZoomImage */

function AppComponent(props: App): JSX.Element {
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);
  const assets = useAssetStore((state) => state.assets);
  const s = props.data.state as AppState;
  // file from the asset manager
  const [file, setFile] = useState<Asset>();
  // Keep handle to the viewer
  const viewer = useRef<OpenSeadragon.Viewer>();
  // me me me
  const { user } = useUser();

  // Chakra Color Mode for grid color
  const bgColor = useColorModeValue('white', 'black');

  useEffect(() => {
    const myasset = assets.find((a) => a._id === s.assetid);
    if (myasset) {
      setFile(myasset);
      // Update the app title
      update(props._id, { description: myasset?.data.originalfilename });
    }
  }, [s.assetid, assets]);

  const zoomHandler = (event: OpenSeadragon.ZoomEvent) => {
    updateState(props._id, { zoomLevel: event.zoom });
    if (viewer.current) {
      // Center moves during the zoom
      const center = viewer.current.viewport.getCenter();
      updateState(props._id, { zoomCenter: [center.x, center.y] });
    }
  };
  const panHandler = (event: OpenSeadragon.PanEvent) => {
    updateState(props._id, { zoomCenter: [event.center.x, event.center.y] });
  }

  // Update from backend
  useEffect(() => {
    if (viewer.current) {
      // disable handlers
      viewer.current.removeAllHandlers('zoom');
      // if it's not my update, then apply
      if (props._updatedBy !== user?._id)
        viewer.current.viewport.zoomTo(s.zoomLevel);
      // put interaction handler back
      viewer.current.addHandler('zoom', zoomHandler);
    }
  }, [s.zoomLevel]);

  // Update from backend
  useEffect(() => {
    if (viewer.current) {
      // disable handlers
      viewer.current.removeAllHandlers('pan');
      // if it's not my update, then apply
      if (props._updatedBy !== user?._id)
        viewer.current.viewport.panTo(new OpenSeadragon.Point(s.zoomCenter[0], s.zoomCenter[1]));
      // put interaction handler back
      viewer.current.addHandler('pan', panHandler);
    }
  }, [s.zoomCenter]);

  useEffect(() => {
    if (file && !viewer.current) {
      // create the image viewer with the right data and path
      viewer.current = OpenSeadragon({
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
        // setup for CORS
        crossOriginPolicy: "Anonymous",
      });

      // Handler when dataset is loaded
      viewer.current.addHandler('open', (e: OpenSeadragon.OpenEvent) => {
        // @ts-expect-error source missing dimensions
        const imginfo = { w: viewer.current.source.width, h: viewer.current.source.height };
        const info = imginfo.w.toLocaleString() + " x " + imginfo.h.toLocaleString() + " pixels";
        // Update the app title
        update(props._id, { description: file.data.originalfilename + ' ' + info });
        // Reset the view
        e.eventSource.viewport.zoomTo(s.zoomLevel);
        e.eventSource.viewport.panTo(new OpenSeadragon.Point(s.zoomCenter[0], s.zoomCenter[1]));
      });

      // Interaction handlers
      viewer.current.addHandler('zoom', zoomHandler);
      viewer.current.addHandler('pan', panHandler);
    }
  }, [file]);

  return (
    <AppWindow app={props}>
      <Box id={'zoom_' + props._id} roundedBottom="md" bg={bgColor} width="100%" height="100%" p={2}>
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app DeepZoomImage */

function ToolbarComponent(props: App): JSX.Element {

  return (
    <>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
