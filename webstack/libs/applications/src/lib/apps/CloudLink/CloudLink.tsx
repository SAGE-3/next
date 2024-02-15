/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useCallback, useEffect } from 'react';
import {
  Box,
  useColorModeValue,
  Text,
  Heading,
  Tooltip,
  Image,
  Button,
  ButtonGroup,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { MdFileDownload, MdFileUpload, MdWeb, } from 'react-icons/md';

import { ConfirmValueModal, apiUrls, useAppStore, } from '@sage3/frontend';

import { state as AppState } from './index';
import { App, AppGroup } from '../../schema';
import { AppWindow } from '../../components';
import { useParams } from 'react-router';


/* App component for CloudLink */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  // UI Stuff
  const dividerColor = useColorModeValue('gray.300', 'gray.600');
  const backgroundColor = useColorModeValue('gray.100', 'gray.800');
  // Room and board
  const { roomId } = useParams();

  const linearBGColor = useColorModeValue(
    `linear-gradient(178deg, #ffffff, #fbfbfb, #f3f3f3)`,
    `linear-gradient(178deg, #303030, #252525, #262626)`
  );

  const url = s.url;
  const title = 'Google Drive';
  const description = url;
  const imageUrl = "https://storage.googleapis.com/gweb-uniblog-publish-prod/images/Drive_Icon.original.png";

  const aspect = 1200 / 630;
  const imageHeight = 250;
  const imageWidth = imageHeight * aspect;

  useEffect(() => {
    async function getFiles(url: string) {
      return await processCloudURL(url);
    }
    getFiles(s.url).then(async (files) => {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log('File:', file);
        // await downloadFile(file.url, file.name);
        const response = await fetch(apiUrls.assets.uploadByURL, {
          method: 'POST',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: file.url, name: file.name, mimetype: 'image/jpeg', room: roomId }),
        });
        console.log('Res', await response.text());
      }
    });
  }, [s.url]);

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

/**
 * Process a file for conversion: pdf/image processing
 */
async function processCloudURL(url: string): Promise<{ url: string, name: string }[]> {
  console.log('Google drive>', url);
  const folderId = getFolderIdFromLink(url);
  const API_KEY = 'AIzaSyDdX1UNXKuHraYg95BOX6WDt5f7TqayCSY'; // process.env.API_KEY;
  const reqURL = `https://www.googleapis.com/drive/v3/files?q="${folderId}"+in+parents&key=${API_KEY}`;
  const res = await fetch(reqURL);
  const data = await res.json();
  const urls: { url: string, name: string }[] = [];

  if (!data || !data.files || data.files.length === 0) {
    console.log('No files found.');
    return urls;
  }
  const files = data.files;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.kind == 'drive#file' && file.mimeType.startsWith('image/')) {
      urls.push({ name: file.name, url: `https://drive.google.com/uc?id=${file.id}` });
      // urls.push({ name: file.name, url: `https://drive.usercontent.google.com/download?id=${file.id}&export=download` });
    } else {
      console.log(`not file: ${file.name} (${file.kind} ${file.id})`);
    }
  }
  return urls;
}

async function downloadFile(fileURL: string, fileName: string) {
  const res = await fetch(fileURL);
  console.log("🚀 ~ downloadFile ~ res:", fileName, res.status);

  // const destination = path.resolve(os.tmpdir(), fileName);
  // const fileStream = fs.createWriteStream(destination, { flags: 'w+' });
  // if (res.ok && res.body) {
  //   await finished(Readable.fromWeb(res.body).pipe(fileStream));
  // }
}

function getFolderIdFromLink(link: string) {
  const regex = /\/folders\/([^/?]+)/;
  const match = link.match(regex);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

/* App toolbar component for the app CloudLink */
function ToolbarComponent(props: App) {
  const s = props.data.state as AppState;
  // UI elements
  const toast = useToast();
  // Save Confirmation  Modal
  const { isOpen: saveIsOpen, onOpen: saveOnOpen, onClose: saveOnClose } = useDisclosure();
  // Room and board
  const { roomId } = useParams();

  /**
   * Download the stickie as a text file
   * @returns {void}
   */
  const openInSAGE3 = (): void => {
    console.log('openInSAGE3 Assets');
  };

  /**
   * Download the stickie as a text file
   * @returns {void}
   */
  const downloadAssets = (): void => {
    console.log('Download Assets');
  };

  const saveInAssetManager = useCallback((val: string) => {
    // save cell code in asset manager
    if (!val.endsWith('.url')) {
      val += '.url';
    }
    // Generate the content of the file
    const content = `[InternetShortcut]\nURL=${s.url}\n`;
    // Save the code in the asset manager
    if (roomId) {
      // Create a form to upload the file
      const fd = new FormData();
      const codefile = new File([new Blob([content])], val);
      fd.append('files', codefile);
      // Add fields to the upload form
      fd.append('room', roomId);
      // Upload with a POST request
      fetch(apiUrls.assets.upload, { method: 'POST', body: fd })
        .catch((error: Error) => {
          toast({
            title: 'Upload',
            description: 'Upload failed: ' + error.message,
            status: 'warning',
            duration: 4000,
            isClosable: true,
          });
        })
        .finally(() => {
          toast({
            title: 'Upload',
            description: 'Upload complete',
            status: 'info',
            duration: 4000,
            isClosable: true,
          });
        });
    }
  }, [s.url, roomId]);

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="top-start" hasArrow={true} label={'Open All Links'} openDelay={400}>
          <Button onClick={openInSAGE3}>
            <MdWeb />
          </Button>
        </Tooltip>

        <Tooltip placement="top-start" hasArrow={true} label={'Download Assets'} openDelay={400}>
          <Button onClick={downloadAssets} _hover={{ opacity: 0.7 }}>
            <MdFileDownload />
          </Button>
        </Tooltip>

        <Tooltip placement="top-start" hasArrow={true} label={'Save URL in Asset Manager'} openDelay={400}>
          <Button onClick={saveOnOpen} _hover={{ opacity: 0.7 }}>
            <MdFileUpload />
          </Button>
        </Tooltip>
      </ButtonGroup>

      <ConfirmValueModal
        isOpen={saveIsOpen} onClose={saveOnClose} onConfirm={saveInAssetManager}
        title="Save URL in Asset Manager" message="Select a file name:"
        initiaValue={props.data.title.split(' ').slice(0, 2).join('-') + '.url'}
        cancelText="Cancel" confirmText="Save"
        confirmColor="green"
      />

    </>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = (props: { apps: AppGroup }) => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
