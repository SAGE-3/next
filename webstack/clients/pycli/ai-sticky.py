from datetime import datetime
from io import BytesIO
import socketio
import threading
import uuid
import json
import requests
import pprint

printer = pprint.PrettyPrinter(indent=1, depth=5, width=120, compact=True)

# Socket client
sio = socketio.Client()
# Verbose mode
# sio = socketio.Client(logger=True, engineio_logger=True)


# server = 'https://minim1.evl.uic.edu'
server = 'http://localhost:3333'
# web socket path
path = "/api/connect-ws"

# index of the board we want to address
myboard = 'Main Board'
myboard_id = ''

token = ''
with open('token_test.json') as f:
    data = json.load(f)
    token = data['token']
print('Token:', token)


def getData(ref_id):
    """Get a json value for a data reference, over HTTP
    """
    head = {'Authorization': 'Bearer {}'.format(token)}
    r = requests.get(server + '/api/data/' + ref_id, headers=head)
    return r.json()['data']


def boardAction(boardId, payload):
    """Post an action to  a board
    """
    head = {'Authorization': 'Bearer {}'.format(token)}
    r = requests.post(server + '/api/boards/act/' + boardId,
                      headers=head, json=payload)
    print('Board act>', r)
    return r


def createStickie(boardId, text, x, y, w, h):
    """Create a note with a piece of text
    """
    head = {'Authorization': 'Bearer {}'.format(token)}
    payload = {
        'type': 'create',
        'appName': 'stickies',
        'id': '',
        'position': {'x': x, 'y': y, 'width': w, 'height': h},
        'optionalData': {'value': {'text': text, 'color': '#4FD1C5'}},
    }
    r = boardAction(boardId, payload)
    print('createStickie>', r)


# Global list of cell references
StickiesReference = {}
Applications = {}

# Dict. of smart functions
SmartFunctions = {}
# smart function
newuuid = str(uuid.uuid4())
SmartFunctions[newuuid] = {
    'action_uuid': newuuid,
    'action_name': 'To French',
    'action_description': 'Translate to french'
}
# smart function
newuuid = str(uuid.uuid4())
SmartFunctions[newuuid] = {
    'action_uuid': newuuid,
    'action_name': 'Sentiment Analysis',
    'action_description': 'Sentiment analysis of the text'
}


def decodeApp(name, app):
    """Decode the app internal state
    """
    global ImagesReference, Applications
    if name == 'stickies':
        print('Decode', app)
        # store the app
        noteref = app['state']['value']['reference']
        print('       note ref', noteref)
        notestate = getData(noteref)
        print('       state:', notestate)
        reducer = app['state']['smartFunctions']['reference']
        # keep track of cell data refs.
        appid = app['id']
        x = app['position']['x']
        y = app['position']['y']
        w = app['position']['width']
        h = app['position']['height']
        Applications[appid] = {'value': notestate, 'appid': appid,
                               'x': x, 'y': y, 'w': w, 'h': h}
        print('Applications', Applications)
        StickiesReference[reducer] = appid
        print('StickiesReference', StickiesReference)

        # clear the previous actions
        boardAction(myboard_id, {
            'type': 'dispatch-action',
            'reference': reducer,
            'action': {'type': 'clear_all'}
        })

        # Add all the functions to the UI
        for k in SmartFunctions:
            smartfunc = SmartFunctions[k]
            boardAction(myboard_id, {
                'type': 'dispatch-action',
                'reference': reducer,
                'action': {
                    'type': 'add_action',
                    'action_uuid': smartfunc['action_uuid'],
                    'action_name': smartfunc['action_name'],
                    'action_description': smartfunc['action_description']
                }
            })


@sio.event
def connect():
    global myboard_id
    print('WS> connection established')
    head = {'Authorization': 'Bearer {}'.format(token)}
    r = requests.get(server + '/api/boards/', headers=head)
    boards = r.json()['boards']
    i = 0
    for b in boards:
        print('Board>', i, '-', b['name'], '-', b['id'])
        if myboard == b['name']:
            myboard_id = b['id']
        i = i + 1
    print('Board>', myboard_id)
    # subscribe to a board
    sio.emit('board-connect', {'boardId': myboard_id})


@sio.event
async def disconnect():
    print('WS> disconnected from server')


def reducerData(ref, data):
    """Handle an update of cell reducer
    """
    # print('reducerData', ref, data)
    if data['run'] != '':
        func_id = data['run']
        # print('Func ID', func_id, SmartFunctions[func_id])
        if SmartFunctions[func_id]['action_name'] == 'To French':
            app = Applications[StickiesReference[ref]]
            print('AAAAA', app)
            x = app['x'] + app['w'] + 15
            y = app['y']
            w = app['w']
            h = app['h']
            createStickie(myboard_id, 'Now in french... ' +
                          app['value']['text'], x, y, w, h)

            print('Sending the done message')
            boardAction(myboard_id, {
                'type': 'dispatch-action',
                'reference': ref,
                'action': {
                    'type': 'done',
                    'action_uuid': func_id,
                    'action_return': 'bla bla'
                }
            })


@sio.on('data')
def appUpdates(msg):
    global StickiesReference, Applications
    # print('Updates>')
    # printer.pprint(msg)

    # initial update, all apps
    if len(msg['updates']['apps']) == 0 and len(msg['updates']['data']) == 0:
        # initial message with all existing apps
        print('All Apps')
        apps = msg['state']['apps']
        for appid in apps:
            app = apps[appid]
            print('App> id', app['id'], app['appName'])
            # decode the app values (app specific)
            decodeApp(app['appName'], app)

    # Go over the app updates: new app, move, ...
    for appid in msg['updates']['apps']:
        hasupdate = msg['updates']['apps'][appid]
        if hasupdate:
            if appid in msg['state']['apps'].keys():
                app = msg['state']['apps'][appid]
                print('App> new/move/resize', appid)
                # decode the app values (app specific)
                decodeApp(app['appName'], app)
            else:
                # if app not in collection, it was deleted
                print('App> delete', appid)
                if appid in Applications:
                    del Applications[appid]
                print('Applications', Applications)
                # find the app
                deletes = [
                    key for key in StickiesReference if StickiesReference[key] == appid]
                # delete the key
                for key in deletes:
                    del StickiesReference[key]

    # Go over the data updates
    for ref_id in msg['updates']['data']:
        hasupdate = msg['updates']['data'][ref_id]
        if hasupdate:
            print('App> data update', ref_id)
            # use the reference to get the value
            updatedata = getData(ref_id)
            print('       value:', updatedata)
            # check if it's an stickie reducer
            print('Check', ref_id, StickiesReference)
            if ref_id in StickiesReference:
                reducerData(ref_id, updatedata)


@sio.on('boards-update')
def boards_update(data):
    # board creation / deletion / ...
    print('Boards updates> ', data)


if __name__ == '__main__':
    sio.connect(server, socketio_path=path, auth={'token': token})
    sio.wait()
