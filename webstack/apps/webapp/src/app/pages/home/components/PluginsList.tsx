/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState } from 'react';
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

import { HiTrash } from 'react-icons/hi';
import { MdAdd, MdPerson, MdPersonOff, MdSearch } from 'react-icons/md';

import { fuzzySearch } from '@sage3/shared';
import { Plugin, Room } from '@sage3/shared/types';
import {
  useHexColor,
  usePluginStore,
  ConfirmModal,
  useUser,
  PluginUploadModal,
  useAbility,
  formatDateAndTime,
  truncateWithEllipsis,
} from '@sage3/frontend';

// PluginsList Props
export interface PluginsListProps {
  room: Room;
}

export function PluginsList(props: PluginsListProps): JSX.Element {
  // User Info
  const { user } = useUser();

  // Plugins
  const plugins = usePluginStore((state) => state.plugins);
  const deletePlugin = usePluginStore((state) => state.delete);

  // State
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [pluginsSearch, setPluginsSearch] = useState<string>('');
  const [showOnlyYours, setShowOnlyYours] = useState(false);
  const handleShowOnlyYours = () => setShowOnlyYours(!showOnlyYours);

  // Permissions
  const canDeleteSelectedPlugin = !!user && selectedPlugin?.data.ownerId === user._id;
  const canUploadPlugin = useAbility('upload', 'plugins');

  // Modal Disclosure
  const { isOpen: deleteIsOpen, onOpen: deleteOnOpen, onClose: deleteOnClose } = useDisclosure();
  const { isOpen: uploadIsOpen, onOpen: uploadOnOpen, onClose: uploadOnClose } = useDisclosure();

  // Scrollbar Style
  const scrollBarValue = useColorModeValue('gray.300', '#666666');
  const scrollBarColor = useHexColor(scrollBarValue);
  const searchPlaceholderColorValue = useColorModeValue('gray.400', 'gray.100');
  const searchPlaceholderColor = useHexColor(searchPlaceholderColorValue);
  const searchBarColorValue = useColorModeValue('gray.100', '#2c2c2c');
  const searchBarColor = useHexColor(searchBarColorValue);

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
      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteIsOpen}
        onClose={deleteOnClose}
        onConfirm={handlePluginDelete}
        title={'Plugin Delete'}
        message={`Delete ${selectedPlugin?.data.package?.manifest.name ?? selectedPlugin?.data.name}? This deletes its shared extension state and approvals. Board apps and native notes remain, but its extension views become unavailable. Disable it on the board instead to preserve all saved data.`}
      />
      {/* Plugin Upload Modal */}
      <PluginUploadModal roomId={props.room._id} isOpen={uploadIsOpen} onOpen={uploadOnOpen} onClose={uploadOnClose} />
      <Box width="500px">
        <Box display="flex" justifyContent="start" alignItems="center" width="100%" gap="2" mb="3" px="2">
          <Tooltip label="Add Plugin" aria-label="upload plugin" placement="top" hasArrow>
            <IconButton
              size="sm"
              bg="none"
              aria-label="plugin-upload"
              fontSize="xl"
              icon={<MdAdd fontSize="24px" />}
              _hover={{ transform: 'scale(1.1)', bg: 'none' }}
              isDisabled={!canUploadPlugin}
              onClick={uploadOnOpen}
            ></IconButton>
          </Tooltip>

          <InputGroup size="md" flex="1" my="1">
            <InputLeftElement pointerEvents="none">
              <MdSearch />
            </InputLeftElement>
            <Input
              placeholder="Search Plugins"
              value={pluginsSearch}
              onChange={(e) => setPluginsSearch(e.target.value)}
              roundedTop="2xl"
              _focusVisible={{ bg: searchBarColor, outline: 'none', transition: 'none' }}
              bg="inherit"
              roundedBottom="2xl"
              _placeholder={{ opacity: 0.7, color: searchPlaceholderColor }}
            />
          </InputGroup>
          <Tooltip label="Filter Yours" aria-label="filter your plugins" placement="top" hasArrow>
            <IconButton
              size="sm"
              bg="none"
              aria-label="filter-yours"
              fontSize="xl"
              icon={showOnlyYours ? <MdPerson fontSize="24px" /> : <MdPersonOff fontSize="24px" />}
              _hover={{ transform: 'scale(1.1)', bg: 'none' }}
              onClick={handleShowOnlyYours}
            ></IconButton>
          </Tooltip>
        </Box>
        <VStack
          height="calc(100svh - 275px)"
          width="100%"
          gap="2"
          overflowY="auto"
          overflowX="hidden"
          px="2"
          userSelect={'none'}
          css={{
            '&::-webkit-scrollbar': {
              background: 'transparent',
              width: '5px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: scrollBarColor,
              borderRadius: '48px',
            },
          }}
        >
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
        <Box height="calc(100vh - 260px)" width="500px" overflowY="auto" overflowX="hidden">
          <Box height="100%" width="100%" display="flex" flexDir="column">
            <HStack gap="8" mb="4">
              <VStack alignItems={'start'} fontWeight={'bold'}>
                <Text>Name</Text>
                <Text>Description</Text>
                <Text>Owner</Text>
                <Text>Uploaded</Text>
              </VStack>
              <VStack alignItems={'left'}>
                <Text textAlign={'left'}>{selectedPlugin.data.name}</Text>
                <Text>{selectedPlugin.data.description}</Text>
                <Text>{selectedPlugin.data.ownerName}</Text>
                <Text>{formatDateAndTime(Number(selectedPlugin.data.dateCreated))}</Text>
              </VStack>
            </HStack>
            <Box minHeight="50px">
              <Tooltip
                label={
                  canDeleteSelectedPlugin
                    ? 'Delete Plugin'
                    : 'Only the plugin author can delete this package. The room owner can disable it on a board.'
                }
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
                />
              </Tooltip>
            </Box>
            <VStack align="stretch" spacing="3" mt="4">
              <Tag alignSelf="start" colorScheme={selectedPlugin.data.package ? 'teal' : 'orange'}>
                {selectedPlugin.data.package ? 'Package available' : 'Unavailable: manifest package required'}
              </Tag>
              <Text fontSize="sm">
                Packages do not run here. The room owner can review capabilities and enable this plugin from a board's Plugins menu.
                Disabling a plugin preserves its apps and saved data.
              </Text>
              {selectedPlugin.data.package && (
                <>
                  <Text>
                    Package: {selectedPlugin.data.package.manifest.id} · API {selectedPlugin.data.package.manifest.apiVersion}
                  </Text>
                  <Text fontWeight="bold">Requested capabilities</Text>
                  <Text>
                    {selectedPlugin.data.package.manifest.capabilities.join(', ') || 'None (own plugin state and app content only)'}
                  </Text>
                  <Text fontWeight="bold">Commands</Text>
                  <Text>
                    {selectedPlugin.data.package.manifest.commands?.map((command) => command.title).join(', ') || 'None'}
                  </Text>
                  <Text fontWeight="bold">Views</Text>
                  <Text>
                    {selectedPlugin.data.package.manifest.views
                      ?.map((view) => `${view.title} (${view.kind})`)
                      .join(', ') || 'None'}
                  </Text>
                </>
              )}
            </VStack>
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
  const baseBorderColorValue = useColorModeValue('gray.200', 'gray.700');
  const baseBorderColor = useHexColor(baseBorderColorValue);
  const subTextValue = useColorModeValue('gray.700', 'gray.300');
  const subText = useHexColor(subTextValue);

  const name = props.plugin.data.name;
  const ownerName = truncateWithEllipsis(props.plugin.data.ownerName, 9);
  const dateAdded = formatDateAndTime(props.plugin._createdAt);
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
      border={`solid 1px ${props.selected ? borderColor : baseBorderColor}`}
      transform={props.selected ? 'scale(1.02)' : 'scale(1)'}
      _hover={{ border: `solid 2px ${borderColor}`, transform: 'scale(1.02)' }}
      transition={'all 0.2s ease-in-out'}
      onClick={() => props.onClick(props.plugin)}
      cursor="pointer"
    >
      <Box display="flex" flexDir="column" maxWidth="325px">
        <Box overflow="hidden" textOverflow={'ellipsis'} whiteSpace={'nowrap'} mr="2" fontSize="sm" fontWeight={'bold'}>
          {name}
        </Box>
        <Box overflow="hidden" textOverflow={'ellipsis'} whiteSpace={'nowrap'} mr="2" fontSize="xs" color={subText}>
          {dateAdded}
        </Box>
      </Box>
      <Box display="flex" width="80px">
        {props.isOwner ? (
          <Tag colorScheme="teal" size="sm" width="100%" justifyContent="center">
            Owner
          </Tag>
        ) : (
          <Tag colorScheme="yellow" size="sm" width="100%" whiteSpace="nowrap" overflow="hidden" justifyContent="center">
            {ownerName}
          </Tag>
        )}
      </Box>
    </Box>
  );
}
