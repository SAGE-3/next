/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { ChakraProvider } from '@chakra-ui/react';
import { theme } from '@sage3/frontend';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { BrowserRouter } from "react-router-dom";

import App from './app/app';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container); // createRoot(container!) if you use TypeScript
  root.render(
    <StrictMode>
      <BrowserRouter>
        <ChakraProvider theme={theme}>
          <App />
        </ChakraProvider>
      </BrowserRouter>
    </StrictMode>);
}