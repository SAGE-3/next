import React from 'react';
import { Box, Button } from '@chakra-ui/react';

type TitlebarProps = {
  children: React.ReactNode;
};

const Titlebar = ({ children }: TitlebarProps) => {
  return (
    <>
      {window.navigator.userAgent.toLowerCase().includes('macintosh') && (
        <Box position="absolute" top="0" left="0" sx={{ '-webkit-app-region': 'drag' }} width="100vw" height="32px" p="2">
          {children}
        </Box>
      )}
    </>
  );
};

export default Titlebar;
