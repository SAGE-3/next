import asyncio
from urllib import response
import websockets
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


async def listBoards(sock):
    """Get the list of boards
    """
    messageId = str(uuid.uuid4())
    msg_sub = { 'route': '/api/boards', 'method': 'GET', 'id': messageId}
    # send the message
    await sock.send(json.dumps(msg_sub))
    return  messageId

async def sendWeirdJSON(sock):
    """Send some string
    """
    messageId = str(uuid.uuid4())
    # send the message
    await sock.send("val:42")
    return  messageId

async def main():

    async with websockets.connect(socket_server + socket_path, extra_headers={"Authorization": f"Bearer {token}"}) as ws:
        # async with websockets.connect(socket_server + socket_path) as ws:
        print('connected')

        # listBoards: send the message and wait for the response with the same id
        msg_id = await sendWeirdJSON(ws)

        # loop to receive messages
        async for msg in ws:
            event = json.loads(msg)
            if 'success' in event:
              # return message from a previous request
              if msg_id == event['id'] and event['success'] == True:
                if 'data' in event:
                  boards = event['data']
                  print('Boards>')
                  printer.pprint(boards)
            else:
              processMessage(event['event'])

if __name__ == '__main__':
    asyncio.run(main())
