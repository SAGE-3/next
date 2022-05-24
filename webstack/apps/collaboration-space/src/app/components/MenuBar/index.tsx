/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// Import react and modules
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

// Import Chakra UI elements
import {
  Box,
  Link,
  Flex,
  Text,
  useToast,
  // Menus
  MenuItem,
  Menu,
  MenuButton,
  Button,
  MenuGroup,
  MenuDivider,
  // Chakra Modal dialog
  useDisclosure,
  Tooltip,
  Icon,
} from '@chakra-ui/react';

// Import SAGE libraries
import { AppExport, AppState } from '@sage3/shared/types';
import { useAction, usePanZoom, useUser } from '@sage3/frontend/services';
import * as AppMetadata from '@sage3/app-metadata';
// import { UploadAppSelectorProps } from '@sage3/frontend/components';
import * as Apps from '@sage3/applications';

import { linkColor, linkHoverColor, localMenuColor, S3AppIcon, S3Menu, S3NestedMenu } from '@sage3/frontend/ui';
import FileManager from './FileManager';
import { Notifications } from '../../components/Notifications';

// Icons
import { MdOutlineHome } from 'react-icons/md';
import { MdLightbulbOutline, MdCheck } from 'react-icons/md';
import HideMenu from 'libs/frontend/components/src/lib/hide-menu/hide-menu';

const APPS = Apps as Record<keyof typeof Apps, AppExport>;

/**
 * The main menubar on top of the workspace board
 *
 * @export
 * @param {{ appList: string[] }} props
 * @returns {JSX.Element}
 */
