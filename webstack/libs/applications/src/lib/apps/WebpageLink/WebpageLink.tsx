/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { Box, Button, useColorModeValue, Text, Heading, Tooltip, Image, useToast, Icon } from '@chakra-ui/react';

import { isElectron, useAppStore, processContentURL } from '@sage3/frontend';

import { state as AppState } from './index';
import { App, AppSchema } from '../../schema';
import { AppWindow } from '../../components';
import { MdWeb } from 'react-icons/md';

/* App component for BoardLink */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const url = s.url;

  const title = s.meta.title ? s.meta.title : 'No Title';
  const description = s.meta.description ? s.meta.description : 'No Description';
  const imageUrl = s.meta.image;

  const aspect = 1200 / 630;
  const imageHeight = 250;
  const imageWidth = imageHeight * aspect;

  // UI Stuff
  const dividerColor = useColorModeValue('gray.300', 'gray.600');
  const backgroundColor = useColorModeValue('gray.100', 'gray.800');

  const linearBGColor = useColorModeValue(
    `linear-gradient(178deg, #ffffff, #fbfbfb, #f3f3f3)`,
    `linear-gradient(178deg, #303030, #252525, #262626)`
  );

  return (
    <AppWindow app={props} disableResize={true}>
      <Tooltip label={url} placement="top" openDelay={1000}>
        <Box width="100%" height="100%" display="flex" flexDir="column" justifyContent={'center'} alignItems={'center'}>
          {/* Preview Image */}
          <Box
            width={imageWidth}
            height={imageHeight}
            backgroundSize="contain"
            backgroundColor={backgroundColor}
            display="flex"
            alignItems="center"
            justifyContent="center"
            textAlign={'center'}
            flexDir={'column'}
          >
            {imageUrl ? <Image src={imageUrl} /> : <MdWeb size={256} />}
          </Box>

          {/* Info Sections */}
          <Box
            display="flex"
            flexDir={'column'}
            justifyContent={'space-between'}
            height={400 - imageHeight}
            width="100%"
            p="3"
            pt="1"
            borderTop="solid 4px"
            borderColor={dividerColor}
            background={linearBGColor}
          >
            <Box display="flex" flexDir={'column'} height="150px" overflow={'hidden'} textOverflow="ellipsis">
              <Box>
                <Heading size="lg" textOverflow="ellipsis" overflow="hidden">
                  {title}
                </Heading>
              </Box>
              <Box>
                <Text overflow="hidden" textOverflow={'ellipsis'}>
                  {description}
                </Text>
              </Box>
            </Box>
          </Box>
        </Box>
      </Tooltip>
    </AppWindow>
  );
}

/* App toolbar component for the app BoardLink */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  const toast = useToast();

  const createApp = useAppStore((state) => state.create);

  const openUrl = () => {
    if (!s.url) return;
    if (isElectron()) {
      window.electron.send('open-external-url', { url: s.url });
    } else {
      window.open(s.url, '_blank');
    }
  };

  const copyUrl = () => {
    if (!s.url) return;
    navigator.clipboard.writeText(s.url);
    toast({
      title: 'Copied URL to clipboard',
      status: 'success',
      duration: 3000,
    });
  };

  const openInSAGE3 = async () => {
    // process url to be embeddable
    const final_url = processContentURL(s.url);
    let w = 800;
    let h = 800;
    if (final_url !== s.url) {
      // might be a video
      w = 1280;
      h = 720;
    }
    const newApp = {
      type: 'Webview',
      state: {
        webviewurl: final_url,
        zoom: 1.0,
      },
      title: 'Webview',
      roomId: props.data.roomId,
      boardId: props.data.boardId,
      position: {
        x: props.data.position.x + props.data.size.width + 50,
        y: props.data.position.y,
        z: props.data.position.z,
      },
      size: { width: w, height: h },
      rotation: { x: 0, y: 0, z: 0 },
      raised: false,
      dragging: false,
    } as AppSchema;

    const res = await createApp(newApp);
    if (!res.success) {
      toast({
        title: res.message ? res.message : 'Error creating app',
        description: res.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  return (
    <>
      <Button colorScheme="teal" size="xs" onClick={openInSAGE3} mr="2">
        Open in SAGE3
      </Button>
      <Button colorScheme="teal" size="xs" onClick={openUrl} mr="2">
        Open in Desktop
      </Button>
      <Button colorScheme="teal" size="xs" onClick={copyUrl}>
        Copy
      </Button>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
