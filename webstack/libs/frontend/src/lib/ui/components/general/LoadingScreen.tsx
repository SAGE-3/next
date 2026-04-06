/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { Box, Button, Progress, Text, VStack } from '@chakra-ui/react';
import { useRouteNav } from '@sage3/frontend';

interface LoadingScreenProps {
  /** Required subtext message */
  subtext: string;
  /** Optional progress value (0-100). If provided, shows determinate progress. If not, shows indeterminate */
  progress?: number;
}

/**
 * Shared loading screen component with optional progress tracking.
 * Always displays a cancel button that navigates to home.
 */
export function LoadingScreen(props: LoadingScreenProps) {
  const { subtext, progress } = props;
  const { toHome } = useRouteNav();

  const isIndeterminate = progress === undefined;

  return (
    <Box width="100vw" height="100vh" display="flex" justifyContent="center" alignItems="center">
      <VStack spacing={6} width="500px" px={4}>
        <Text fontSize="4xl" fontWeight="bold" textAlign="center">
          Loading
        </Text>
        <Text fontSize="lg" textAlign="center">
          {subtext}
        </Text>
        <Progress
          width="100%"
          size="md"
          isIndeterminate={isIndeterminate}
          value={progress}
          colorScheme="teal"
          borderRadius="md"
        />
        <Button onClick={() => toHome()} colorScheme="red" width="100%">
          Cancel
        </Button>
      </VStack>
    </Box>
  );
}

