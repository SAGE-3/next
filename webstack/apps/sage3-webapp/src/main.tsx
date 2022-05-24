import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom';
import { HashRouter } from 'react-router-dom';

import App from './app/app';

import { ColorModeScript } from '@chakra-ui/react';
import { theme } from '@sage3/frontend';

ReactDOM.render(
  <StrictMode>
    <HashRouter>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <App />
    </HashRouter>
  </StrictMode>,
  document.getElementById('root')
);
