/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { useState, useEffect } from 'react';
import { Box, Heading, Tooltip, Text, useColorModeValue, IconButton, Image, Spacer } from '@chakra-ui/react';
import { MdDownload } from 'react-icons/md';

// Utility functions from SAGE3
import { useAssetStore, isUUIDv4, useUsersStore, truncateWithEllipsis, downloadFile, apiUrls } from '@sage3/frontend';
import { Asset } from '@sage3/shared/types';
import { humanFileSize } from '@sage3/shared';

/* App component for AssetLink */
type AssetLinkProps = {
  assetid: string;
};

export function AssetCard(props: AssetLinkProps): JSX.Element {
  const assets = useAssetStore((state) => state.assets);

  // Asset data structure
  const [file, setFile] = useState<Asset>();
  const [owner, setOwner] = useState<string>('');
  const [filename, setFilename] = useState<string>('');
  // Image
  const logoUrl = useColorModeValue('/assets/background-boardlink-dark.png', '/assets/background-boardlink.png');

  // UI Stuff
  const dividerColor = useColorModeValue('gray.300', 'gray.600');

  const linearBGColor = useColorModeValue(
    `linear-gradient(178deg, #ffffff, #fbfbfb, #f3f3f3)`,
    `linear-gradient(178deg, #303030, #252525, #262626)`
  );

  // Convert the ID to an asset
  useEffect(() => {
    const isUUID = isUUIDv4(props.assetid);
    if (isUUID) {
      const myasset = assets.find((a) => a._id === props.assetid);
      if (myasset) {
        setFile(myasset);
        const owner = useUsersStore.getState().users.find((u) => u._id === myasset.data.owner);
        if (owner) setOwner(owner?.data.name || 'Unknown');
        setFilename(truncateWithEllipsis(myasset.data.originalfilename, 50));
      }
    }
  }, [props.assetid, assets]);

  const downloadAsset = () => {
    if (file) {
      const filename = file.data.originalfilename;
      const fileURL = apiUrls.assets.getAssetById(file.data.file);
      downloadFile(fileURL, filename);
    }
  };

  return (
    <Box width="100%" height="100%" display="flex" flexDir="column" justifyContent={'center'} alignItems={'center'}>

      <Box
        width="400px"
        height="250px"
        backgroundSize="contain"
        p="2"
        backgroundColor={`orange.400`}
        display="flex"
        alignItems="center"
        justifyContent="center"
        textAlign={'center'}
        flexDir={'column'}
      >
        <Text fontSize="2xl" mb="2" color="white" fontWeight="bold">
          {filename}
        </Text>
        <Text fontSize="lg" mb="2" color="white">
          Size: {humanFileSize(file?.data.size || 0)}
        </Text>
        <Text fontSize="lg" mb="2" color="white">
          Type: {file?.data.mimetype}
        </Text>
        <Text fontSize="lg" mb="2" color="white">
          Owner: {owner}
        </Text>
      </Box>

      {/* Info Sections */}
      <Box
        display="flex"
        flexDir={'column'}
        justifyContent={'space-between'}
        height="125px"
        width="400px"
        p="3"
        pt="1"
        borderTop="solid 4px"
        borderColor={dividerColor}
        background={linearBGColor}
      >
        <Box width="100%" display="flex" justifyContent={'space-between'}>
          <Box width="100%">
            <Heading size="lg" whiteSpace="nowrap" textOverflow="ellipsis" overflow="hidden" width="100%">
              {filename}
            </Heading>
            <Text whiteSpace="nowrap" textOverflow="ellipsis" overflow="hidden" width="100%" size="md">
              {file?.data.mimetype}
            </Text>
          </Box>
        </Box>

        <Box width="100%" display="flex" justifyContent={'left'}></Box>

        <Box display="flex" justifyContent={'space-between'}>
          <Box display="flex">
            <Tooltip label="Download" openDelay={500} hasArrow placement="top">
              <IconButton variant="solid" size="sm" onClick={downloadAsset} aria-label={'Refresh'} icon={<MdDownload />} />
            </Tooltip>
            <Text size="xss" transform={'translateY(4px)'} ml="2">
              Download
            </Text>
          </Box>

          <Spacer />

          <Box>
            <Image height="32px" src={logoUrl}></Image>
          </Box>

        </Box>
      </Box>
    </Box>
  );
}
