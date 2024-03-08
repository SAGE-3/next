import React from 'react';
import { Box, GridItem } from '@chakra-ui/react';

type PanelProps = {
  children: React.ReactNode;
}

function Panel({ children }: PanelProps) {
  return (
    <GridItem minHeight="400px" minWidth="650px" border="1px">
      {children}
    </GridItem>
  );
}

export default Panel;