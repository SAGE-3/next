# REST API

## Login

Login route using the 'guest' account

- url: '/auth/guest',
- method: 'post',
- Body: form data with username and password
- 'guest-username' and 'guest-pass' values
- return 2 cookies in header:
  - express:sess
  - express:sess.sig
  - add cookies to further requests

## Get user info

Get info about self

- url: '/api/user/info'
- method: get

## Change user name

- url: '/api/user/update/username',
- method: 'post',
- body: json { name: 'newname' },

## Change user color (pointer)

- method: 'post',
- url: '/api/user/update/usercolor',
- body: json { color: 'newcolor' },

## Get list of boards

- url: '/api/boards'
- method: 'get'
- returns array of board

## Get state of a board

- url: '/api/boards/state/{board}'
- method: 'get'

# WS API

- socket.io v2 (need to update to v4)

## connect

- path: '/api/connect-ws',
- Cookie: login cookies,

## board connect

- socket.emit('board-connect', { boardId });

## board diconnect

- socket.emit('board-disconnect', { boardId });

## Cursor

- socket.emit('presence-cursor', { c: [-x, -y] });

## Local time

- socket.emit('presence-time', timePayload);

## user updates

- socket.on('presence-update', cb);

## act

- url: '/api/boards/act/{boardId}'
- method: 'post'
