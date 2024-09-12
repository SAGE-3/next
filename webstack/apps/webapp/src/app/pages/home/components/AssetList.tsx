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
  HStack,
  Tag,
  IconButton,
  VStack,
  Tooltip,
  useDisclosure,
} from '@chakra-ui/react';
import { Editor } from '@monaco-editor/react';

import { HiTrash } from 'react-icons/hi';
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
  UploadModal,
  formatDateAndTime,
  ConfirmModal,
  truncateWithEllipsis,
} from '@sage3/frontend';
import {
  fuzzySearch,
  isCode,
  isVideo,
  isGIF,
  isPDF,
  isImage,
  mimeToCode,
  isGeoJSON,
  isFileURL,
  isJSON,
  isPython,
  isText,
} from '@sage3/shared';
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
  const [selectedAssetAuthor, setSelectedAssetAuthor] = useState<string>('Unknown');
  const [assetSearch, setAssetSearch] = useState('');
  const [showOnlyYours, setShowOnlyYours] = useState(false);
  const handleShowOnlyYours = () => setShowOnlyYours(!showOnlyYours);

  const { isOpen: uploadIsOpen, onOpen: uploadOnOpen, onClose: uploadOnClose } = useDisclosure();
  const { isOpen: deleteIsOpen, onOpen: deleteOnOpen, onClose: deleteOnClose } = useDisclosure();

  // User Info
  const users = useUsersStore((state) => state.users);
  const { user } = useUser();
  const isRoomOwner = user?._id == props.room._createdBy;
  const canDeleteSelectedAsset = selectedAsset?.data.owner === user?._id || isRoomOwner;

  const filterAssets = (asset: Asset) => {
    const filterYours = showOnlyYours ? asset.data.owner === user?._id : true;
    return filterYours;
  };

  const assetSearchFilter = (asset: Asset) => {
    const data = asset.data;
    return fuzzySearch(data.originalfilename, assetSearch);
  };

  const handleAssetDelete = () => {
    if (selectedAsset) {
      AssetHTTPService.del(selectedAsset._id);
      setSelectedAsset(null);
    }
    deleteOnClose();
  };

  const handleAssetClick = (asset: Asset) => {
    setSelectedAsset(asset);
    const author = users.find((u) => u._id === asset.data.owner);
    setSelectedAssetAuthor(author?.data.name || 'Unknown');
  };

  useEffect(() => {
    const assets = allAssets.filter((asset) => asset.data.room === props.room._id);
    setAssets(assets);
  }, [allAssets, users, props.room]);

  return (
    <Box display="flex" gap="8">
      {/* Upload dialog */}
      <UploadModal isOpen={uploadIsOpen} onOpen={uploadOnOpen} onClose={uploadOnClose}></UploadModal>
      {/* Delete modal */}
      <ConfirmModal
        isOpen={deleteIsOpen}
        onClose={deleteOnClose}
        onConfirm={handleAssetDelete}
        title={'Asset Delete'}
        message={`Are you sure you want to delete ${selectedAsset?.data.originalfilename}?`}
      />
      <Box width="500px">
        <Box display="flex" justifyContent="start" alignItems="center" width="100%" gap="2" mb="3" px="2">
          {/* Upload Button */}
          <Tooltip label="Add Asset" aria-label="upload asset" placement="top" hasArrow>
            <IconButton
              size="md"
              variant={'outline'}
              colorScheme={'teal'}
              aria-label="asset-upload"
              fontSize="xl"
              icon={<MdAdd />}
              onClick={uploadOnOpen}
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
          <Tooltip label="Filter Yours" aria-label="filter your assets" placement="top" hasArrow>
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

        <VStack height="calc(100vh - 320px)" width="100%" gap="2" overflowY="auto" overflowX="hidden" px="2">
          {assets
            .filter(filterAssets)
            .filter(assetSearchFilter)
            .sort(sortAsset)
            .map((a) => {
              const author = users.find((u) => u._id === a.data.owner);
              const authorName = author?.data.name || 'Unknown';
              return (
                <AssetListItem
                  key={a._id}
                  asset={a}
                  authorName={authorName}
                  onClick={() => handleAssetClick(a)}
                  selected={a._id == selectedAsset?._id}
                  isOwner={a.data.owner === user?._id}
                />
              );
            })}
        </VStack>
      </Box>
      <Box flex="1">
        {selectedAsset && (
          <AssetPreview
            asset={selectedAsset}
            author={selectedAssetAuthor}
            onDelete={deleteOnOpen}
            canDelete={canDeleteSelectedAsset}
          ></AssetPreview>
        )}
      </Box>
    </Box>
  );
}

interface AssetItemProps {
  asset: Asset;
  selected: boolean;
  isOwner: boolean;
  authorName: string;
  onClick: () => void;
}

