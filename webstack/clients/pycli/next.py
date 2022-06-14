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
    r = requests.post(web_server + '/api/users', headers=head, json=payload)
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
    subscriptionId = str(uuid.uuid4())
    messageId = str(uuid.uuid4())
    print('Subscribing to board:', boardId,
          'with subscriptionId:', subscriptionId)
    msg_sub = {'route': '/api/apps/subscribe/:boardId', 'id': messageId,
               'body': {'subId': subscriptionId, 'boardId': boardId}}
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
    r = requests.put(web_server + '/api/apps/state/' + appId,
                     headers=head, json={'count': val})
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
        u = createUser({'name': user['providerId'],
                       'email': user['providerId']})
        print('User>', u.json())


def processBoardMessage(msg):
    """Process an update about a board
    """
    type = msg['type']
    data = msg['doc']['data']
    if type == 'CREATE':
        print('New app> ', data)
    if type == 'DEL':
        print('Delete app> ', data)
    if type == 'UPDATE':
        print('Update app> ', data)


async def main():
    connect()

    # Rooms
    result = listRooms()
    jsondata = result.json()
    if jsondata['success']:
        rooms = jsondata['data']
        print('Rooms:', rooms)

    # Boards
    result = listBoards()
    jsondata = result.json()
    if jsondata['success']:
        boards = jsondata['data']
        print('Boards:', boards)
        board0 = boards[0]

    # Info about an app: counter
    oneApp = "d9a41adc-2b5c-4e3b-bc55-07e1f67a3dc2"
    result = getAppInfo(oneApp)
    jsondata = result.json()
    if jsondata['success']:
        appInfo = jsondata['data']
        print('Counter app:', appInfo['state'])
        r = moveApp(oneApp, 400, 200)
        print('moveApp:', r.json())
        r = changeStateCounter(oneApp, 156)
        print('changeStateCounter:', r.json())

    # Info about an app: image
    oneApp = '9d8ae882-ab2c-4a77-94c4-a1be39db0f91'
    result = getAppInfo(oneApp)
    jsondata = result.json()
    if jsondata['success']:
        appInfo = jsondata['data']
        print('Image app:', appInfo['state'])

    # connect with the JSON web token
    async with websockets.connect(socket_server + socket_path, extra_headers={"Authorization": f"Bearer {token}"}) as ws:
        # subscribe to the collection: id is subscription identifier
        boardId = board0['id']
        await subscribeToAppUpdateInBoard(ws, boardId)

        # loop to receive messages
        async for msg in ws:
            event = json.loads(msg)
            processBoardMessage(event['event'])

if __name__ == '__main__':
    asyncio.run(main())
