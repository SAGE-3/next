/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, Button, Select, useDisclosure } from '@chakra-ui/react';
import { AssetModal, UploadModal, useAppStore, useUIStore, useUser } from '@sage3/frontend';
import { Applications, initialValues } from '@sage3/applications/apps';
import { AppName, AppState } from '@sage3/applications/schema';
import { MiniMap } from './Minimap';

type FooterProps = {
  boardId: string;
  roomId: string;
};

/**
 * Header component
 *
 * @export
 * @param {HeaderProps} props
 * @returns
 */
export function BoardFooter(props: FooterProps) {
  // User information
  const { user } = useUser();

  // App Store
  const createApp = useAppStore((state) => state.create);
  const apps = useAppStore((state) => state.apps);

  // UI Store
  const selectedApp = useUIStore((state) => state.selectedAppId);




  return (
    <Box display="flex" width="100vw" p={2} position="absolute" bottom="0" justifyContent="space-between" pointerEvents={"none"}>
      <Box display="flex" justifyContent="left" alignItems="end">

        {/* App Toolbar - TODO - Temporary location for right now*/}
        <Box alignItems="center" mx="1" backgroundColor="gray" p="2">
          {apps
            .filter((el) => el._id === selectedApp)
            .map((app) => {
              const Component = Applications[app.data.type].ToolbarComponent;
              return <Component key={app._id} {...app}></Component>;
            })}
        </Box>

      </Box>
      <Box display="flex" alignContent={'end'} justifyContent="right">
        <MiniMap/>
      </Box>
    </Box>
  );
}
