/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useColorModeValue, VStack, Tooltip, Box, Badge, Text } from '@chakra-ui/react';
import { useAppStore, usePluginStore, useUIStore, useUser } from '@sage3/frontend';
import { format } from 'date-fns';
import { ButtonPanel, Panel } from '../Panel';

export interface PluginProps {
  boardId: string;
  roomId: string;
}

/**
 * Panel to show all the Server's plugins and allow the users to create new apps from them
 * @param props
 * @returns
 */
export function PluginsPanel(props: PluginProps) {
  // Plugin store. Sort them by name.
  const plugins = usePluginStore((state) => state.plugins);
  plugins.sort((a, b) => a.data.name.localeCompare(b.data.name));

  // App Store
  const createApp = useAppStore((state) => state.create);
  // User
  const { user } = useUser();

  // UI store
  const boardPosition = useUIStore((state) => state.boardPosition);
  const scale = useUIStore((state) => state.scale);
  const gripColor = useColorModeValue('#c1c1c1', '#2b2b2b');

  // Create a new app from a plugin
  const newApplication = (pluginName: string) => {
    if (!user) return;

    const x = Math.floor(-boardPosition.x + window.innerWidth / 2 / scale - 200);
    const y = Math.floor(-boardPosition.y + window.innerHeight / 2 / scale - 200);
    // Setup initial size
    let w = 400;
    let h = 400;

    createApp({
      title: pluginName,
      roomId: props.roomId,
      boardId: props.boardId,
      position: { x, y, z: 0 },
      size: { width: w, height: h, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'PluginApp',
      state: { pluginName },
      raised: true,
    });
  };

  return (
    <Panel title={'Plugins'} name="plugins" width={0} showClose={false}>
      <VStack
        maxH={300}
        w={'100%'}
        m={0}
        pr={2}
        spacing={1}
        overflow="auto"
        css={{
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            width: '6px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: gripColor,
            borderRadius: 'md',
          },
        }}
      >
        {plugins
          // create a button for each application
          .map((plugin) => {
            const name = plugin.data.name.charAt(0).toUpperCase() + plugin.data.name.slice(1);
            const date = format(new Date(Number(plugin.data.dateCreated)), 'MM/dd/yyyy hh:mm');

            return (
              <Tooltip
                key={plugin._id}
                shouldWrapChildren
                hasArrow={true}
                p="2"
                openDelay={500}
                borderRadius="8px"
                placement="right"
                label={
                  <Box>
                    <Badge variant="solid" colorScheme="teal">
                      Name
                    </Badge>
                    <br />
                    <Text whiteSpace={'nowrap'}> {name}</Text>

                    <Badge variant="solid" colorScheme="teal">
                      Description
                    </Badge>
                    <br />
                    <Text whiteSpace={'nowrap'}> {plugin.data.description}</Text>

                    <Badge variant="solid" colorScheme="teal">
                      Creator
                    </Badge>
                    <br />
                    <Text whiteSpace={'nowrap'}> {plugin.data.ownerName}</Text>

                    <Badge variant="solid" colorScheme="teal">
                      Uploaded
                    </Badge>
                    <br />
                    <Text whiteSpace={'nowrap'}> {date}</Text>
                  </Box>
                }
              >
                <ButtonPanel
                  title={name}
                  style={{ width: '175px', overflow: 'hidden' }}
                  // disable dragging for now since it doesnt work for plugins
                  candrag={'false'}
                  onClick={() => newApplication(plugin.data.name)}
                />
              </Tooltip>
            );
          })}
      </VStack>
    </Panel>
  );
}
