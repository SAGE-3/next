import json
import requests
import pprint

printer = pprint.PrettyPrinter(indent=1, depth=5, width=120, compact=True)


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


def jwtLogin():
    """Post to login, return user UUID
    """
    head = {'Authorization': 'Bearer {}'.format(token)}
    r = requests.post(server + '/auth/jwt', headers=head)
    print('JWT login>', r)
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
    height = 300
    payload = {
        'type': 'create',
        'appName': 'stickies',
        'id': '',
        'position': {'x': x, 'y': y, 'width': width, 'height': height},
        'optionalData': {'value': {'text': text, 'color': '#BB1111'}},
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


def connect():
    global myboard_id

    r = jwtLogin()
    user = r.json()['user']
    myID = user['uid']
    print('Login> user', myID)

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

    # Test a stickie
    createStickie(myboard_id, "Hello 42!")


if __name__ == '__main__':
    connect()
