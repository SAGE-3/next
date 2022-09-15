/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import { useEffect, useState } from 'react';
import { Image, Button, ButtonGroup, Tooltip } from '@chakra-ui/react';
// Icons
import { MdFileDownload } from 'react-icons/md';
// Utility functions from SAGE3
import { downloadFile, isUUIDv4 } from '@sage3/frontend';

import { AppWindow } from '../../components';

import { App } from '../../schema';
import { Asset, ExtraImageType, ImageInfoType } from '@sage3/shared/types';
import { useAssetStore, useAppStore, useUIStore, useMeasure } from '@sage3/frontend';

import { state as AppState } from './index';

/**
 * ImageViewer app
 *
 * @param {App} props
 * @returns {JSX.Element}
 */
function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  const assets = useAssetStore((state) => state.assets);
  const update = useAppStore((state) => state.update);
  // Asset data structure
  const [file, setFile] = useState<Asset>();
  // URL used in the image tag
  const [url, setUrl] = useState('');
  // Image aspect ratio
  const [aspectRatio, setAspectRatio] = useState(1);
  // Array of URLs for the image with multiple resolutions
  const [sizes, setSizes] = useState<ImageInfoType[]>([]);
  // Scale of the board
  const scale = useUIStore((state) => state.scale);
  // Track the size of the image tag on the screen
  const [ref, displaySize] = useMeasure<HTMLDivElement>();

  // Convert the ID to an asset
  useEffect(() => {
    const isUUID = isUUIDv4(s.assetid);
    if (isUUID) {
      const myasset = assets.find((a) => a._id === s.assetid);
      if (myasset) {
        setFile(myasset);
        // Update the app title
        update(props._id, { description: myasset?.data.originalfilename });
      }
    } else {
      // Assume it is a URL
      setUrl(s.assetid);
    }
  }, [s.assetid, assets]);

  // Once we have the asset, get the image data
  useEffect(() => {
    if (file) {
      const extra = file.data.derived as ExtraImageType;
      // Store the extra data in the state
      setSizes(extra.sizes);
      // Save the aspect ratio
      setAspectRatio(extra.aspectRatio);
      if (extra) {
        // find the smallest image for this page (multi-resolution)
        const res = extra.sizes.reduce(function (p, v) {
          return p.width < v.width ? p : v;
        });
        setUrl(res.url);
      }
    }
  }, [file]);

  // Track the size size and pick the 'best' URL
  useEffect(() => {
    const isUUID = isUUIDv4(s.assetid);
    if (isUUID) {
      // Match the window size, dpi, and scale of the board to a URL
      const res = getImageUrl(url, sizes, displaySize.width * window.devicePixelRatio * scale);
      setUrl(res);
    }
  }, [url, sizes, displaySize, scale]);

  return (
    <AppWindow app={props} lockAspectRatio={aspectRatio}>
      <div ref={ref} style={{
        position: 'relative', overflowY: 'hidden',
        height: displaySize.width / aspectRatio,
        maxHeight: '100%'
      }}>
        <Image width="100%" userSelect={"auto"} draggable={false}
          alt={file?.data.originalfilename} src={url} borderRadius="0 0 6px 6px" />
      </div>
    </AppWindow>
  );
}


/**
 * UI for the image viewer app
 *
 * @param {App} props
 * @returns {JSX.Element}
 */
function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const assets = useAssetStore((state) => state.assets);
  const [file, setFile] = useState<Asset>();

  // Convert the ID to an asset
  useEffect(() => {
    const myasset = assets.find((a) => a._id === s.assetid);
    if (myasset) {
      setFile(myasset);
    }
  }, [s.assetid, assets]);

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top-start" hasArrow={true} label={'Download Image'} openDelay={400}>
          <Button
            onClick={() => {
              if (file) {
                const url = file?.data.file;
                const filename = file?.data.originalfilename;
                downloadFile('api/assets/static/' + url, filename);
              }
            }}
          >
            <MdFileDownload />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </>
  );
}

/**
 * Give an width, find the best URL for the image
 *
 * @param {string} src
 * @param {ImageInfoType[]} sizes
 * @param {number} width
 * @returns {string}
 */
function getImageUrl(src: string, sizes: ImageInfoType[], width: number): string {
  if (sizes.length > 0) {
    // Find closest value to width
    const s = sizes.reduce((a, b) => {
      return Math.abs(b.width - width) < Math.abs(a.width - width) ? b : a;
    });
    // If found a match, returns the size
    if (s) {
      return s.url;
    }
  }
  // else, default url
  return src;
}

export default { AppComponent, ToolbarComponent };
