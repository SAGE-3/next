import socketio
import json
import requests
import pprint

# fluentd logging
from fluent import sender


printer = pprint.PrettyPrinter(indent=1, depth=5, width=120, compact=True)

# Socket client
# sio = socketio.Client()
# Verbose mode
sio = socketio.Client(logger=True, engineio_logger=True)


# server = 'https://minim1.evl.uic.edu'
server = 'http://localhost:3333'
# web socket path
path = "/api/connect-ws"

# fluentd logger
logger = None
fluentHost = 'localhost'

# index of the board we want to address
myboard = 'Main Board'
myboard_id = ''

token = ''
with open('token_test.json') as f:
    data = json.load(f)
    token = data['token']
print('Token:', token)


def jwtLogin():
    """Post to login, return user UUID
    """
    head = {'Authorization': 'Bearer {}'.format(token)}
    r = requests.post(server + '/auth/jwt', headers=head)
    return r


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
    print('Board act>', r.text)
    return r


def createStickie(boardId, text):
    """Create a note with a piece of text
    """
    head = {'Authorization': 'Bearer {}'.format(token)}
    x = 300
    y = 300
    width = 600
    height = 320
    payload = {
        'type': 'create',
        'appName': 'stickies',
        'id': '',
        'position': {'x': x, 'y': y, 'width': width, 'height': height},
        'optionalData': {'value': {'text': text, 'color': '#FF7EB9'}},
    }
    r = boardAction(boardId, payload)
    print('createStickie>', r.text)


def createWebview(boardId, aURL):
    """Create a webview
    """
    head = {'Authorization': 'Bearer {}'.format(token)}
    x = 800
    y = 300
    width = 800
    height = 1200
    payload = {
        'type': 'create',
        'appName': 'webview',
        'id': '',
        'position': {'x': x, 'y': y, 'width': width, 'height': height},
        'optionalData': {
            'address': {'history': [aURL],  'historyIdx': 0},
            'visual': {'zoom': 1.0, 'scrollX': 0,  'scrollY': 0}
        },
    }
    r = boardAction(boardId, payload)
    print('createWebview>', r)


def moveApp(boardId, appId, x, y):
    """Move an app
    """
    boardAction(boardId, {'id': appId, 'type': 'move',
                          'position': {'x': x, 'y': y}})


def resizeApp(boardId, appId, x, y, w, h):
    """resize an app
    """
    boardAction(boardId, {'id': appId, 'type': 'resize',
                          'position': {'x': x, 'y': y, 'width': w, 'height': h}})


def closeApp(boardId, appId):
    """close an app
    """
    boardAction(boardId, {'id': appId, 'type': 'close'})


def updateReducer(boardId, refId, data):
    """Update a reducer
    """
    # add the data into payload
    payload = {'type': 'update', **data}
    # post the action
    boardAction(boardId, {
        'type': 'dispatch-action',
        'reference': refId,
        'action': payload
    })


def updateAtom(boardId, refId, payload):
    """Update an atom
    """
    boardAction(boardId, {
        'type': 'update-data',
        'reference': refId,
        'update': {
            'data': payload
        }
    })


def updateStickie(boardId, refId, payload):
    """Update the data of a stickie app
    """
    updateAtom(boardId, refId, payload)


def decodeApp(name, app):
    """Decode the app internal state
    """
    if name == 'stickies':
        valueref = app['state']['value']['reference']
        val = getData(valueref)
        print('       val:', valueref, val)
    elif name == 'imageViewer':
        # first image
        imageref = app['data']['image'][0]['reference']
        print('       image', imageref)
        imagestate = getData(imageref)
        print('       state:', imagestate['src'])
    elif name == 'pdfViewer':
        pdfref = app['data']['file']['reference']
        print('       ref', pdfref)
        print('       file', app['data']['file']['meta']['asset'])
        pdffile = getData(pdfref)
        print('       pages:', len(pdffile['pages']), 'images')
        print('         p0:', pdffile['pages'][0]['reference'])
        pdfstate = getData(app['state']['pdfState']['reference'])
        print('       state:', pdfstate)
    elif name == 'webview':
        xxref = app['state']['state']['reference']
        val = getData(xxref)
        print('       state:', val['url'])
        xxref = app['state']['local']['reference']
        val = getData(xxref)
        print('       local:', val)
        xxref = app['state']['pageState']['reference']
        val = getData(xxref)
        print('       pageState:', val)
    elif name == 'leafletViewer':
        print('leafletViewer')
    else:
        print('Unknow app')


@sio.event
def connect():
    global myboard_id

    r = jwtLogin()
    user = r.json()['user']
    myID = user['uid']
    print('Login> user', myID)

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

    # Test a stickie
    createStickie(myboard_id, "Hello 42!")

    logger.emit('ai', {'message': 'created a stickie'})

    # Test a webview
    # createWebview(myboard_id, "https://hawaii.edu/")
    # App movements
    # moveApp(myboard_id, 'bdb9cf09-d7d6-48b3-a65e-d6a64eaceb2b', 120, 120)
    # resizeApp(myboard_id, 'bac58c78-fea5-437a-b423-a7d7261865fe',
    #           1500, 1500, 1000, 300)
    # Atoms updates
    # updateStickie(myboard_id, '9067610e-77d7-46de-a673-0b283414aa87', {'text': '44!', 'color': '#FF1111'})
    # updateStickie(myboard_id, '9067610e-77d7-46de-a673-0b283414aa87', {'color': '#11FF11'})
    # updateStickie(myboard_id, '9067610e-77d7-46de-a673-0b283414aa87', {'text': 'Merge!'})


@sio.event
async def disconnect():
    print('WS> disconnected from server')


@sio.on('data')
def appUpdates(msg):
    # json_msg = json.dumps(msg, indent=2)
    print('Updates>')
    printer.pprint(msg)

    # initial update, all apps
    if len(msg['updates']['apps']) == 0 and len(msg['updates']['data']) == 0:
        # initial message with all existing apps
        print('All Apps')
        apps = msg['state']['apps']
        for appid in apps:
            app = apps[appid]
            print('App> id', app['id'])
            print('       name', app['appName'])
            x = app['position']['x']
            y = app['position']['y']
            width = app['position']['width']
            height = app['position']['height']
            print('       pos', x, 'x', y, 'size', width, 'x',  height)
            # decode the app values (app specific)
            decodeApp(app['appName'], app)

    # Go over the app updates
    for appid in msg['updates']['apps']:
        hasupdate = msg['updates']['apps'][appid]
        if hasupdate:
            if appid in msg['state']['apps'].keys():
                app = msg['state']['apps'][appid]
                print('App> new/move/resize', appid)
                print('       name', app['appName'])
                x = app['position']['x']
                y = app['position']['y']
                width = app['position']['width']
                height = app['position']['height']
                print('       pos', x, 'x', y, 'size', width, 'x',  height)
            else:
                # if app not in collection, it was deleted
                print('App> delete', appid)

    # Go over the data updates
    for ref_id in msg['updates']['data']:
        hasupdate = msg['updates']['data'][ref_id]
        if hasupdate:
            print('App> data update', ref_id)
            # use the reference to get the value
            updatedata = getData(ref_id)
            print('       value:', updatedata)


@sio.on('boards-update')
def boards_update(data):
    # board creation / deletion / ...
    print('Boards updates> ', data)


if __name__ == '__main__':
    logger = sender.FluentSender('python', host=fluentHost, port=24224)
    sio.connect(server, socketio_path=path, auth={'token': token})
    sio.wait()
