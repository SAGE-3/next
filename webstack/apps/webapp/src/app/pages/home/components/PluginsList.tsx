/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import {
  Box,
  useColorModeValue,
  VStack,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  HStack,
  useDisclosure,
  IconButton,
  Tooltip,
  Tag,
} from '@chakra-ui/react';
import { useHexColor, usePluginStore, ConfirmModal, useUser, PluginUploadModal, useAbility } from '@sage3/frontend';
import { fuzzySearch } from '@sage3/shared';
import { Plugin, Room } from '@sage3/shared/types';
import { useEffect, useState } from 'react';
import { HiTrash } from 'react-icons/hi';
import { MdAdd, MdPerson, MdSearch } from 'react-icons/md';

// PluginsList Props
export interface PluginsListProps {
  room: Room;
}

export function PluginsList(props: PluginsListProps): JSX.Element {
  // User Info
  const { user } = useUser();
  const isRoomOwner = user?._id == props.room._createdBy;

  // Plugins
  const plugins = usePluginStore((state) => state.plugins);
  const deletePlugin = usePluginStore((state) => state.delete);

  // State
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [pluginsSearch, setPluginsSearch] = useState<string>('');
  const [showOnlyYours, setShowOnlyYours] = useState(false);
  const handleShowOnlyYours = () => setShowOnlyYours(!showOnlyYours);

  // Permissions
  const canDeleteSelectedPlugin = selectedPlugin?.data.ownerId == user?._id || isRoomOwner;
  const canUploadPlugin = useAbility('upload', 'plugins');

  // Modal Disclosure
  const { isOpen: deleteIsOpen, onOpen: deleteOnOpen, onClose: deleteOnClose } = useDisclosure();
  const { isOpen: uploadIsOpen, onOpen: uploadOnOpen, onClose: uploadOnClose } = useDisclosure();

  function filterPlugins(plugin: Plugin) {
    const hasRoomId = plugin.data.roomId;

    if (!hasRoomId) return false;
    const filterYours = showOnlyYours ? plugin.data.ownerId === user?._id : true;
    return plugin.data.roomId === props.room._id && filterYours;
  }

  function searchPluginsFilter(plugin: Plugin) {
    if (pluginsSearch === '') return true;
    const searchString = plugin.data.name + ' ' + plugin.data.description + ' ' + plugin.data.ownerName;
    return fuzzySearch(searchString, pluginsSearch);
  }

  function handlePluginClick(plugin: Plugin) {
    setSelectedPlugin(plugin);
  }

  function handlePluginDelete() {
    if (selectedPlugin) {
      deletePlugin(selectedPlugin._id);
      setSelectedPlugin(null);
    }
    deleteOnClose();
  }

  useEffect(() => {
    // Reset selected plugin when the room changes
    setSelectedPlugin(null);
  }, [props.room._id]);

  return (
    <Box display="flex" gap="8">
      <ConfirmModal
        isOpen={deleteIsOpen}
        onClose={deleteOnClose}
        onConfirm={handlePluginDelete}
        title={'Plugin Delete'}
        message={`Are you sure you want to delete ${selectedPlugin?.data.name}?`}
      />
      <PluginUploadModal roomId={props.room._id} isOpen={uploadIsOpen} onOpen={uploadOnOpen} onClose={uploadOnClose} />
      <Box height="calc(100vh - 300px)" width="500px" overflowY="auto" overflowX="hidden">
        <VStack width="100%" px="4" gap="3">
          <Box display="flex" justifyContent="start" alignItems="center" width="100%" gap="2">
            <Tooltip label="Add Plugin" aria-label="upload plugin" placement="top" hasArrow>
              <IconButton
                size="md"
                variant={'outline'}
                colorScheme={'teal'}
                aria-label="plugin-upload"
                fontSize="xl"
                icon={<MdAdd />}
                isDisabled={!canUploadPlugin}
                onClick={uploadOnOpen}
              ></IconButton>
            </Tooltip>

            <InputGroup size="md" flex="1" my="1">
              <InputLeftElement pointerEvents="none">
                <MdSearch />
              </InputLeftElement>
              <Input placeholder="Search Plugins" value={pluginsSearch} onChange={(e) => setPluginsSearch(e.target.value)} />
            </InputGroup>
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

          {plugins
            .filter(filterPlugins)
            .filter(searchPluginsFilter)
            .sort((a, b) => a.data.name.localeCompare(b.data.name))
            .map((plugin) => (
              <PluginItem
                key={plugin._id}
                plugin={plugin}
                onClick={handlePluginClick}
                isOwner={plugin.data.ownerId == user?._id}
                selected={selectedPlugin ? selectedPlugin._id === plugin._id : false}
              />
            ))}
        </VStack>
      </Box>
      {selectedPlugin && (
        <Box height="calc(100vh - 300px)" width="500px" overflowY="auto" overflowX="hidden">
          <Box height="100%" width="100%" display="flex" flexDir="column">
            <HStack gap="8" mb="4">
              <VStack alignItems={'start'} fontWeight={'bold'}>
                <Text>Name</Text>
                <Text>Description</Text>
                <Text>Author</Text>
                <Text>Uploaded At</Text>
              </VStack>
              <VStack alignItems={'left'}>
                <Text textAlign={'left'}>{selectedPlugin.data.name}</Text>
                <Text>{selectedPlugin.data.description}</Text>
                <Text>{selectedPlugin.data.ownerName}</Text>
                <Text>{getHumanReadableDate(selectedPlugin._createdAt)}</Text>
              </VStack>
            </HStack>
            <Box minHeight="50px">
              <Tooltip
                label={canDeleteSelectedPlugin ? 'Delete Plugin' : 'Only the Plugin Author and Room Owner can delete this plugin.'}
                aria-label="Delete Plugin"
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
                  isDisabled={!canDeleteSelectedPlugin}
                  onClick={deleteOnOpen}
                >
                  Delete
                </IconButton>
              </Tooltip>
            </Box>
            <Box width="100%" height="500px" overflow="hidden" borderRadius="md">
              <iframe loading="eager" src={`/plugins/apps/${selectedPlugin.data.name}`} style={{ width: '100%', height: '100%' }}></iframe>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}

interface PluginItemProps {
  plugin: Plugin;
  selected: boolean;
  isOwner: boolean;
  onClick: (plugin: Plugin) => void;
}

function PluginItem(props: PluginItemProps): JSX.Element {
  const backgroundColorValue = useColorModeValue('#ffffff', `gray.800`);
  const backgroundColor = useHexColor(backgroundColorValue);

  const borderColorValue = useColorModeValue(`teal.600`, `teal.200`);
  const borderColor = useHexColor(borderColorValue);
  const subTextValue = useColorModeValue('gray.700', 'gray.300');
  const subText = useHexColor(subTextValue);
  const grayedOutColorValue = useColorModeValue('gray.100', 'gray.700');
  const grayedOutColor = useHexColor(grayedOutColorValue);

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
      onClick={() => props.onClick(props.plugin)}
      cursor="pointer"
    >
      <Box display="flex" flexDir="column" maxWidth="260px">
        <Box overflow="hidden" textOverflow={'ellipsis'} whiteSpace={'nowrap'} mr="2" fontSize="lg" fontWeight={'bold'}>
          {props.plugin.data.name}
        </Box>
        <Box overflow="hidden" textOverflow={'ellipsis'} whiteSpace={'nowrap'} mr="2" fontSize="xs" color={subText}>
          {props.plugin.data.description}
        </Box>
      </Box>
      <Box display="flex" alignItems={'center'}>
        {props.isOwner ? (
          <Tag colorScheme="teal" size="md">
            Owner
          </Tag>
        ) : (
          <Tag colorScheme="yellow" size="md">
            {props.plugin.data.ownerName}
          </Tag>
        )}
      </Box>
    </Box>
  );
}

// Human Readable Date from UTC Timestamp
function getHumanReadableDate(utcTimestamp: number): string {
  return new Date(utcTimestamp).toLocaleString();
}
