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
  print('Subscribing to board:', boardId, 'with subscriptionId:', subscriptionId)
  msg_sub = { 'route': '/api/apps/subscribe/:boardId', 'id': messageId, 'body': {'subId': subscriptionId, 'boardId': boardId} }
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
  r = requests.put(web_server + '/api/apps/' + appId, headers=head, json={'position': {'x': x, 'y': y, 'z': 0}})
  return r

def changeStateCounter(appId, val):
  """Change an app state values
  """
  head = {'Authorization': 'Bearer {}'.format(token)}
  r = requests.put(web_server + '/api/apps/state/' + appId, headers=head, json={'count': val})
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
    u = createUser({'name': user['providerId'], 'email': user['providerId']})
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
  oneApp = '49e9b5e5-3d24-4490-a563-08ea29158de2'
  result = getAppInfo(oneApp)
  jsondata = result.json()
  if jsondata['success']:
    appInfo = jsondata['data']
    print('Counter app:', appInfo['state'])
    r = moveApp(oneApp, 120, 193)
    print('moveApp:', r.json())
    r = changeStateCounter(oneApp, 56)
    print('changeStateCounter:', r.json())

  # Info about an app: image
  oneApp = '04811025-ab0c-4a98-8b70-a0897d61e61f'
  result = getAppInfo(oneApp)
  jsondata = result.json()
  if jsondata['success']:
    appInfo = jsondata['data']
    print('Image app:', appInfo['state'])

  async with websockets.connect(socket_server + socket_path) as ws:
    # subscribe to the collection: id is subscription identifier
    boardId = board0['id']
    await subscribeToAppUpdateInBoard(ws, boardId)

    # loop to receive messages
    async for msg in ws:
      event = json.loads(msg)
      processBoardMessage(event['event'])

if __name__ == '__main__':
  asyncio.run(main())
