/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { Image, Button, ButtonGroup, Tooltip, Box, useColorModeValue } from '@chakra-ui/react';
// Icons
import { MdBrokenImage, MdFileDownload, MdImage } from 'react-icons/md';
import { HiPencilAlt } from 'react-icons/hi';

// Utility functions from SAGE3
import { useThrottleScale, useAssetStore, useAppStore, useMeasure, downloadFile, downloadViaProxy, isUUIDv4, apiUrls, useUIStore } from '@sage3/frontend';
import { Asset, ExtraImageType, ImageInfoType } from '@sage3/shared/types';

import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';

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
  const [aspectRatio, setAspectRatio] = useState<number | boolean>(1);
  // Array of URLs for the image with multiple resolutions
  const [sizes, setSizes] = useState<ImageInfoType[]>([]);
  // Scale of the board
  const scale = useThrottleScale(250);
  // Track the size of the image tag on the screen
  const [ref, displaySize] = useMeasure<HTMLDivElement>();
  // Original image sizes
  const [origSizes, setOrigSizes] = useState({ width: 0, height: 0 });
  const boardDragging = useUIStore((state) => state.boardDragging);
  const backgroundColor = useColorModeValue('white', 'gray.700');

  // Convert the ID to an asset
  useEffect(() => {
    const isUUID = isUUIDv4(s.assetid);
    if (isUUID) {
      const myasset = assets.find((a) => a._id === s.assetid);
      if (myasset) {
        setFile(myasset);
        // Update the app title
        update(props._id, { title: myasset?.data.originalfilename });
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
        // TODO Extract image size
        const localOrigSizes = { width: extra.width, height: extra.height };
        setOrigSizes(localOrigSizes);

        if (extra) {
          if (extra.sizes.length === 0) {
            // No multi-resolution images, use the original
            setUrl(apiUrls.assets.getAssetById(file.data.file));
          } else {
            // find the smallest image for this page (multi-resolution)
            const res = extra.sizes.reduce(function (p, v) {
              return p.width < v.width ? p : v;
            });
            setUrl(res.url);
          }
        }
      }
    }
  }, [file]);

  // Track the size size and pick the 'best' URL
  useEffect(() => {
    const isUUID = isUUIDv4(s.assetid);
    if (isUUID) {
      // Match the window size, dpi, and scale of the board to a URL
      let res;
      if (boardDragging) {
        // Use the smallest image for dragging
        res = getImageUrl(url, sizes, 1);
      } else {
        res = getImageUrl(url, sizes, displaySize.width * window.devicePixelRatio * scale);
      }
      if (res) setUrl(res);
    }
  }, [url, sizes, displaySize, scale, boardDragging]);

  return (
    // background false to handle alpha channel
    <AppWindow app={props} lockAspectRatio={aspectRatio} background={url == '' ? true : false} hideBackgroundIcon={MdImage}>
      {/* <div
        ref={ref}
        style={{
          position: 'relative',
          overflowY: 'hidden',
          height: aspectRatio ? displaySize.width / (aspectRatio as number) : 'auto',
          maxHeight: '100%',
        }} */}
      <Box
        ref={ref}
        position="relative"
        overflowY="hidden"
        // height={aspectRatio ? displaySize.width / (aspectRatio as number) : 'auto'}
        height="100%"
        maxHeight="100%"
        background={backgroundColor}
        objectFit="contain"
      >
        {url ? (
          <>
            <Image
              width="100%"
              height="100%"
              objectFit="contain"
              userSelect={'auto'}
              draggable={false}
              alt={file?.data.originalfilename}
              src={url}
              borderRadius="0 0 6px 6px"
            />

            {s.boxes && Array.isArray(s.boxes)
              ? s.boxes.map((box, idx) => {
                // TODO Need to handle text overflow for labels
                return (
                  <Box
                    key={'label' + idx}
                    position="absolute"
                    left={box.xmin * (displaySize.width / origSizes.width) + 'px'}
                    top={box.ymin * (displaySize.height / origSizes.height) + 'px'}
                    width={(box.xmax - box.xmin) * (displaySize.width / origSizes.width) + 'px'}
                    height={(box.ymax - box.ymin) * (displaySize.height / origSizes.height) + 'px'}
                    border="2px solid red"
                    style={{ display: s.annotations === true ? 'block' : 'none' }}
                  >
                    <Box position="relative" top={'-1.5rem'} fontWeight={'bold'} textColor={'black'}>
                      {box.label || 'Unknown'}
                    </Box>
                  </Box>
                );
              })
              : null}
          </>
        ) : (
          <Box display="flex" width="100%" height="100%" justifyContent="center" alignItems="center" flexDir="column" gap="0">
            <MdBrokenImage size="100%" />
          </Box>
        )}
      </Box>
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
        <Tooltip placement="top" hasArrow={true} label={'Download Image'} openDelay={400}>
          <Button
            onClick={() => {
              if (file) {
                const url = file?.data.file;
                const filename = file?.data.originalfilename;
                const dl = apiUrls.assets.getAssetById(url);
                downloadFile(dl, filename);
              } else {
                const url = s.assetid;
                const filename = getFilenameFromUrl(url) || "image.jpg";
                downloadViaProxy(url, filename);
              }
            }}
            size='xs'
            px={0}
          >
            <MdFileDownload size="16px" />
          </Button>
        </Tooltip>
        <div style={{ display: s.boxes ? (Object.keys(s.boxes).length !== 0 ? 'flex' : 'none') : 'none' }}>
          <Tooltip placement="top" hasArrow={true} label={'Annotations'} openDelay={400}>
            <Button
              ml={1}
              onClick={() => {
                updateState(props._id, { annotations: !s.annotations });
              }}
              size='xs'
              px={0}
            >
              <HiPencilAlt size="16px" />
            </Button>
          </Tooltip>
        </div>
      </ButtonGroup>
    </>
  );
}

