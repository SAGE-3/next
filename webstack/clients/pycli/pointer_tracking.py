import socketio
import threading
import uuid
import json
import requests
from datetime import datetime

# Socket client
sio = socketio.Client()

# server = 'https://minim1.evl.uic.edu'
server = 'http://localhost:3333'
# web socket path
path = "/api/connect-ws"

# name of the board we want to address
myboard = 'Main Board'
myboard_id = ''

token = ''
with open('token_test.json') as f:
    data = json.load(f)
    token = data['token']


@sio.event
def connect():
    global myboard_id
    # print('WS> connection established')
    head = {'Authorization': 'Bearer {}'.format(token)}
    r = requests.get(server + '/api/boards/', headers=head)
    boards = r.json()['boards']
    i = 0
    for b in boards:
        if myboard == b['name']:
            print('board', b['id'], b['name'], b['width'], b['height'])
            myboard_id = b['id']
        i = i + 1
    # print('Board>', myboard_id)
    # subscribe to a board
    sio.emit('board-connect', {'boardId': myboard_id})


@sio.event
async def disconnect():
    print('WS> disconnected from server')


@sio.on('data')
def appUpdates(msg):
    # initial update, all apps
    if len(msg['updates']['apps']) == 0 and len(msg['updates']['data']) == 0:
        # initial message with all existing apps and users
        for u in msg['users']:
            if u != '':
                print('user', u)


@sio.on('presence-update')
def pointers(data):
    """Handler for user update
    """
    currentTime = datetime.now().strftime("%H:%M:%S:%f")
    for p in data:
        # check if it's in the current board
        if p['boardId'] == myboard_id:
            x = -1 * p['cursor'][0]
            y = -1 * p['cursor'][1]
            print('pointer', currentTime,
                  p['uid'], p['name'], p['color'], x, y)

@sio.on('presence-cursor')
def cursor(data):
    """Handler for user update
    """
    currentTime = datetime.now().strftime("%H:%M:%S:%f")
    x = -1 * data['c'][0]
    y = -1 * data['c'][1]
    print('pointer', currentTime, data['uid'], x, y)

@sio.on('boards-update')
def boards_update(data):
    # board creation / deletion / ...
    print('Boards updates> ', data)


if __name__ == '__main__':
    sio.connect(server, socketio_path=path, auth={'token': token})
    sio.wait()
