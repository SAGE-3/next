from datetime import datetime
from io import BytesIO
from PIL import Image, ImageOps
import socketio
import threading
import uuid
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


def uploadImage(boardId, filename, fullname, posx, posy, width, height, openAfterUpload=True):
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
        'targetWidth': width,
        'targetHeight': height,
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
ImagesReference = {}
Applications = {}

# Dict. of smart functions
SmartFunctions = {}
# 'convert to bw' function
newuuid = str(uuid.uuid4())
SmartFunctions[newuuid] = {
    'action_uuid': newuuid,
    'action_name': 'Black & White',
    'action_description': 'Convert image to black and white'
}
# 'label a picture' function
newuuid = str(uuid.uuid4())
SmartFunctions[newuuid] = {
    'action_uuid': newuuid,
    'action_name': 'Labels',
    'action_description': 'Calculate labels for this image'
}


def decodeApp(name, app):
    """Decode the app internal state
    """
    global ImagesReference, Applications
    if name == 'imageViewer':
        # print('Decode', app)
        # store the app
        imageref = app['data']['image'][0]['reference']
        print('       image ref', imageref)
        imagestate = getData(imageref)
        print('       state:', imagestate['src'])
        reducer = app['state']['smartFunctions']['reference']
        # keep track of cell data refs.
        appid = app['id']
        x = app['position']['x']
        y = app['position']['y']
        w = app['position']['width']
        h = app['position']['height']
        Applications[appid] = {'src': imagestate['src'],
                               'x': x, 'y': y, 'w': w, 'h': h}
        print('Applications', Applications)
        ImagesReference[reducer] = appid
        print('ImagesReference', ImagesReference)

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
        if SmartFunctions[func_id]['action_name'] == 'Black & White':
            app = Applications[ImagesReference[ref]]
            url = app['src']
            url = server + '/' + url
            print('Need BW for', url)
            response = requests.get(url)
            img = Image.open(BytesIO(response.content))
            gray_image = ImageOps.grayscale(img)
            gray_image.save("output.jpg", "JPEG")
            print('Uploading resulting image')
            uploadImage(myboard_id, "output.jpg",
                        "output.jpg", app['x']+app['w']+10, app['y'], app['w'], app['h'], True)
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
    global ImagesReference, Applications
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
                    key for key in ImagesReference if ImagesReference[key] == appid]
                # delete the key
                for key in deletes:
                    del ImagesReference[key]

    # Go over the data updates
    for ref_id in msg['updates']['data']:
        hasupdate = msg['updates']['data'][ref_id]
        if hasupdate:
            print('App> data update', ref_id)
            # use the reference to get the value
            updatedata = getData(ref_id)
            print('       value:', updatedata)
            # check if it's an image reducer
            print('Check', ref_id, ImagesReference)
            if ref_id in ImagesReference:
                reducerData(ref_id, updatedata)


@sio.on('boards-update')
def boards_update(data):
    # board creation / deletion / ...
    print('Boards updates> ', data)


if __name__ == '__main__':
    sio.connect(server, socketio_path=path, auth={'token': token})
    sio.wait()