// Asset List Item
function AssetListItem(props: AssetItemProps) {
  const backgroundColorValue = useColorModeValue('#ffffff', `gray.800`);
  const backgroundColor = useHexColor(backgroundColorValue);

  const borderColorValue = useColorModeValue(`teal.600`, `teal.200`);
  const borderColor = useHexColor(borderColorValue);
  const subTextValue = useColorModeValue('gray.700', 'gray.300');
  const subText = useHexColor(subTextValue);

  const name = props.asset.data.originalfilename;
  const icon = whichIcon(props.asset.data.mimetype);
  const dateCreated = formatDateAndTime(props.asset.data.dateCreated);
  const author = truncateWithEllipsis(props.authorName, 10);

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
      height="44px"
      border={`solid 2px ${props.selected ? borderColor : 'transparent'}`}
      transform={props.selected ? 'scale(1.02)' : 'scale(1)'}
      _hover={{ border: `solid 2px ${borderColor}`, transform: 'scale(1.02)' }}
      transition={'all 0.2s ease-in-out'}
      onClick={props.onClick}
      cursor="pointer"
    >
      <Box display="flex" alignItems={'center'}>
        {/* Chakra Icon */}
        <Box display="flex" alignItems={'center'} ml={0} mr={2}>
          {icon}
        </Box>
        <Box display="flex" flexDir="column" maxWidth="325px">
          <Box overflow="hidden" textOverflow={'ellipsis'} whiteSpace={'nowrap'} mr="2" fontSize="sm" fontWeight={'bold'}>
            {name}
          </Box>
          <Box overflow="hidden" textOverflow={'ellipsis'} whiteSpace={'nowrap'} mr="2" fontSize="xs" color={subText}>
            {dateCreated}
          </Box>
        </Box>
      </Box>
      <Box display="flex" width="80px">
        {props.isOwner ? (
          <Tag colorScheme="teal" size="sm" width="100%" justifyContent="center">
            Owner
          </Tag>
        ) : (
          <Tag colorScheme="yellow" size="sm" whiteSpace="nowrap" overflow="hidden" justifyContent="start">
            {author}
          </Tag>
        )}
      </Box>
    </Box>
  );
}

interface AssetPreviewProps {
  asset: Asset;
  canDelete: boolean;
  author: string;
  onDelete: () => void;
}

// Asset Preview
function AssetPreview(props: AssetPreviewProps) {
  const selectedAsset = props.asset;

  const filename = selectedAsset.data.originalfilename;
  const dateCreated = formatDateAndTime(selectedAsset.data.dateCreated);
  const dateAdded = formatDateAndTime(selectedAsset.data.dateAdded);
  const type = selectedAsset.data.mimetype;
  const size = humanFileSize(selectedAsset.data.size);
  const author = props.author;
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

  return (
    <Box width={'800px'} display="flex" flexDirection="column">
      {/* First Area: Meta Data */}
      <Box mb={2}>
        <HStack gap="8" mb="4">
          <VStack alignItems={'start'} fontWeight={'bold'}>
            <Text>Filename</Text>
            <Text>Owner</Text>
            <Text>Created</Text>
            <Text>Uploaded</Text>
            <Text>Type</Text>
            <Text>Size</Text>
          </VStack>
          <VStack alignItems={'start'}>
            <Text>{filename}</Text>
            <Text>{author}</Text>
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
            onClick={downloadAsset}
          />
        </Tooltip>
        <Tooltip
          label={props.canDelete ? 'Delete Asset' : 'Only the Asset owner and Room Owner can delete this asset.'}
          aria-label="delete-asset"
          placement="top"
          hasArrow
          textAlign={'center'}
        >
          <IconButton
            size="md"
            variant={'outline'}
            colorScheme={'red'}
            aria-label="favorite-board"
            fontSize="xl"
            icon={<HiTrash />}
            isDisabled={!props.canDelete}
            onClick={props.onDelete}
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
    return <MdOutlineLink style={{ color: 'lightgreen' }} size={'24px'} />;
  } else if (isGeoJSON(type)) {
    return <MdOutlineMap style={{ color: 'green' }} size={'24px'} />;
  } else if (isJSON(type)) {
    return <LuFileJson style={{ color: 'cyan' }} size={'24px'} />;
  } else if (isPython(type)) {
    return <FaPython style={{ color: 'lightblue' }} size={'24px'} />;
  } else if (isCode(type)) {
    if (type === 'application/javascript' || type === 'text/javascript') {
      return <MdJavascript style={{ color: 'yellow' }} size={'24px'} />;
    } else {
      return <LuFileCode style={{ color: 'tomato' }} size={'24px'} />;
    }
  } else if (isVideo(type)) {
    return <MdOndemandVideo style={{ color: 'lightgreen' }} size={'24px'} />;
  } else if (isImage(type)) {
    return <MdOutlineImage style={{ color: 'lightblue' }} size={'24px'} />;
  } else if (isPDF(type)) {
    return <MdOutlinePictureAsPdf style={{ color: 'tomato' }} size={'24px'} />;
  } else {
    return <MdOutlineFilePresent size={'24px'} />;
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
      if (extras.sizes.length === 0) {
        // No multi-resolution images, use the original
        imageURL = apiUrls.assets.getAssetById(asset.data.file);
      } else {
        for (let i = 0; i < extras.sizes.length; i++) {
          if (extras.sizes[i].width > width) {
            // Choose the first image that is larger than the preview width
            imageURL = extras.sizes[i].url;
            break;
          }
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
        <Box width="400px" overflow="hidden">
          <Text width="100%" fontSize="md" mb="2" fontWeight={'bold'}>
            URL: {goto}
          </Text>
          <Button onClick={() => openExternalURL(goto)} colorScheme="teal" size="sm">
            Open in Browser
          </Button>
        </Box>
      );
    } else {
      return <Text>URL Preview not available</Text>;
    }
  } else if (isText(type)) {
    // Download text file
    const fileURL = apiUrls.assets.getAssetById(asset.data.file);
    const response = await fetch(fileURL);
    const text = await response.text();
    // Show text in a nice non-editable text box
    return (
      <textarea
        value={text}
        readOnly={true}
        style={{ width: '500px', padding: '8px', height: '500px', resize: 'none', textWrap: 'nowrap' }}
      />
    );
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
      width="100%"
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
