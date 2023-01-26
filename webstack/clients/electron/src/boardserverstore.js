// Persistent storage for electron app: used for window position
const Store = require('electron-store');
const uuid = require('uuid');
const genId = uuid.v4;

// Persistent data store to store window postion/size
// stored by default in app.getPath('userData')
// Create a store
const store = new Store({ name: 'board-server-store' });

// Default ServerList
const defaultServerList = [
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
    url: 'https://mini.sage3.app',
  },
];

const defaultBoardList = [];

store.get('servers', defaultServerList);
store.get('boards', defaultBoardList);

module.exports = {
  getServerList: function () {
    const list = store.get('servers', defaultServerList);
    return list;
  },

  addServer: function (name, url) {
    const currentList = store.get('servers', defaultServerList);
    currentList.push({ name, url, id: genId() });
    return store.set('servers', currentList);
  },

  removeServer: function (id) {
    const currentList = store.get('servers', defaultServerList);
    const idx = currentList.findIndex((el) => el.id == id);
    if (idx > -1) {
      currentList.splice(idx, 1);
    }
    return store.set('servers', currentList);
  },

  getBoardList: function () {
    const list = store.get('boards', defaultBoardList);
    return list;
  },

  addBoard: function (name, url) {
    const currentList = store.get('boards', defaultBoardList);
    currentList.push({ name, url, id: genId() });
    return store.set('boards', currentList);
  },

  removeBoard: function (id) {
    const currentList = store.get('boards', defaultBoardList);
    const idx = currentList.findIndex((el) => el.id == id);
    if (idx > -1) {
      currentList.splice(idx, 1);
    }
    return store.set('boards', currentList);
  },

  clear: function () {
    return store.clear();
  },
};
