/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
import {
  useColorModeValue,
  Box,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  Button,
  Grid,
  HStack,
  Link,
  Tag,
  IconButton,
  VStack,
  Tooltip,
} from '@chakra-ui/react';
import { Editor } from '@monaco-editor/react';

import { FaPython } from 'react-icons/fa';
import { LuFileJson, LuFileCode } from 'react-icons/lu';
import {
  MdAdd,
  MdDownload,
  MdJavascript,
  MdOndemandVideo,
  MdOutlineFilePresent,
  MdOutlineImage,
  MdOutlineLink,
  MdOutlineMap,
  MdOutlinePictureAsPdf,
  MdPerson,
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
  useUser,
} from '@sage3/frontend';
import { fuzzySearch, isCode, isVideo, isGIF, isPDF, isImage, mimeToCode, isGeoJSON, isFileURL, isJSON, isPython } from '@sage3/shared';
import { Asset, Room, ExtraImageType, ExtraPDFType, ExtraVideoType } from '@sage3/shared/types';
import { HiTrash } from 'react-icons/hi';

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
  const [showOnlyYours, setShowOnlyYours] = useState(false);
  const handleShowOnlyYours = () => setShowOnlyYours(!showOnlyYours);

  // User Info
  const users = useUsersStore((state) => state.users);
  const { user } = useUser();

  const filterAssets = (asset: Asset) => {
    const filterYours = showOnlyYours ? asset.data.owner === user?._id : true;
    return filterYours;
  };

  const assetSearchFilter = (asset: Asset) => {
    const data = asset.data;
    return fuzzySearch(data.originalfilename, assetSearch);
  };

  useEffect(() => {
    const assets = allAssets.filter((asset) => asset.data.room === props.room._id);
    setAssets(assets);
  }, [allAssets, users, props.room]);

  function handleUpload() {
    // Upload asset
  }

  return (
    <Box display="flex" gap="8">
      <Box height="calc(100vh - 300px)" width="500px" overflowY="auto" overflowX="hidden">
        <VStack width="100%" px="4" gap="3">
          <Box display="flex" justifyContent="start" alignItems="center" width="100%" gap="2">
            {/* Upload Button */}
            <Tooltip label="Add Plugin" aria-label="upload plugin" placement="top" hasArrow>
              <IconButton
                size="md"
                variant={'outline'}
                colorScheme={'teal'}
                aria-label="plugin-upload"
                fontSize="xl"
                icon={<MdAdd />}
                onClick={handleUpload}
              ></IconButton>
            </Tooltip>
            {/* Search Input */}
            <InputGroup size="md" width="100%" my="1">
              <InputLeftElement pointerEvents="none">
                <MdSearch />
              </InputLeftElement>
              <Input placeholder="Search Assets" value={assetSearch} onChange={(e) => setAssetSearch(e.target.value)} />
            </InputGroup>
            {/* Filter Yours */}
            <Tooltip label="Filter Yours" aria-label="filter your plugins" placement="top" hasArrow>
              <IconButton
                size="md"
                variant="outline"
                colorScheme={showOnlyYours ? 'teal' : 'gray'}
                aria-label="filter-yours"
                fontSize="xl"
                icon={<MdPerson />}
                onClick={handleShowOnlyYours}
              ></IconButton>
            </Tooltip>
          </Box>

          {assets
            .filter(filterAssets)
            .filter(assetSearchFilter)
            .sort(sortAsset)
            .map((a) => (
              <AssetListItem
                key={a._id}
                asset={a}
                onClick={() => setSelectedAsset(a)}
                selected={a._id == selectedAsset?._id}
                isOwner={a.data.owner === user?._id}
              />
            ))}
        </VStack>
      </Box>
      <Box flex="1">{selectedAsset && <AssetPreview asset={selectedAsset}></AssetPreview>}</Box>
    </Box>
  );
}

interface PluginItemProps {
  asset: Asset;
  selected: boolean;
  isOwner: boolean;
  onClick: () => void;
}

