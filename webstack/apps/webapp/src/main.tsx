/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';

import App from './app/app';

import { ColorModeScript } from '@chakra-ui/react';
import { theme } from '@sage3/frontend';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <HashRouter>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <App />
    </HashRouter>
  );
}
