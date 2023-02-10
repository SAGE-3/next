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
# server = 'minim1.evl.uic.edu'
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
    """Process a message from the server
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

async def subscribeToUsers(sock):
    """Get new, delete, and update messages for a users
    """
    subId = str(uuid.uuid4())
    print('Subscribing to users: with subscriptionId:', subId)
    msg_sub = {
        'route': '/api/users',
        'id': subId,
        'method': 'SUB'
    }
    # send the message
    await sock.send(json.dumps(msg_sub))

async def subscribeToPresence(sock):
    """Get new, delete, and update messages for a users
    """
    subId = str(uuid.uuid4())
    print('Subscribing to presence: with subscriptionId:', subId)
    msg_sub = {
        'route': '/api/presence',
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


async def main():

    async with websockets.connect(socket_server + socket_path, extra_headers={"Authorization": f"Bearer {token}"}) as ws:
        # async with websockets.connect(socket_server + socket_path) as ws:
        print('connected')

        board_id = await listBoards(ws)
        print('board_id message', board_id)

        await subscribeToUsers(ws)
        await subscribeToPresence(ws)

        # loop to receive messages
        async for msg in ws:
            event = json.loads(msg)
            if 'success' in event:
                print('MSG', event)
                pass
            else:
                processMessage(event['event'])

if __name__ == '__main__':
    asyncio.run(main())
