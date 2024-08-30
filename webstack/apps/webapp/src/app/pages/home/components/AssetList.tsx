/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import {
  useColorModeValue,
  IconButton,
  Box,
  Text,
  VStack,
  Input,
  InputGroup,
  InputLeftElement,
  Button,
  Grid,
  HStack,
} from '@chakra-ui/react';
import { apiUrls, useAssetStore, useConfigStore, useHexColor, useUsersStore } from '@sage3/frontend';
import { fuzzySearch, getExtension } from '@sage3/shared';
import { Asset, FileEntry, Room } from '@sage3/shared/types';
import { useEffect, useState } from 'react';
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

// UUID generator
import { v5 as uuidv5 } from 'uuid';

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
    <Box display="flex" flexDir="row" width="800px">
      <VStack gap="2">
        {/* File Search */}
        <InputGroup size="md" width="100%" my="1">
          <InputLeftElement pointerEvents="none">
            <MdSearch />
          </InputLeftElement>
          <Input placeholder="Search Files" value={assetSearch} onChange={(e) => setAssetSearch(e.target.value)} />
        </InputGroup>
        {assets.filter(assetSearchFilter).map((a) => (
          <AssetListItem asset={a} onClick={() => setSelectedAsset(a)} selected={a._id == selectedAsset?._id} />
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
  const width = 500;
  const filename = selectedAsset.data.originalfilename;
  const dateCreated = new Date(selectedAsset.data.dateCreated).toLocaleDateString();
  const dateAdded = new Date(selectedAsset.data.dateAdded).toLocaleDateString();
  const type = filename.split('.').pop();
  const size = formatSize(selectedAsset.data.size);
  const extension = filename.split('.').pop();
  const [PreviewElement, setPreviewElement] = useState<JSX.Element | null>(null);

  useEffect(() => {
    const getPreview = async () => {
      // Get the namespace UUID of the server
      const namespace = useConfigStore.getState().config.namespace;
      // Generate a public URL of the file
      const token = uuidv5(props.asset._id, namespace);
      const publicUrl = window.location.origin + apiUrls.assets.getPublicURL(props.asset._id, token);

      const Preview = await whichPreview(props.asset, extension ? extension : '', width, publicUrl);
      setPreviewElement(Preview);
    };
    getPreview();
  }, [props.asset._id]);

  return (
    <Box width={width + 'px'} display="flex" flexDirection="column" p={2} ml={4}>
      {/* First Area: Meta Data */}
      <Box mb={2}>
        <Grid templateColumns="repeat(2, 1fr)" gap={2}>
          {/* File Name */}
          <Text fontWeight="bold">File Name</Text>
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
        <Button colorScheme="teal" size="sm" mt={2} width="200px" variant="outline">
          Download
        </Button>
        <Button colorScheme="red" size="sm" mt={2} width="200px" variant="outline">
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

const whichPreview = async (asset: Asset, extension: string, width: number, fileURL?: string): Promise<JSX.Element> => {
  switch (extension) {
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'jpg':
      return <img src={fileURL} alt={asset.data.originalfilename} style={{ width }} />;
    case 'mp4':
    case 'qt':
      return <video src={fileURL} controls style={{ width }} />;
    case 'pdf':
      return <Text>Preview not available</Text>;
    case 'yaml':
    case 'ts':
    case 'html':
    case 'css':
    case 'cpp':
    case 'c':
    case 'java':
    case 'r':
      // Download text file
      if (!fileURL) return <Text>Preview not available</Text>;
      const response = await fetch(fileURL);
      const text = await response.text();
      // return text area with text
      return <textarea style={{ width: width + 'px', height: '400px' }}>{text}</textarea>;

    default:
      return <Text>Preview not available</Text>;
  }
};

const formatSize = (sizeInBytes: number): string => {
  if (sizeInBytes >= 1024 * 1024) {
    return (sizeInBytes / (1024 * 1024)).toFixed(2) + ' MB';
  } else if (sizeInBytes >= 1024) {
    return (sizeInBytes / 1024).toFixed(2) + ' KB';
  } else {
    return sizeInBytes + ' Bytes';
  }
};