export function MenuBarComponent(props: {
  appList: string[];
  apps: {
    [x: string]: AppState;
  };
  boardId: string;
  boardName: string;
  canvasSize: { width: number; height: number };
}): JSX.Element {
  const { act } = useAction();
  const { isOpen, onOpen, onClose } = useDisclosure({ id: 'filemanager' });
  const { isOpen: isOpenNotif, onOpen: onOpenNotif, onClose: onCloseNotif } = useDisclosure({ id: 'notifications' });
  const [panZoomState, dispatchPanZoom] = usePanZoom();
  const toast = useToast();
  const user = useUser();
  // Show all apps in dev mode, otherwise we filter them
  // Info comes from the building phase (webpack prod/dev)
  let production = true;
  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    production = false;
  }
  const moveToApp = (appInfo: AppState) => {
    // If board view is locked, display toast to notify
    if (panZoomState.isLocked) {
      toast({
        title: 'The board view is currently locked.',
        position: 'top',
        status: 'error',
        duration: 2 * 1000,
        isClosable: true,
      });
    } else {
      // Calculate zoom value
      const scaleW = (window.innerWidth / appInfo.position.width) * 0.9;
      const scaleH = (window.innerHeight / (appInfo.position.height + 30)) * 0.9;
      const zoomValue = Math.min(scaleW, scaleH);

      const x = appInfo.position.x + appInfo.position.width / 2;
      const y = appInfo.position.y + appInfo.position.height / 2;

      // Dispatch the new values
      dispatchPanZoom({ type: 'zoom-set', zoomValue });
      dispatchPanZoom({ type: 'translate-to', position: { x: -x, y: -y } });

      // Bring the app to the front
      act({
        type: 'raise',
        id: appInfo.id,
      });
    }
  };

  return (
    <HideMenu menuName="Action Menu" menuPosition="bottomLeft">
      <Box
        fontSize="large"
        background={localMenuColor()}
        zIndex="sticky"
        shadow="md"
        border="gray 2px solid"
        borderRadius="md"
        py={1}
        px={2}
        pr={'1.0rem'}
      >
        <Flex align="center">
          <Link as={RouterLink} to="/home">
            <Tooltip hasArrow={true} label={'Back to board list'} openDelay={400}>
              <Text
                color={linkColor()}
                fontWeight="bold"
                fontFamily="quicksand, sans-serif"
                fontSize="2xl"
                whiteSpace="nowrap"
                _hover={{ color: linkHoverColor() }}
              >
                <Icon boxSize={10} transform={'translate(0px,5px)'} as={MdOutlineHome}></Icon>
              </Text>
            </Tooltip>
          </Link>
          <S3Menu buttonLabel="Applications" showIcon={true} tooltip="Open New Applications">
            <MenuGroup title="Applications">
              <MenuDivider />
              {Object.keys(AppMetadata)
                .sort((a, b) => {
                  const nameA = AppMetadata[a as keyof typeof AppMetadata].description.toUpperCase();
                  const nameB = AppMetadata[b as keyof typeof AppMetadata].description.toUpperCase();
                  if (nameA < nameB) {
                    return -1;
                  }
                  if (nameA > nameB) {
                    return 1;
                  }
                  // names must be equal
                  return 0;
                })
                .filter((type) => {
                  // Select apps with the showInMenu flag, in production mode
                  if (production) return AppMetadata[type as keyof typeof AppMetadata].showInMenu;
                  else return true;
                })
                .map((type) => {
                  let userIsAlreadyScreensharing = false;
                  Object.keys(props.apps).forEach((appId: string) => {
                    if (
                      props.apps[appId].appName === type &&
                      props.apps[appId].info.createdBy.id === user.id &&
                      props.apps[appId].appName === 'screenshare'
                    ) {
                      userIsAlreadyScreensharing = true;
                    }
                  });
                  // const { MenuBarItem } = APPS[type as keyof typeof APPS];
                  return (
                    <MenuItem
                      key={type}
                      onClick={() => {
                        let wOffset = 150;
                        let hOffset = 100;
                        try {
                          const appType = type as keyof typeof AppMetadata;
                          wOffset = AppMetadata[appType].initialSize.width / 2;
                          hOffset = AppMetadata[appType].initialSize.height / 2 + 30;
                        } catch (e) {
                          console.trace(e);
                        }
                        let x = panZoomState.motionX.get() - window.innerWidth / panZoomState.motionScale.get() / 2 + wOffset;
                        let y = panZoomState.motionY.get() - window.innerHeight / panZoomState.motionScale.get() / 2 + hOffset;
                        x = Math.max(0, Math.min(props.canvasSize.width - wOffset * 2, -x));
                        y = Math.max(24, Math.min(props.canvasSize.height - hOffset * 2, -y)); // 24 is space for the Window title bar
                        if (userIsAlreadyScreensharing) {
                          toast({
                            title: 'You are already screensharing.',
                            status: 'error',
                            duration: 5000,
                            isClosable: true,
                          });
                        } else {
                          act({
                            type: 'create',
                            appName: type,
                            id: '',
                            position: {
                              x: x,
                              y: y,
                            },
                          });
                        }
                      }}
                    >
                      {AppMetadata[type as keyof typeof AppMetadata].description
                        ? AppMetadata[type as keyof typeof AppMetadata].description
                        : AppMetadata[type as keyof typeof AppMetadata].name}
                      {userIsAlreadyScreensharing ? <S3AppIcon color="green" icon={MdCheck} /> : null}
                    </MenuItem>
                  );
                })}
            </MenuGroup>
          </S3Menu>

          {/* Asset Manager */}
          <S3Menu buttonLabel="Assets" tooltip="Open Asset Manager" showIcon={true} onClick={onOpen} children={null} />
          {/* Opened Apps */}
          <S3Menu buttonLabel="Opened Applications" tooltip="List of Opened Applications" showIcon={false}>
            <MenuGroup title={Object.keys(props.apps).length === 0 ? 'There are currently no opened applications.' : 'Opened Applications'}>
              {Object.keys(props.apps).length === 0
                ? null
                : consolidateOpenedApps(props.apps).map((apps: AppState[], index: number) => {
                    return <S3NestedMenu key={apps[0].id} moveToApp={moveToApp} apps={apps} />;
                  })}
            </MenuGroup>
          </S3Menu>

          {/* Notification Center button */}
          <Menu flip={false} placement="top">
            <Tooltip hasArrow={true} label="Open the notification center" openDelay={400}>
              <MenuButton ml={1} as={Button} colorScheme="teal" size="sm" onClick={onOpenNotif}>
                <MdLightbulbOutline style={{ fontSize: '1.25rem', display: 'inline-flex', marginRight: 1, verticalAlign: 'middle' }} />
                Activity
              </MenuButton>
            </Tooltip>
          </Menu>

          {/* Asset Manager as Modal dialog */}
          <FileManager boardId={props.boardId} isOpen={isOpen} onClose={onClose} zoomState={panZoomState} canvasSize={props.canvasSize} />

          {/* Notification Center */}
          <Notifications isOpen={isOpenNotif} onClose={onCloseNotif} boardId={props.boardId} />
        </Flex>
      </Box>
    </HideMenu>
  );
}

/**
 * consolidateOpenedApps
 * @param apps
 * @returns
 */
function consolidateOpenedApps(apps: any) {
  // Getting the app UUIDS
  const appKeys = Object.keys(apps);
  let tmpApps = [];

  // Creating an array of appInfo
  for (let i = 0; i < appKeys.length; i++) {
    tmpApps.push(apps[appKeys[i]]);
  }

  // Consolidating apps
  tmpApps = tmpApps.reduce((r, a) => {
    r[a.appName] = r[a.appName] || [];
    r[a.appName].push(a);
    return r;
  }, Object.create(null));
  const tmp = Object.keys(tmpApps);
  const tmpArray = [];
  for (let i = 0; i < tmp.length; i++) {
    tmpArray.push(tmpApps[tmp[i]]);
  }

  return tmpArray;
}

export const MenuBar = React.memo(MenuBarComponent);
