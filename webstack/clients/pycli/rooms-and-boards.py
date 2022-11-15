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


def processEvent(msg):
    """Process events
    """
    event = msg['event']
    type = event['type']
    collection = event['col']
    data = event['doc']
    if type == 'CREATE':
        print('New> ', collection, data)
    if type == 'DELETE':
        print('Delete> ', collection, data)
    if type == 'UPDATE':
        print('Update> ', collection, data)


async def listBoards(sock):
    """Get the list of boards
    """
    messageId = str(uuid.uuid4())
    msg_sub = { 'route': '/api/boards', 'method': 'GET', 'id': messageId}
    # send the message
    await sock.send(json.dumps(msg_sub))
    return  messageId

async def listRooms(sock):
    """Get the list of boards
    """
    messageId = str(uuid.uuid4())
    msg_sub = { 'route': '/api/rooms', 'method': 'GET', 'id': messageId}
    # send the message
    await sock.send(json.dumps(msg_sub))
    return  messageId


async def subscribeToRoom(sock, roomId):
    """Get updates for a room
    """
    subId = str(uuid.uuid4())
    print('Subscribing to room:', roomId, 'with subscriptionId:', subId)
    msg_sub = {
        'route': '/api/subscription/rooms/' + roomId,
        'id': subId, 'method': 'SUB'
    }
    # send the message
    await sock.send(json.dumps(msg_sub))
    print('   sub ib', subId)
    return subId

async def subscribeRooms(sock):
    """Get updates for new rooms
    """
    subId = str(uuid.uuid4())
    print('Subscribing to rooms: with subscriptionId:', subId)
    msg_sub = {
        'route': '/api/rooms',
        'id': subId, 'method': 'SUB'
    }
    # send the message
    await sock.send(json.dumps(msg_sub))


async def main():

    async with websockets.connect(socket_server + socket_path, extra_headers={"Authorization": f"Bearer {token}"}) as ws:
        # async with websockets.connect(socket_server + socket_path) as ws:
        print('Socket connected')

        # listBoards and listRooms
        board_id = await listBoards(ws)
        room_id = await listRooms(ws)
        # got new room events
        await subscribeRooms(ws)

        # loop to receive messages
        async for msg in ws:
            event = json.loads(msg)
            if event['id'] == board_id:
                # response to the listBoards request
                print('Boards:', event['data'])
            elif event['id'] == room_id:
                # response to the listRooms request
                print('Rooms:', event['data'])
                rooms = event['data']
                for room in rooms:
                    sub = await subscribeToRoom(ws, room['_id'])
            elif event['event'] != None:
                # event message
                processEvent(event)
            else:
                print('NotYetImplemented message:', event)

if __name__ == '__main__':
    asyncio.run(main())
