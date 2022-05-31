import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';

import App from './app/app';

import { ColorModeScript } from '@chakra-ui/react';
import { theme } from '@sage3/frontend';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container); // createRoot(container!) if you use TypeScript
  root.render(
    <StrictMode>
      <HashRouter>
        <ColorModeScript initialColorMode={theme.config.initialColorMode} />
        <App />
      </HashRouter>
    </StrictMode>);
}