/**
 * Retrieve the filename from a URL
 *
 * Works with absolute URLs (https://...)
 * Handles query strings (?x=y) and fragments (#id)
 * Gracefully falls back if the URL is invalid
 *
 * @param url string
 * @returns string
 */
function getFilenameFromUrl(url: string): string {
  try {
    const { pathname } = new URL(url);
    return pathname.substring(pathname.lastIndexOf('/') + 1);
  } catch {
    // fallback for malformed URLs
    return url.split('/').pop()?.split('?')[0].split('#')[0] || '';
  }
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

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = () => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };

/*
type YoloObject = {
  class: number;
  confidence: number;
  name: string;
  xmax: number;
  xmin: number;
  ymax: number;
  ymin: number;
};


      <ButtonGroup isAttached size="xs" colorScheme="orange" ml={1} isDisabled={onlineModels.length == 0}>
        <Menu placement="top">
          <Tooltip hasArrow={true} label={'Ai Model Selection'} openDelay={300}>
            <MenuButton as={Button} colorScheme="orange" width="100px" aria-label="layout">
              {selectedModel}
            </MenuButton>
          </Tooltip>
          <MenuList minWidth="150px" fontSize={'sm'}>
            {onlineModels.map((model) => (
              <MenuItem key={model} onClick={() => handleModelChange(model)}>
                {model}
              </MenuItem>
            ))}
          </MenuList>
        </Menu>
      </ButtonGroup>

      <ButtonGroup isAttached size="xs" colorScheme="orange" ml={1}>
        <Menu placement="top">
          <Tooltip hasArrow={true} label={'Remote Actions'} openDelay={300}>
            <MenuButton as={Button} colorScheme="orange" aria-label="layout">
              <MdOutlineLightbulb />
            </MenuButton>
          </Tooltip>
          <MenuList minWidth="150px" fontSize={'sm'}>
            <Tooltip hasArrow={true} label={'Generate labels and store them as tags'} openDelay={300}>
              <MenuItem onClick={generateLabels}>Generate labels</MenuItem>
            </Tooltip>
            <Tooltip hasArrow={true} label={'Create a new image with labels'} openDelay={300}>
              <MenuItem onClick={generateImage}>Show image with labels</MenuItem>
            </Tooltip>
          </MenuList>
        </Menu>
      </ButtonGroup>

function wordCount(words: string[]): string[] {
  // Create an empty object to store word counts
  const wordCounts: Record<string, number> = {};
  // Loop through each word in the list
  words.forEach(function (word: string) {
    // If the word is already in the wordCounts object, increment its count
    if (wordCounts[word]) {
      wordCounts[word]++;
    } else {
      // Otherwise, add the word to the wordCounts object with a count of 1
      wordCounts[word] = 1;
    }
  });

  // Convert the wordCounts object to an array of strings with count values separated by a colon
  const result = Object.keys(wordCounts).map(function (word: string) {
    return wordCounts[word] > 1 ? word + ':' + wordCounts[word] : word;
  });

  return result;
}

async function generateImage() {
  if (!file) return;
  const queryRequest = {
    assetid: s.assetid,
    model: selectedModel,
    filename: file.data.originalfilename,
    roomid: roomId,
  } as AiImageQueryRequest;
  const result = await AiAPI.image.image(queryRequest);
  if (result.success && result.data) {
    // Open the generated image in a new app
    if (result.success && result.data) {
      createApp({
        title: 'YoloV8',
        roomId: roomId!,
        boardId: boardId!,
        position: { x: props.data.position.x + props.data.size.width + 20, y: props.data.position.y, z: 0 },
        size: props.data.size,
        rotation: { x: 0, y: 0, z: 0 },
        type: 'ImageViewer',
        state: { ...(initialValues['ImageViewer'] as AppState), assetid: result.data.id },
        raised: true,
        pinned: false,
        dragging: false,
      });
      // Show success
      toast.closeAll();
      toast({
        title: (
          <Box fontSize="sm" fontWeight="bold">
            AI Model: {selectedModel}
          </Box>
        ),
        duration: 10000,
        isClosable: true,
        position: 'bottom-right',
        icon: <MdOutlineLightbulb size="24px" />,
        status: 'warning',
        description: <Box fontSize="sm">Image Generated</Box>,
      });
    }
  }
}

// Generate labels
async function generateLabels() {
  if (!file) return;
  const queryRequest = {
    assetid: s.assetid,
    model: selectedModel,
  } as AiImageQueryRequest;

  const result = await AiAPI.image.labels(queryRequest);
  if (result.success && result.data) {
    // Get the labels from the model
    const data = result.data.detect_objects as YoloObject[];
    const temps: string[] = [];
    const boxes: { label: string; xmin: number; ymin: number; xmax: number; ymax: number }[] = [];

    if (data.length === 0) {
      // Show result
      toast.closeAll();
      toast({
        title: (
          <Box fontSize="sm" fontWeight="bold">
            AI Model: {selectedModel}
          </Box>
        ),
        duration: 10000,
        isClosable: true,
        position: 'bottom-right',
        icon: <MdOutlineLightbulb size="24px" />,
        status: 'warning',
        description: <Box fontSize="sm">No labels generated</Box>,
      });
      return;
    }

    for (let idx = 0; idx < data.length; idx++) {
      const label = data[idx];
      // array of labels
      temps.push(label.name);
      // array of boxes
      boxes.push({ label: label.name, xmin: label.xmin, ymin: label.ymin, xmax: label.xmax, ymax: label.ymax });
    }
    // If we have labels, update the insight
    if (temps.length > 0) {
      // Saves the boxes in app state
      updateState(props._id, { boxes });
      // Get the existing labels
      const myinsight = insights.find((a) => a.data.app_id === props._id);
      if (myinsight) {
        // Combine the new labels
        const mylabels = myinsight.data.labels;
        temps.push(...mylabels);
      }
      // Count the labels
      const counted = wordCount(temps);
      // Update the insight collection
      updateInsights(props._id, { labels: counted });
      // Show success
      toast.closeAll();
      toast({
        title: (
          <Box fontSize="sm" fontWeight="bold">
            AI Model: {selectedModel}
          </Box>
        ),
        duration: 10000,
        isClosable: true,
        position: 'bottom-right',
        icon: <MdOutlineLightbulb size="24px" />,
        status: 'warning',
        description: <Box fontSize="sm">Labels generated: {counted.join(', ')}</Box>,
      });
    }
  }
}
  */
