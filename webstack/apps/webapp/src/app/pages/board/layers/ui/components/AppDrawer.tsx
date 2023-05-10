/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import {
  useDisclosure,
  Drawer,
  Button,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
  Text,
  DrawerFooter,
  Box,
} from '@chakra-ui/react';
import { AppError, Applications } from '@sage3/applications/apps';
import { App } from '@sage3/applications/schema';
import { useAppStore } from '@sage3/frontend';
import {} from 'openseadragon';
import { Component, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

type AppDrawerProps = {};

/**
 * AppToolbar Component
 *
 * @export
 * @param {AppToolbarProps} props
 * @returns
 */
export function AppDrawer(props: AppDrawerProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [placement, setPlacement] = useState<'right' | 'left' | 'bottom' | 'top'>('right');

  const togglePlacement = () => {
    setPlacement(placement === 'right' ? 'left' : 'right');
  };

  const apps = useAppStore((state) => state.apps);
  const app = apps[0];
  let Component = null;
  let prop = { ...app, isEmbedded: true } as App;

  if (app) {
    Component = Applications[app.data.type].EmbeddedAppComponent as (props: App) => JSX.Element;
  }

  return (
    <>
      <Button onClick={onOpen} position="absolute" right="2" bottom="40px">
        Open
      </Button>
      <Drawer isOpen={isOpen} placement={placement} onClose={onClose} closeOnOverlayClick={false} size={'xl'} variant="clickThrough">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>{app ? `${app.data.type}: ${app.data.title}` : 'No App Selected'}</DrawerHeader>

          <DrawerBody>
            {Component ? (
              <ErrorBoundary
                key={app._id}
                fallbackRender={({ error, resetErrorBoundary }) => (
                  <AppError error={error} resetErrorBoundary={resetErrorBoundary} app={app} />
                )}
              >
                <Component key={app._id} {...prop}></Component>
              </ErrorBoundary>
            ) : (
              <Box>
                <Text size="xl">Sorry this app doesn't have embedded view.</Text>
              </Box>
            )}
          </DrawerBody>

          <DrawerFooter display="flex" justifyContent={'space-between'}>
            <Button variant="outline" mr={3} onClick={onClose}>
              Close
            </Button>
            <Button colorScheme="blue" onClick={togglePlacement}>
              Shift to {placement === 'right' ? 'Left' : 'Right'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
