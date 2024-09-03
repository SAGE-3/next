/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { useColorModeValue, Box, Text, VStack, Input, InputGroup, InputLeftElement, Button, Grid, HStack, Link } from '@chakra-ui/react';
import { Editor } from '@monaco-editor/react';

import { FaPython } from 'react-icons/fa';
import { LuFileJson, LuFileCode } from 'react-icons/lu';
import {
  MdJavascript,
  MdOndemandVideo,
  MdOutlineFilePresent,
  MdOutlineImage,
  MdOutlineLink,
  MdOutlineMap,
  MdOutlinePictureAsPdf,
  MdSearch,
} from 'react-icons/md';

import {
  apiUrls,
  AssetHTTPService,
  downloadFile,
  humanFileSize,
  useAssetStore,
  isElectron,
  useHexColor,
  useUsersStore,
} from '@sage3/frontend';
import { fuzzySearch, isCode, isVideo, isGIF, isPDF, isImage, mimeToCode, isGeoJSON, isFileURL, isJSON, isPython } from '@sage3/shared';
import { Asset, Room, ExtraImageType, ExtraPDFType, ExtraVideoType } from '@sage3/shared/types';

// Compare filenames case independent
function sortAsset(a: Asset, b: Asset) {
  const namea = a.data.originalfilename.toLowerCase();
  const nameb = b.data.originalfilename.toLowerCase();
  if (namea < nameb) return -1;
  if (namea > nameb) return 1;
  return 0;
}

// List of Assets
export function AssetList(props: { room: Room }) {
  const allAssets = useAssetStore((state) => state.assets);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [assetSearch, setAssetSearch] = useState('');

  const users = useUsersStore((state) => state.users);

  const assetSearchFilter = (asset: Asset) => {
    const data = asset.data;
    return fuzzySearch(data.originalfilename, assetSearch);
  };

  useEffect(() => {
    const assets = allAssets.filter((asset) => asset.data.room === props.room._id);
    setAssets(assets);
  }, [allAssets, users, props.room]);

  return (
    <Box display="flex" flexDir="row" p="2">
      <VStack gap="2" overflowX="hidden" minWidth="500px">
        {/* File Search */}
        <InputGroup size="md" width="100%" my="1">
          <InputLeftElement pointerEvents="none">
            <MdSearch />
          </InputLeftElement>
          <Input placeholder="Search Files" value={assetSearch} onChange={(e) => setAssetSearch(e.target.value)} />
        </InputGroup>
        <Box width="100%" display="flex" flexDir="column" overflowY={'scroll'}>
          {assets
            .filter(assetSearchFilter)
            .sort(sortAsset)
            .map((a) => (
              <AssetListItem key={a._id} asset={a} onClick={() => setSelectedAsset(a)} selected={a._id == selectedAsset?._id} />
            ))}
        </Box>
      </VStack>
      <Box px="25px" flex="1">
        {selectedAsset && <AssetPreview asset={selectedAsset}></AssetPreview>}
      </Box>
    </Box>
  );
}

