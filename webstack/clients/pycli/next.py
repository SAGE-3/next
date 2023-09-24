import asyncio
from urllib import response
import websockets
import requests
import json
import uuid

# pretty print for dictionaries
import pprint
printer = pprint.PrettyPrinter(indent=1, depth=5, width=120, compact=True)

# server info
server = 'localhost:3333'
web_server = 'http://' + server
socket_server = 'ws://' + server
socket_path = '/api'

myID = ''

token = ''
with open('token1.json') as f:
    data = json.load(f)
    token = data['token']
print('Token:', token)


def jwtLogin():
    """Post to login, return user UUID
    """
    head = {'Authorization': 'Bearer {}'.format(token)}
    r = requests.post(web_server + '/auth/jwt', headers=head)
    return r


def createUser(payload):
    """Create a user
    """
    head = {'Authorization': 'Bearer {}'.format(token)}
    #r = requests.post(web_server + '/api/users', headers=head, json=payload)
    r = requests.post(web_server + '/api/users/create', headers=head, json=payload)
    return r


def listRooms():
    """List rooms
    """
    head = {'Authorization': 'Bearer {}'.format(token)}
    r = requests.get(web_server + '/api/rooms', headers=head)
    return r


def listBoards():
    """List boards
    """
    head = {'Authorization': 'Bearer {}'.format(token)}
    r = requests.get(web_server + '/api/boards', headers=head)
    return r


async def subscribeToAppUpdateInBoard(sock, boardId):
    """Get new, delete, and update messages for a board
    """
    messageId = str(uuid.uuid4())
    print('Subscribing to board:', boardId,
          'with subscriptionId:', messageId)
    msg_sub = {
        'route': '/api/subscription/boards/' + boardId,
        'id': messageId,
        'method': 'SUB'
    }
    # send the message
    await sock.send(json.dumps(msg_sub))

async def subscribeToAppUpdateInRoom(sock, roomId):
    """Get new, delete, and update messages for a board
    """
    messageId = str(uuid.uuid4())
    print('Subscribing to room:', roomId,
          'with subscriptionId:', messageId)
    msg_sub = {
        'route': '/api/subscription/rooms/' + roomId,
        'id': messageId,
        'method': 'SUB'
    }
    # send the message
    await sock.send(json.dumps(msg_sub))


def getAppInfo(appId):
    """Get info about an app
    """
    head = {'Authorization': 'Bearer {}'.format(token)}
    r = requests.get(web_server + '/api/apps/' + appId, headers=head)
    return r


def moveApp(appId, x, y):
    """Move an app - change the app values
    """
    head = {'Authorization': 'Bearer {}'.format(token)}
    r = requests.put(web_server + '/api/apps/' + appId,
                     headers=head, json={'position': {'x': x, 'y': y, 'z': 0}})
    return r


def changeStateCounter(appId, val):
    """Change an app state values
    """
    head = {'Authorization': 'Bearer {}'.format(token)}
    r = requests.put(web_server + '/api/apps/' + appId,
                     headers=head, json={'state.count': val})
    return r


def connect():
    """Connect to the web server
    """
    # JWT login
    r = jwtLogin()
    response = r.json()
    if response['success']:
        user = response['user']
        print('Login> user', user)
        # Create a new user for that token
        # u = createUser({'name': user['providerId'],
        #                'email': user['providerId']})
        # print('User>', u.json())


def processMessage(msg):
    """Process an update about a board
    """
    type = msg['type']
    collection = msg['col']
    data = msg['doc']
    if type == 'CREATE':
        print('New> ', collection, data)
    if type == 'DEL':
        print('Delete> ', collection, data)
    if type == 'UPDATE':
        print('Update> ', collection, data)


async def main():
    connect()

    # Rooms
    result = listRooms()
    jsondata = result.json()
    if jsondata['success']:
        rooms = jsondata['data']
        print('Rooms:', rooms)
        room0 = rooms[0]
        print('Going to sub to room', room0['data']['name'])

    # Boards
    result = listBoards()
    jsondata = result.json()
    if jsondata['success']:
        boards = jsondata['data']
        print('Boards:', boards)
        board0 = boards[0]

    # Info about an app: counter
    oneApp = "94948688-2504-4409-b78b-32da88a7f4ae"
    result = getAppInfo(oneApp)
    jsondata = result.json()
    if jsondata['success']:
        # array of one app
        appInfo = jsondata['data'][0]
        print('Counter app state:', appInfo['data']['state'])
        r = moveApp(oneApp, 400, 200)
        print('moveApp:', r.json())
        r = changeStateCounter(oneApp, 157)
        print('changeStateCounter:', r.json())

    # Info about an app: image
    oneApp = '0375cbb0-e3c8-4aca-9253-9e5bea116aa5'
    result = getAppInfo(oneApp)
    jsondata = result.json()
    if jsondata['success']:
        appInfo = jsondata['data'][0]
        print('Image app state:', appInfo['data']['state'])

    # connect with the JSON web token
    async with websockets.connect(socket_server + socket_path, extra_headers={"Authorization": f"Bearer {token}"}) as ws:

        # sub to a board
        # boardId = board0['_id']
        # await subscribeToAppUpdateInBoard(ws, boardId)

        # sub to a room
        roomId = room0['_id']
        await subscribeToAppUpdateInRoom(ws, roomId)

        # loop to receive messages
        async for msg in ws:
            event = json.loads(msg)
            processMessage(event['event'])

if __name__ == '__main__':
    asyncio.run(main())
