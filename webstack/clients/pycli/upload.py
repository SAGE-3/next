from datetime import datetime
from io import BytesIO
from PIL import Image, ImageOps
import socketio
import json
import requests
import pprint

printer = pprint.PrettyPrinter(indent=1, depth=5, width=120, compact=True)

# To get images

# date


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


def uploadImage(boardId, filename, fullname, posx, posy, w=400, h=400, openAfterUpload=True):
    """Upload an image and open
    boardId: uuid of the board
    filename: name after upload
    fullname: path to the file to read
    posx, posy: position on the board
    openAfterUpload: open app or just do the upload
    """
    # Auth
    headers = {'Authorization': 'Bearer {}'.format(token)}
    # Extra parameters as data
    payload = {
        'targetX': posx,
        'targetY': posy,
        'targetWidth': w,
        'targetHeight': h,
        'boardId': boardId,
    }
    # Do we want to open app after upload
    if openAfterUpload:
        payload['appName'] = 'imageViewer'
    # Important part
    # building the multi-part upload
    # dict containing 'files' with filename and data
    files = {'files': (filename, open(fullname, 'rb'))}
    # POST
    r = requests.post(server + '/api/boards/upload',
                      headers=headers, files=files, data=payload)
    print('Upload>', r)
    return r


def uploadPDF(boardId, filename, fullname, posx, posy, w=400, h=400, openAfterUpload=True):
    """Upload an image and open
    boardId: uuid of the board
    filename: name after upload
    fullname: path to the file to read
    posx, posy: position on the board
    openAfterUpload: open app or just do the upload
    """
    # Auth
    headers = {'Authorization': 'Bearer {}'.format(token)}
    # Extra parameters as data
    payload = {
        'targetX': posx,
        'targetY': posy,
        'targetWidth': w,
        'targetHeight': h,
        'boardId': boardId,
    }
    # Do we want to open app after upload
    if openAfterUpload:
        payload['appName'] = 'pdfViewer'
    # Important part
    # building the multi-part upload
    # dict containing 'files' with filename and data
    files = {'files': (filename, open(fullname, 'rb'))}
    # POST
    r = requests.post(server + '/api/boards/upload',
                      headers=headers, files=files, data=payload)
    print('Upload>', r)
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
    print('Board act>', r)
    return r


# Global list of cell references
Applications = {}


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


@sio.on('data')
def appUpdates(msg):
    global Applications
    # print('Updates>')
    # printer.pprint(msg)

    # initial update, all apps
    if len(msg['updates']['apps']) == 0 and len(msg['updates']['data']) == 0:
        # initial message with all existing apps
        print('All Apps')
        apps = msg['state']['apps']
        for appid in apps:
            app = apps[appid]
            print('App> id', app['id'])
        # uploadImage(myboard_id, "output.jpg", "output.jpg", 400, 200, 1500, 2000, True)
        uploadPDF(myboard_id, "424.pdf", "424.pdf", 400, 200, 1200, 2000, True)
        sio.disconnect()
        exit()

    # Go over the app updates: new app, move, ...
    for appid in msg['updates']['apps']:
        hasupdate = msg['updates']['apps'][appid]
        if hasupdate:
            if appid in msg['state']['apps'].keys():
                app = msg['state']['apps'][appid]
                print('App> new/move/resize', appid)
            else:
                # if app not in collection, it was deleted
                print('App> delete', appid)
                if appid in Applications:
                    del Applications[appid]
                print('Applications', Applications)

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
    sio.connect(server, socketio_path=path, auth={'token': token})
    sio.wait()
