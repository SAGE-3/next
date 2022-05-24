/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useEffect, useState } from 'react';
import { AppState } from '../../../../shared/types/src/lib/state/state';

// Chakra imports
import {
  Menu,
  MenuProps,
  MenuList,
  MenuButton,
  Button,
  Tooltip,
  Text,
  Icon,
  MenuGroup,
  MenuItem,
  Spinner,
  Box,
  IconButton,
} from '@chakra-ui/react';
import * as Apps from '@sage3/applications';

import { MdAdd, MdArrowRight } from 'react-icons/md';
import { AppExport } from '@sage3/shared/types';
import { FaTimes } from 'react-icons/fa';
import { truncateWithEllipsis } from '@sage3/frontend/utils/misc';

export interface S3NestedMenuProps extends MenuProps {
  buttonLabel: string;
  tooltip: string;
  showIcon: boolean;
  apps: {
    [x: string]: AppState;
  };
  onClick?: () => void;
}

export interface SubmenuProps extends MenuProps {
  label: string;
  onClick?: () => void;
}
const APPS = Apps as Record<keyof typeof Apps, AppExport>;

/**
 * Menu Button for Applications, Assets, and Opened Applications buttons
 * Used to customize look of buttons on Menu bar component
 * @param props
 * @returns JSX.Element
 */
export function S3NestedMenu(props: { apps: AppState[]; moveToApp: (appInfo: AppState) => void }) {
  const { MenuBarItem, __meta__ } = APPS[props.apps[0].appName as keyof typeof APPS];

  const { act } = useAction();

  const appNameWithEllipsis = (appName: string): string => {
    const str = truncateWithEllipsis(appName, 40);
    return str;
  };

  return (
    <Box>
      <Menu flip={false} placement="right-end" size="sm">
        <Tooltip hasArrow={true} openDelay={400}>
          <MenuButton width="full" onClick={(event: any) => event.stopPropagation()}>
            <React.Suspense fallback={<Spinner />}>
              <div key={'menuitem' + props.apps[0].id}>
                <span>
                  {MenuBarItem ? (
                    <>
                      <Box float="left" transform={'translate(13px,0px)'}>
                        <MenuBarItem {...props.apps[0]} __meta__={__meta__} showInfo={false} showIcon={true} />
                        {` ${props.apps[0].appName}`}
                      </Box>
                      <Icon boxSize="24px" float="right" transform={'translate(-15px,0)'} as={MdArrowRight} />
                    </>
                  ) : null}
                </span>
              </div>
            </React.Suspense>
          </MenuButton>
        </Tooltip>
        <MenuList transform="translate(-10px,0px) !important" maxH="25vh" overflowY="auto">
          <MenuGroup>
            {props.apps.map((app, index) => {
              const { MenuBarItem, __meta__ } = APPS[app.appName as keyof typeof APPS];
              return (
                <Box key={app.id} position="relative" h="3rem" w="100%">
                  <React.Suspense fallback={<Spinner />}>
                    <Button
                      textAlign={'left'}
                      w="full"
                      h="full"
                      position="absolute"
                      display="inline-block"
                      onClick={() => props.moveToApp(app)}
                    >
                      <div key={'menuitem' + app.id}>
                        <span>{MenuBarItem ? <MenuBarItem {...app} __meta__={__meta__} showInfo={true} showIcon={false} /> : null}</span>
                      </div>
                    </Button>
                    <Tooltip hasArrow={true} openDelay={400} label="Close App">
                      <Button
                        display="inline-block"
                        size="sm"
                        position="absolute"
                        bottom="2"
                        right="3"
                        colorScheme={'red'}
                        onClick={(e) => {
                          // POPULATE THE ACTION OUT
                          // e.stopPropagation();
                          // act({
                          //   type: 'close',
                          //   id: app.id,
                          // });
                        }}
                        transform="translate(5px,0px)"
                      >
                        <FaTimes />
                      </Button>
                    </Tooltip>{' '}
                  </React.Suspense>
                </Box>
              );
            })}
          </MenuGroup>
        </MenuList>
      </Menu>
    </Box>
  );
}
