import { SAGE3Plugin } from '@sage3/sageplugin';

const plugin = new SAGE3Plugin();
plugin.on('error', (error) => console.error(error));
window.addEventListener('pagehide', () => plugin.dispose(), { once: true });
