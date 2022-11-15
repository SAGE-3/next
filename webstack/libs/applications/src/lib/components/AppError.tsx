/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Box, Button, Text } from '@chakra-ui/react';
import { App } from '../schema';

import { AppWindow } from '../components';

/**
 * Error Boundary for applications.
 * Used on the BoardPage (/webstack/apps/webapp/src/app/pages/Board.tsx)
 * @param props
 * @returns
 */
export function AppError(props: { app: App; error: Error; resetErrorBoundary: (...args: unknown[]) => void }): JSX.Element {
  return (
    //  Still use the AppWindow so we can still position the app correctly
    <AppWindow app={props.app}>
      {/* The inner area of the error window */}
      <Box
        width="100%"
        height="100%"
        p="5"
        display="flex"
        justifyContent="center"
        alignItems="center"
        flexDirection="column"
        backgroundColor="indianred"
      >
        {/* Main Title */}
        <Text fontSize="lg">{props.app.data.type} ERROR</Text>
        {/*  Error Message */}
        <Text fontSize="md" mb="2">
          Message: {props.error.message}
        </Text>
        {/* Button to try to the load the application again */}
        <Button
          onClick={() => {
            props.resetErrorBoundary();
          }}
          colorScheme="green"
          my="4"
        >
          Reload
        </Button>
      </Box>
    </AppWindow>
  );
}
