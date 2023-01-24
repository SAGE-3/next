// Persistent storage for electron app: used for window position
const Store = require('electron-store');
const uuid = require('uuid');
const genId = uuid.v4;

// Persistent data store to store window postion/size
// stored by default in app.getPath('userData')
// Create a store
const store = new Store({ name: 'sage3' });
// Store values in a key called 'window-state'
store.get('window-state', {
  server: 'https://sage3.app',
  fullscreen: false,
  x: 0,
  y: 0,
  width: 1280,
  height: 720,
});

store.get('server-list', [
  {
    name: 'Chicago',
    id: genId(),
    url: 'https://sage3.app/',
  },
  {
    name: 'Hawaii',
    id: genId(),
    url: 'https://manoa.sage3.app',
  },
  {
    name: 'Development',
    id: genId(),
    ur: 'https://mini.sage3.app',
  },
]);

module.exports = {
  getWindow: function () {
    return store.get('window-state');
  },
  setWindow: function (value) {
    return store.set('window-state', value);
  },
  getServerList: function () {
    return store.get('server-list');
  },
  addServer: function (name, url) {
    const currentList = store.get('server-list');
    currentList.push({ name, url, id: genId() });
    return store.set('server-list', currentList);
  },
  removeServer: function (id) {
    const currentList = store.get('server-list');
    const idx = currentList.findIndex((el) => el.id == id);
    if (idx) {
      currentList.splice(idx, 1);
    }
    return store.set('server-list', currentList);
  },
  clear: function () {
    return store.clear();
  },
};