// Asset List Item
function AssetListItem(props: PluginItemProps) {
  const backgroundColorValue = useColorModeValue('#ffffff', `gray.800`);
  const backgroundColor = useHexColor(backgroundColorValue);

  const borderColorValue = useColorModeValue(`teal.600`, `teal.200`);
  const borderColor = useHexColor(borderColorValue);
  const subTextValue = useColorModeValue('gray.700', 'gray.300');
  const subText = useHexColor(subTextValue);

  const name = props.asset.data.originalfilename;
  const icon = whichIcon(props.asset.data.mimetype);
  const dateCreated = new Date(props.asset.data.dateCreated).toLocaleDateString();

  return (
    <Box
      background={backgroundColor}
      p={props.selected ? '2' : '1'}
      px="2"
      display="flex"
      justifyContent={'space-between'}
      alignItems={'center'}
      borderRadius="md"
      boxSizing="border-box"
      width="100%"
      height="56px"
      border={`solid 2px ${props.selected ? borderColor : 'transparent'}`}
      transform={props.selected ? 'scale(1.02)' : 'scale(1)'}
      _hover={{ border: `solid 2px ${borderColor}`, transform: 'scale(1.02)' }}
      transition={'all 0.2s ease-in-out'}
      onClick={props.onClick}
      cursor="pointer"
    >
      <Box display="flex" alignItems={'center'}>
        {/* Chakra Icon */}
        <Box display="flex" alignItems={'center'} ml={1} mr={2}>
          {icon}
        </Box>
        <Box display="flex" flexDir="column" maxWidth="350px">
          <Box overflow="hidden" textOverflow={'ellipsis'} whiteSpace={'nowrap'} mr="2" fontSize="lg" fontWeight={'bold'}>
            {name}
          </Box>
          <Box overflow="hidden" textOverflow={'ellipsis'} whiteSpace={'nowrap'} mr="2" fontSize="xs" color={subText}>
            {dateCreated}
          </Box>
        </Box>
      </Box>
      <Box display="flex" alignItems={'center'}>
        {props.isOwner && (
          <Tag colorScheme="teal" size="md">
            Owner
          </Tag>
        )}
      </Box>
    </Box>
  );
}

// Asset Preview
function AssetPreview(props: { asset: Asset }) {
  const selectedAsset = props.asset;

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
    <Box width={800 + 'px'} display="flex" flexDirection="column">
      {/* First Area: Meta Data */}
      <Box mb={2}>
        <HStack gap="8" mb="4">
          <VStack alignItems={'start'} fontWeight={'bold'}>
            <Text>Filename</Text>
            <Text>Date Created</Text>
            <Text>Date Added</Text>
            <Text>Type</Text>
            <Text>Size</Text>
          </VStack>
          <VStack alignItems={'start'}>
            <Text>{filename}</Text>
            <Text>{dateCreated}</Text>
            <Text>{dateAdded}</Text>
            <Text>{type}</Text>
            <Text>{size}</Text>
          </VStack>
        </HStack>
      </Box>

      {/* Second Area: Actions */}
      <HStack gap="2" mb={4} width="100%" justifyContent="start">
        <Tooltip label="Download Asset" aria-label="download-asset" placement="top" hasArrow>
          <IconButton
            size="md"
            variant={'outline'}
            colorScheme={'teal'}
            aria-label="favorite-board"
            fontSize="xl"
            icon={<MdDownload />}
            // isDisabled={}
            onClick={downloadAsset}
          />
        </Tooltip>
        <Tooltip label="Delete Asset" aria-label="delete-asset" placement="top" hasArrow>
          <IconButton
            size="md"
            variant={'outline'}
            colorScheme={'red'}
            aria-label="favorite-board"
            fontSize="xl"
            icon={<HiTrash />}
            // isDisabled={!canDeleteSelectedPlugin}
            onClick={deleteAsset}
          />
        </Tooltip>
        {/* Add more actions as needed */}
      </HStack>

      {/* Third Area: Preview */}
      <Box flexGrow="1" overflow={'hidden'} display="flex">
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
    return <video src={videoURL} controls muted={true} autoPlay={true} loop style={{ width, borderRadius: '16px' }} />;
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
    return <img src={imageURL} alt={asset.data.originalfilename} style={{ width, borderRadius: '16px' }} />;
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
    return <img src={imageURL} alt={asset.data.originalfilename} style={{ width, borderRadius: '16px' }} />;
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