// Asset List Item
function AssetListItem(props: { asset: Asset; onClick: () => void; selected: boolean }) {
  const grayColorValue = useColorModeValue('gray.700', 'gray.300');
  const gray = useHexColor(grayColorValue);
  const teal = useHexColor('teal');

  const color = props.selected ? teal : 'gray';

  const linearBGColor = useColorModeValue(
    `linear-gradient(178deg, #ffffff, #fbfbfb, #f3f3f3)`,
    `linear-gradient(178deg, #303030, #252525, #262626)`
  );

  const name = props.asset.data.originalfilename;
  const icon = whichIcon(props.asset.data.mimetype);
  const dateCreated = new Date(props.asset.data.dateCreated).toLocaleDateString();

  return (
    <Box
      background={linearBGColor}
      p="1"
      px="2"
      mb="1"
      width="calc(100% - 6px)"
      display="flex"
      justifyContent={'space-between'}
      alignItems={'center'}
      borderRadius="md"
      boxSizing="border-box"
      border={`solid 1px ${props.selected ? color : 'transparent'}`}
      borderLeft={`solid 8px ${color}`}
      transition={'all 0.2s ease-in-out'}
      onClick={props.onClick}
      cursor="pointer"
      overflow={'hidden'}
    >
      <Box display="flex" alignItems={'center'}>
        {/* Chakra Icon */}
        <Box display="flex" alignItems={'center'} ml={1} mr={2}>
          {icon}
        </Box>
        <Box display="flex" flexDir="column">
          <Text fontSize="xs" fontWeight="bold" textAlign="left" overflow={'hidden'} whiteSpace={'nowrap'} textOverflow={'ellipsis'}>
            {name}
          </Text>
          <Text fontSize="xs" color={'gray.500'}>
            {dateCreated}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

// Asset Preview
function AssetPreview(props: { asset: Asset }) {
  const selectedAsset = props.asset;
  const width = 500;
  const filename = selectedAsset.data.originalfilename;
  const dateCreated = new Date(selectedAsset.data.dateCreated).toLocaleDateString();
  const dateAdded = new Date(selectedAsset.data.dateAdded).toLocaleDateString();
  const type = selectedAsset.data.mimetype;
  const size = humanFileSize(selectedAsset.data.size);
  const [PreviewElement, setPreviewElement] = useState<JSX.Element | null>(null);
  const theme = useColorModeValue('vs', 'vs-dark');

  useEffect(() => {
    const getPreview = async () => {
      const Preview = await whichPreview(props.asset, 500, theme);
      setPreviewElement(Preview);
    };
    getPreview();
  }, [props.asset._id, theme]);

  function downloadAsset() {
    const fileURL = apiUrls.assets.getAssetById(props.asset.data.file);
    downloadFile(fileURL, filename);
  }

  function deleteAsset() {
    AssetHTTPService.del(props.asset._id);
  }

  return (
    <Box width={width + 'px'} display="flex" flexDirection="column" p={2} ml={4}>
      {/* First Area: Meta Data */}
      <Box mb={2}>
        <Grid templateColumns="150px 1fr" gap={2}>
          {/* File Name */}
          <Text fontWeight="bold">Filename</Text>
          <Text>{filename}</Text>

          {/* Date Created */}
          <Text fontWeight="bold">Date Created</Text>
          <Text>{dateCreated}</Text>

          {/* Date Added */}
          <Text fontWeight="bold">Date Added</Text>
          <Text>{dateAdded}</Text>

          {/* Type */}
          <Text fontWeight="bold">Type</Text>
          <Text>{type}</Text>

          {/* Size */}
          <Text fontWeight="bold">Size</Text>
          <Text>{size}</Text>
        </Grid>
      </Box>

      {/* Second Area: Actions */}
      <HStack gap="2" width="100%" justifyContent="space-between">
        <Button colorScheme="teal" size="sm" mt={2} width="100%" variant="outline" onClick={downloadAsset}>
          Download
        </Button>
        <Button colorScheme="red" size="sm" mt={2} width="100%" variant="outline" onClick={deleteAsset}>
          Delete
        </Button>
        {/* Add more actions as needed */}
      </HStack>

      {/* Third Area: Preview */}
      <Box mt={2} flexGrow="1" overflow={'hidden'} display="flex">
        {PreviewElement}
      </Box>
    </Box>
  );
}

// Pick an icon based on file type
const whichIcon = (type: string) => {
  if (isFileURL(type)) {
    return <MdOutlineLink style={{ color: 'lightgreen' }} size={'20px'} />;
  } else if (isGeoJSON(type)) {
    return <MdOutlineMap style={{ color: 'green' }} size={'20px'} />;
  } else if (isJSON(type)) {
    return <LuFileJson style={{ color: 'cyan' }} size={'20px'} />;
  } else if (isPython(type)) {
    return <FaPython style={{ color: 'lightblue' }} size={'20px'} />;
  } else if (isCode(type)) {
    if (type === 'application/javascript' || type === 'text/javascript') {
      return <MdJavascript style={{ color: 'yellow' }} size={'20px'} />;
    } else {
      return <LuFileCode style={{ color: 'tomato' }} size={'20px'} />;
    }
  } else if (isVideo(type)) {
    return <MdOndemandVideo style={{ color: 'lightgreen' }} size={'20px'} />;
  } else if (isImage(type)) {
    return <MdOutlineImage style={{ color: 'lightblue' }} size={'20px'} />;
  } else if (isPDF(type)) {
    return <MdOutlinePictureAsPdf style={{ color: 'tomato' }} size={'20px'} />;
  } else {
    return <MdOutlineFilePresent size={'20px'} />;
  }
};

// Generate a preview based on the file type
const whichPreview = async (asset: Asset, width: number, theme: string): Promise<JSX.Element> => {
  const type = asset.data.mimetype;
  if (isVideo(type)) {
    const extras = asset.data.derived as ExtraVideoType;
    const videoURL = extras.url;
    return <video src={videoURL} controls muted={true} autoPlay={true} loop style={{ width }} />;
  } else if (isImage(type)) {
    let imageURL;
    if (isGIF(type)) {
      // GIFs are not processed by the backend, so we use the original file
      imageURL = apiUrls.assets.getAssetById(asset.data.file);
    } else {
      const extras = asset.data.derived as ExtraImageType;
      for (let i = 0; i < extras.sizes.length; i++) {
        if (extras.sizes[i].width > width) {
          // Choose the first image that is larger than the preview width
          imageURL = extras.sizes[i].url;
          break;
        }
      }
      if (!imageURL) {
        // If no image is larger than the preview width, choose the largest image
        imageURL = extras.sizes[extras.sizes.length - 1].url;
      }
    }
    return <img src={imageURL} alt={asset.data.originalfilename} style={{ width }} />;
  } else if (isPDF(type)) {
    const pages = asset.data.derived as ExtraPDFType;
    const firstPage = pages[0];
    let imageURL;
    for (let i = 0; i < firstPage.length; i++) {
      if (firstPage[i].size > width) {
        // Choose the first image that is larger than the preview width
        imageURL = firstPage[i].url;
        break;
      }
    }
    if (!imageURL) {
      // If no image is larger than the preview width, choose the largest image
      imageURL = firstPage[firstPage.length - 1].url;
    }
    return <img src={imageURL} alt={asset.data.originalfilename} style={{ width }} />;
  } else if (isCode(type) || isGeoJSON(type)) {
    // Download text file
    const fileURL = apiUrls.assets.getAssetById(asset.data.file);
    const response = await fetch(fileURL);
    const code = await response.text();
    const language = mimeToCode(type);
    return CodeViewer({ code, language, theme });
  } else if (isFileURL(type)) {
    // Download text file
    const fileURL = apiUrls.assets.getAssetById(asset.data.file);
    const response = await fetch(fileURL);
    const text = await response.text();
    const lines = text.split('\n');
    let goto;
    for (const line of lines) {
      // look for a line starting with URL=
      if (line.startsWith('URL')) {
        const words = line.split('=');
        // the URL
        goto = words[1].trim();
      }
    }
    if (goto) {
      return (
        <Text>
          URL:{' '}
          <Link
            href={goto}
            isExternal={true}
            onClick={(evt) => {
              evt.preventDefault();
              openExternalURL(goto);
            }}
          >
            {goto}
          </Link>
        </Text>
      );
    }
  }
  return <Text>Preview not available</Text>;
};

// Open an external URL
function openExternalURL(goto: string) {
  if (isElectron()) {
    window.electron.send('open-external-url', { url: goto });
  } else {
    window.open(goto, '_blank');
  }
}

// A Monaco editor view only component that just shows the code provided in props
function CodeViewer(props: { code: string; language: string; theme: string }) {
  // Styling
  return (
    <Editor
      value={props.code}
      width={'100%'}
      height="500px"
      language={props.language}
      theme={props.theme}
      options={{
        readOnly: true,
        fontSize: 14,
        contextmenu: false,
        minimap: { enabled: false },
        lineNumbers: 'on',
        lineNumbersMinChars: 5,
        overviewRulerBorder: false,
        overviewRulerLanes: 0,
        quickSuggestions: false,
        glyphMargin: false,
        wordWrap: 'on',
        lineDecorationsWidth: 0,
        scrollBeyondLastLine: false,
        wordWrapColumn: 80,
        wrappingStrategy: 'simple',
        renderLineHighlight: 'line',
        renderLineHighlightOnlyWhenFocus: true,
        fontFamily: "'Source Code Pro', 'Menlo', 'Monaco', 'Consolas', 'monospace'",
        scrollbar: {
          useShadows: true,
          verticalHasArrows: true,
          horizontalHasArrows: true,
          vertical: 'auto',
          horizontal: 'auto',
          verticalScrollbarSize: 18,
          horizontalScrollbarSize: 18,
          arrowSize: 30,
        },
      }}
    />
  );
}
