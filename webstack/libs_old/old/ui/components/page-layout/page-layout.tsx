/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useEffect, useState } from 'react';

import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Box, Center, Image, Button, Link, Divider, VStack, useColorMode } from '@chakra-ui/react';

import { UserAvatar } from '../user-avatar/user-avatar';
import { FaArrowLeft } from 'react-icons/fa';
import { AuthService } from 'libs/frontend/services/src/auth/services/auth-service';
import { GetServerName } from '@sage3/frontend/services';

import { bgColor, textColor, linkColor, dividerColor } from '@sage3/frontend/ui';

//import logoes from light theme and dark theme
import sage3DarkMode from './SAGE3DarkMode.png';
import sage3LightMode from './SAGE3LightMode.png';

export interface PageLayoutProps {
  title?: string | React.ReactNode;
  topRight?: React.ReactNode;
  children?: React.ReactNode;
  login?: boolean;
}

const pages: { children: React.ReactNode; to: string }[] = [
  {
    children: 'Boards',
    to: '/home',
  },
  {
    children: 'Information',
    to: '/info',
  },
];

export function PageLayout(props: PageLayoutProps) {
  const { pathname } = useLocation();
  const { colorMode } = useColorMode();
  const [serverName, setServerName] = useState<string>('');

  // Retrieve the name of the server to display in the page
  useEffect(() => {
    GetServerName().then((value) => {
      if (value) setServerName(value);
    });
  }, []);

  return (
    <Box width="100vw" height="100vh" overflow="auto" background={bgColor()}>
      {props.login ? (
        <Box>
          <Center>{props.children}</Center>
        </Box>
      ) : (
        <>
          {/* Your own avatar */}
          <Button
            onClick={() => AuthService.logout()}
            position="absolute"
            bottom="0.5rem"
            left="0.5rem"
            leftIcon={<FaArrowLeft />}
            colorScheme="teal"
            variant="outline"
          >
            Logout
          </Button>
          <UserAvatar style={{ position: 'absolute', right: '0.5rem', top: '0.5rem' }}></UserAvatar>
          <Center>
            <VStack spacing={6} align="stretch" width="80vw" pt="2rem">
              <Box>
                <Center>
                  <Image src={colorMode === 'light' ? sage3LightMode : sage3DarkMode} alt="SAGE3 Logo" maxHeight="100px" />
                </Center>
                <Center mt="1rem" fontSize="xl">
                  Host: {serverName || '-'}
                </Center>
              </Box>

              <Box alignContent="center">
                <Center>
                  {pages.map((page) => (
                    <Link
                      pr="2"
                      pl="2"
                      key={page.to}
                      variant="link"
                      as={RouterLink}
                      {...page}
                      style={{ color: pathname == page.to ? linkColor() : textColor(), fontSize: '28px' }}
                    />
                  ))}
                </Center>
              </Box>

              <Divider borderColor={dividerColor()} />

              <Box>
                <Center>{props.children}</Center>
              </Box>
            </VStack>
          </Center>
        </>
      )}
    </Box>
  );
}

export default PageLayout;
