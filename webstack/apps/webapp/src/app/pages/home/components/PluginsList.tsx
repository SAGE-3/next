/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { Box, Flex, useColorModeValue, VStack, Text, Input, InputGroup, InputLeftElement } from '@chakra-ui/react';
import { useHexColor, usePluginStore } from '@sage3/frontend';
import { fuzzySearch } from '@sage3/shared';
import { Plugin } from '@sage3/shared/types';
import { useEffect, useState } from 'react';
import { MdSearch } from 'react-icons/md';

// PluginsList Props
export interface PluginsListProps {
  roomId: string;
}

export function PluginsList(props: PluginsListProps): JSX.Element {
  // A random list of a 100 numbers
  const testList = Array.from({ length: 100 }, () => Math.floor(Math.random() * 100));

  const scrollBarValue = useColorModeValue('gray.300', '#666666');
  const scrollBarColor = useHexColor(scrollBarValue);

  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);

  const [pluginsSearch, setPluginsSearch] = useState<string>('');

  const plugins = usePluginStore((state) => state.plugins);

  function filterPlugins(plugin: Plugin) {
    const hasRoomId = plugin.data.roomId;
    if (!hasRoomId) return false;
    return plugin.data.roomId === props.roomId;
  }

  function searchPluginsFilter(plugin: Plugin) {
    if (pluginsSearch === '') return true;
    return fuzzySearch(plugin.data.name + ' ' + plugin.data.description, pluginsSearch);
  }

  function handlePluginClick(plugin: Plugin) {
    setSelectedPlugin(plugin);
  }

  useEffect(() => {
    // Reset selected plugin when the room changes
    setSelectedPlugin(null);
  }, [props.roomId]);

  return (
    <Box display="flex" gap="8px">
      <Box height="calc(100vh - 300px)" width="400px" overflowY="auto" overflowX="hidden">
        <VStack width="100%">
          <InputGroup size="md" width="100%" my="1">
            <InputLeftElement pointerEvents="none">
              <MdSearch />
            </InputLeftElement>
            <Input placeholder="Search Plugins" value={pluginsSearch} onChange={(e) => setPluginsSearch(e.target.value)} />
          </InputGroup>
          {plugins
            .filter(filterPlugins)
            .filter(searchPluginsFilter)
            .sort((a, b) => a.data.name.localeCompare(b.data.name))
            .map((plugin) => (
              <PluginItem
                key={plugin._id}
                plugin={plugin}
                onClick={handlePluginClick}
                selected={selectedPlugin ? selectedPlugin._id === plugin._id : false}
              />
            ))}
        </VStack>
      </Box>
      {selectedPlugin && (
        <Box height="calc(100vh - 300px)" width="500px" overflowY="auto" overflowX="hidden">
          <Box height="100%" width="100%" display="flex" flexDir="column">
            <VStack justifyContent={'left'} mb="4">
              <Text textAlign={'left'}>{selectedPlugin.data.name}</Text>
              <Text>{selectedPlugin.data.description}</Text>

              <Text>{getHumanReadableDate(selectedPlugin._createdAt)}</Text>
            </VStack>
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
  onClick: (plugin: Plugin) => void;
}

function PluginItem(props: PluginItemProps): JSX.Element {
  const linearBGColor = useColorModeValue(
    `linear-gradient(178deg, #ffffff, #fbfbfb, #f3f3f3)`,
    `linear-gradient(178deg, #303030, #252525, #262626)`,
  );

  const color = props.selected ? 'teal' : 'gray';
  const hexColor = useHexColor(color);
  return (
    <Box
      background={linearBGColor}
      p="1"
      px="2"
      width="100%"
      height="50px"
      display="flex"
      justifyContent={'space-between'}
      alignItems={'center'}
      borderRadius="md"
      boxSizing="border-box"
      border={`solid 1px ${hexColor}`}
      borderLeft={`solid 8px ${hexColor}`}
      transition={'all 0.2s ease-in-out'}
      onClick={() => props.onClick(props.plugin)}
      cursor="pointer"
    >
      {props.plugin.data.name}
    </Box>
  );
}

// Human Readable Date from UTC Timestamp
function getHumanReadableDate(utcTimestamp: number): string {
  return new Date(utcTimestamp).toLocaleString();
}
