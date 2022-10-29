/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import { useEffect, useState } from 'react';
import { Image, Button, ButtonGroup, Tooltip, Box } from '@chakra-ui/react';
// Icons
import { MdFileDownload } from 'react-icons/md';
import { HiPencilAlt } from 'react-icons/hi';
// Utility functions from SAGE3
import { downloadFile, isUUIDv4 } from '@sage3/frontend';

import { AppWindow } from '../../components';

import { App } from '../../schema';
import { Asset, ExtraImageType, ImageInfoType } from '@sage3/shared/types';
import { useAssetStore, useAppStore, useUIStore, useMeasure } from '@sage3/frontend';
import { state as AppState } from './index';
import { dimensions } from './data_types';

/**
 * ImageViewer app
 *
 * @param {App} props
 * @returns {JSX.Element}
 */
function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  // console.log(s.boxes);
  const assets = useAssetStore((state) => state.assets);
  const update = useAppStore((state) => state.update);
  const updateState = useAppStore((state) => state.updateState);

  // Asset data structure
  const [file, setFile] = useState<Asset>();
  // URL used in the image tag
  const [url, setUrl] = useState('');
  // Image aspect ratio
  const [aspectRatio, setAspectRatio] = useState<number | boolean>(1);
  // Array of URLs for the image with multiple resolutions
  const [sizes, setSizes] = useState<ImageInfoType[]>([]);
  // Scale of the board
  const scale = useUIStore((state) => state.scale);
  // Track the size of the image tag on the screen
  const [ref, displaySize] = useMeasure<HTMLDivElement>();

  // s.boxes = {
  //   'dog': {xmin: 109, ymin: 186, xmax: 260, ymax: 454},
  //   'bicycle': {xmin: 104, ymin: 107, xmax: 477, ymax: 356},
  //   'truck': {xmin: 398, ymin: 62, xmax: 574, ymax: 140},
  // }

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
      setAspectRatio(false);
    }
  }, [s.assetid, assets]);

  // Once we have the asset, get the image data
  useEffect(() => {
    if (file) {
      const extra = file.data.derived as ExtraImageType;
      if (extra) {
        // Store the extra data in the state
        setSizes(extra.sizes);
        // Save the aspect ratio
        setAspectRatio(extra.aspectRatio);
        //TODO Extract image size

        if (extra) {
          // find the smallest image for this page (multi-resolution)
          const res = extra.sizes.reduce(function (p, v) {
            return p.width < v.width ? p : v;
          });
          setUrl(res.url);
        }
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
      <div
        ref={ref}
        style={{
          position: 'relative',
          overflowY: 'hidden',
          height: aspectRatio ? displaySize.width / (aspectRatio as number) : 'auto',
          maxHeight: '100%',
        }}
      >
        <>
          <Image
            width="100%"
            userSelect={'auto'}
            draggable={false}
            alt={file?.data.originalfilename}
            src={url}
            borderRadius="0 0 6px 6px"
          />

          {
            Object.keys(s.boxes).map((label, idx) => {
              return (
                <Box
                  key={label + idx}
                  position="absolute"
                  left={s.boxes[label].xmin * (displaySize.width / 649) + 'px'}
                  top={s.boxes[label].ymin * (displaySize.height / 486) + 'px'}
                  width={(s.boxes[label].xmax - s.boxes[label].xmin) * (displaySize.width / 649) + 'px'}
                  height={(s.boxes[label].ymax - s.boxes[label].ymin) * (displaySize.height / 486) + 'px'}
                  border="2px solid red"
                  style={{ display: s.annotations === true ? 'block' : 'none' }}
                >
                  {label}
                </Box>
              );
            })
          }
        </>
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
  // console.log(s.boxes);
  const updateState = useAppStore((state) => state.updateState);
  const assets = useAssetStore((state) => state.assets);
  const [file, setFile] = useState<Asset>();

  // Convert the ID to an asset
  useEffect(() => {
    const isUUID = isUUIDv4(s.assetid);
    if (isUUID) {
      const appasset = assets.find((a) => a._id === s.assetid);
      setFile(appasset);
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
              } else {
                const url = s.assetid;
                const filename = s.assetid.split('/').pop();
                const appasset = assets.find((a) => a.data.file === filename);
                downloadFile(url, appasset?.data.originalfilename);
              }
            }}
          >
            <MdFileDownload />
          </Button>
        </Tooltip>
       <div style={{display: Object.keys(s.boxes).length !== 0 ? "block" : "none"}}>
          <Tooltip placement="top-start" hasArrow={true} label={'Annotations'} openDelay={400}>
          <Button
            onClick={() => {
              updateState(props._id, { annotations: !s.annotations });
            }}
          >
            <HiPencilAlt />
          </Button>
        </Tooltip>
       </div>

        {/*<Tooltip placement="top-start" hasArrow={true} label={'RUN'} openDelay={400}>*/}
        {/*  <Button*/}
        {/*    onClick={() => {*/}

        {/*      updateState(props._id,*/}
        {/*        {*/}
        {/*          executeInfo: {*/}
        {/*            "executeFunc": "set_bboxes", "params": {*/}
        {/*              // "bboxes": {*/}
        {/*              //   'dog': {xmin: 109, ymin: 186, xmax: 260, ymax: 454},*/}
        {/*              //   'bicycle': {xmin: 104, ymin: 107, xmax: 477, ymax: 356},*/}
        {/*              //   'truck': {xmin: 398, ymin: 62, xmax: 574, ymax: 140},*/}
        {/*              // }*/}
        {/*            }*/}
        {/*          }*/}
        {/*        })*/}
        {/*    }}*/}
        {/*  >*/}
        {/*    <HiPencilAlt/>*/}
        {/*  </Button>*/}
        {/*</Tooltip>*/}
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
