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


async def subscribeToAppUpdateInBoard(sock, boardId):
    """Get new, delete, and update messages for a board
    """
    subId = str(uuid.uuid4())
    print('Subscribing to board:', boardId,
          'with subscriptionId:', subId)
    msg_sub = {
        'route': '/api/subscription/boards/' + boardId,
        'id': subId,
        'method': 'SUB'
    }
    # send the message
    await sock.send(json.dumps(msg_sub))

async def listBoards(sock):
    """Get the list of boards
    """
    messageId = str(uuid.uuid4())
    msg_sub = { 'route': '/api/boards', 'method': 'GET', 'id': messageId}
    # send the message
    await sock.send(json.dumps(msg_sub))
    return  messageId

async def moveApp(sock, appId, x, y):
    """Move an app - change the app values
    """
    messageId = str(uuid.uuid4())
    msg_sub = { 'route': '/api/apps/' + appId, 'method': 'PUT', 'body': {'position': {'x': x, 'y': y, 'z': 0}}, 'id': messageId}
    # send the message
    await sock.send(json.dumps(msg_sub))

async def changeStateCounter(sock, appId, val):
    """Change an app state values
    """
    messageId = str(uuid.uuid4())
    msg_sub = { 'route': '/api/apps/' + appId, 'method': 'PUT', 'body': {'state.count': val}, 'id': messageId}
    # send the message
    await sock.send(json.dumps(msg_sub))

async def main():

    async with websockets.connect(socket_server + socket_path, extra_headers={"Authorization": f"Bearer {token}"}) as ws:
        # async with websockets.connect(socket_server + socket_path) as ws:
        print('connected')

        # listBoards: send the message and wait for the response with the same id
        msg_id = await listBoards(ws)

        await moveApp(ws, '94948688-2504-4409-b78b-32da88a7f4ae', 400, 200)
        await changeStateCounter(ws, '94948688-2504-4409-b78b-32da88a7f4ae', 166)

        # loop to receive messages
        async for msg in ws:
            event = json.loads(msg)
            if 'success' in event:
              # return message from a previous request
              if msg_id == event['id'] and event['success'] == True:
                if 'data' in event:
                  boards = event['data']
                  print('Boards>', boards)
                  # subscribe to board updates
                  print('Subscribing to board name', boards[0]['data']['name'])
                  await subscribeToAppUpdateInBoard(ws, boards[0]['_id'])
            else:
              processMessage(event['event'])

if __name__ == '__main__':
    asyncio.run(main())
