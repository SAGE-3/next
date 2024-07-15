import React from 'react';
import { Box, Button } from '@chakra-ui/react';
import { isMac } from '@sage3/shared';

type TitlebarProps = {
  children: React.ReactNode;
};

const Titlebar = ({ children }: TitlebarProps) => {
  return (
    <>
      {isMac() && (
        <Box position="absolute" top="0" left="0" sx={{ '-webkit-app-region': 'drag' }} width="100vw" height="35px" zIndex="99999">
          {children}
        </Box>
      )}
    </>
  );
};

export default Titlebar;
