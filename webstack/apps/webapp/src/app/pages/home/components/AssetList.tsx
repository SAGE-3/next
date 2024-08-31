/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import { useColorModeValue, Box, Text, VStack, Input, InputGroup, InputLeftElement, Button, Grid, HStack } from '@chakra-ui/react';
import {
  apiUrls,
  AssetHTTPService,
  downloadFile,
  humanFileSize,
  useAssetStore,
  useConfigStore,
  useHexColor,
  useUsersStore,
} from '@sage3/frontend';
import { fuzzySearch, isCode, isVideo, isGIF, isPDF, isImage, mimeToCode } from '@sage3/shared';
import { Asset, FileEntry, Room, ExtraImageType, ExtraPDFType, ExtraVideoType } from '@sage3/shared/types';

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
import { Editor } from '@monaco-editor/react';

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
    <Box display="flex" flexDir="row" p="2" border="solid 2px white">
      <VStack gap="2" overflowX="hidden" overflowY="scroll" height="100%" border="solid red 1px">
        {/* File Search */}
        <InputGroup size="md" width="100%" my="1">
          <InputLeftElement pointerEvents="none">
            <MdSearch />
          </InputLeftElement>
          <Input placeholder="Search Files" value={assetSearch} onChange={(e) => setAssetSearch(e.target.value)} />
        </InputGroup>
        {assets.filter(assetSearchFilter).map((a) => (
          <AssetListItem key={a._id} asset={a} onClick={() => setSelectedAsset(a)} selected={a._id == selectedAsset?._id} />
        ))}
      </VStack>
      <Box px="25px">{selectedAsset && <AssetPreview asset={selectedAsset}></AssetPreview>}</Box>
    </Box>
  );
}

// Asset List Item
function AssetListItem(props: { asset: Asset; onClick: () => void; selected: boolean }) {
  const grayColorValue = useColorModeValue('gray.700', 'gray.300');
  const gray = useHexColor(grayColorValue);
  const teal = useHexColor('teal');

  const color = props.selected ? teal : gray;

  const linearBGColor = useColorModeValue(
    `linear-gradient(178deg, #ffffff, #fbfbfb, #f3f3f3)`,
    `linear-gradient(178deg, #303030, #252525, #262626)`
  );

  const name = props.asset.data.originalfilename;
  // Get extension from the name
  const extension = name.split('.').pop();
  const icon = whichIcon(extension || '');
  const dateCreated = new Date(props.asset.data.dateCreated).toLocaleDateString();

  return (
    <Box
      background={linearBGColor}
      p="1"
      px="2"
      width="500px"
      display="flex"
      justifyContent={'space-between'}
      alignItems={'center'}
      borderRadius="md"
      boxSizing="border-box"
      border={`solid 1px ${color}`}
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
          <Text
            fontSize="xs"
            fontWeight="bold"
            textAlign="left"
            overflow={'hidden'}
            whiteSpace={'nowrap'}
            textOverflow={'ellipsis'}
            width=""
          >
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

function AssetPreview(props: { asset: Asset }) {
  const selectedAsset = props.asset;
  const width = 600;
  const filename = selectedAsset.data.originalfilename;
  const dateCreated = new Date(selectedAsset.data.dateCreated).toLocaleDateString();
  const dateAdded = new Date(selectedAsset.data.dateAdded).toLocaleDateString();
  const type = selectedAsset.data.mimetype;
  const size = humanFileSize(selectedAsset.data.size);
  const [PreviewElement, setPreviewElement] = useState<JSX.Element | null>(null);

  useEffect(() => {
    const getPreview = async () => {
      const Preview = await whichPreview(props.asset, 500);
      setPreviewElement(Preview);
    };
    getPreview();
  }, [props.asset._id]);

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

      {/* Third Area: Actions */}
      <HStack gap="2">
        <Button colorScheme="teal" size="sm" mt={2} width="200px" variant="outline" onClick={downloadAsset}>
          Download
        </Button>
        <Button colorScheme="red" size="sm" mt={2} width="200px" variant="outline" onClick={deleteAsset}>
          Delete
        </Button>
        {/* Add more actions as needed */}
      </HStack>

      {/* Second Area: Preview */}
      <Box mt={2}>{PreviewElement}</Box>
    </Box>
  );
}

// pick an icon based on file type (extension string)
const whichIcon = (type: string) => {
  switch (type) {
    case 'url':
      return <MdOutlineLink style={{ color: 'lightgreen' }} size={'20px'} />;
    case 'json':
      return <LuFileJson style={{ color: 'white' }} size={'20px'} />;
    case 'yaml':
    case 'ts':
    case 'html':
    case 'css':
    case 'cpp':
    case 'c':
    case 'java':
    case 'r':
      return <LuFileCode style={{ color: 'white' }} size={'20px'} />;
    case 'js':
      return <MdJavascript style={{ color: 'yellow' }} size={'20px'} />;
    case 'py':
      return <FaPython style={{ color: 'lightblue' }} size={'20px'} />;
    case 'pdf':
      return <MdOutlinePictureAsPdf style={{ color: 'tomato' }} size={'20px'} />;
    case 'jpeg':
    case 'png':
    case 'gif':
      return <MdOutlineImage style={{ color: 'lightblue' }} size={'20px'} />;
    case 'geotiff':
    case 'geojson':
      return <MdOutlineMap style={{ color: 'green' }} size={'20px'} />;
    case 'mp4':
    case 'qt':
      return <MdOndemandVideo style={{ color: 'lightgreen' }} size={'20px'} />;
    case 'qt':
      return <MdOndemandVideo style={{ color: 'lightgreen' }} size={'20px'} />;
    default:
      return <MdOutlineFilePresent size={'20px'} />;
  }
};

const whichPreview = async (asset: Asset, width: number): Promise<JSX.Element> => {
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
    const numPages = pages.length;
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
  } else if (isCode(type)) {
    // Download text file
    const fileURL = apiUrls.assets.getAssetById(asset.data.file);
    const response = await fetch(fileURL);
    const code = await response.text();
    const language = mimeToCode(type);
    console.log(language);
    return CodeViewer({ code, language });
  } else {
    return <Text>Preview not available</Text>;
  }
};

// A Monaco editor view only component that just shows the code provided in props
export function CodeViewer(props: { code: string; language: string }) {
  // Styling
  return (
    <Editor
      value={props.code}
      width={'500px'}
      height={'500px'}
      language={props.language}
      theme={'vs-dark'}
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
