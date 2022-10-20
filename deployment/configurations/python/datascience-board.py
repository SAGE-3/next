import json
import uuid
import asyncio
import websockets
import os
import redis
import requests

#########################################################
###### Get configuration from environment variable ######
#########################################################
prod = os.getenv('ENVIRONMENT')
host = os.getenv('SAGE3_SERVER')

if prod == 'backend' or prod == 'production':
    print('Mode> Production / Backend')
    redisServer = 'redis-server'
    if prod == 'production':
        # Pass the actual FQDN of the server
        if host:
          server = host
        else:
          server = 'host.docker.internal'
        jupyterServer = 'https://' + server + ':4443'
        webServer = 'https://' + server
        wsServer = 'wss://' + server + '/api'
    else:
        jupyterServer = 'http://jupyter:8888'
        # host of the docker container in backend mode
        server = 'host.docker.internal:3333'
        webServer = 'http://' + server
        wsServer = 'ws://' + server + '/api'
else:
    print('Mode> Development')
    jupyterServer = 'http://localhost'
    redisServer = 'localhost'
    server = 'localhost:3333'
    webServer = 'http://' + server
    wsServer = 'ws://' + server + '/api'

#########################################################
###### Connect to REDIS to get Jupyter token       ######
#########################################################

def get_j_token(redis_server, port=6379, token_path="config:jupyter:token"):
    red = redis.StrictRedis(redis_server, port, charset="utf-8", decode_responses=True)
    j_token = red.get(token_path)
    print('Jupyter> Token', j_token)
    return j_token


def print_kernels(jupyter_server, j_headers):
    # Get list of kernels
    j_url = jupyter_server + '/api/kernels'
    print("Jupyter> URL", j_url)
    response = requests.get(j_url, headers=j_headers)
    if response.status_code == 200:
        kernels = json.loads(response.text)
        print('Jupyter> kernels:')
        for k in kernels:
            print('\t', k['name'], k['id'], k['execution_state'])
            jsocket = jupyterServer.replace('http', 'ws') + "/api/kernels/" + k["id"] + "/channels"
            print('\tsocket', jsocket)
    else:
        print(f"Jupyter> Error{response.text}")

async def list_rooms(sock):
    """
    Get the list of rooms
    """
    messageId = str(uuid.uuid4())
    msg_sub = { 'route': '/api/rooms', 'method': 'GET', 'id': messageId}
    # send the message
    await sock.send(json.dumps(msg_sub))
    return  messageId

async def create_room(sock, name, description):
    """
    Create a new room
    """
    messageId = str(uuid.uuid4())
    payload = {
      'name': name,
      'description': description,
      'color': 'red',
      'ownerId': '-',
      'isPrivate': False,
      'privatePin': '',
      'isListed': True,
    }
    msg_sub = { 'route': '/api/rooms', 'method': 'POST', 'id': messageId, 'body':payload}
    # send the message
    await sock.send(json.dumps(msg_sub))
    return  messageId

# Jupyter token for authentication
j_token = get_j_token(redisServer)
j_headers = {'Authorization': 'Token ' + j_token}
print_kernels(jupyterServer, j_headers)

#########################################################
###### Connect SAGE3 Web server                    ######
#########################################################

# JWT authentication token
token = ''
with open('jwt_sage3.json') as f:
    data = json.load(f)
    token = data['token']
print('SAGE3> Token:', token != '')


async def main():
  print('SAGE3> server url', wsServer)
  async with websockets.connect(wsServer, extra_headers={"Authorization": f"Bearer {token}"}) as ws:
    # async with websockets.connect(socket_server + socket_path) as ws:
    print('SAGE3> connected')

    # list_rooms: get the existing list of rooms
    msg_id = await list_rooms(ws)
    msg_room_id = None
    DATASCIENCE_ROOM = ''

    # loop to receive messages
    async for msg in ws:
      event = json.loads(msg)
      print(event)
      if 'success' in event:
        # return message from a previous request
        if msg_id == event['id'] and event['success'] == True:
          msg_id = None
          if 'data' in event:
            rooms = event['data']
            print('SAGE3> listRooms')
            found = False
            for r in rooms:
              # print(r['_id'], r['data']['name'])
              if r['data']['name'] == 'Data Science':
                found = True
                ###############################
                ###############################
                ###############################
                DATASCIENCE_ROOM = r['_id']
                ###############################
                ###############################
                ###############################
                ###############################
                print('\n\nDATASCIENCE_ROOM', DATASCIENCE_ROOM, '\n')
            if not found:
              print('SAGE3> need to create Data Science room')
              # create a new room
              msg_room_id = await create_room(ws, 'Data Science', 'Room for practicing Data Science')
        elif msg_room_id == event['id'] and event['success'] == True:
            new_room = event['data']
            ###############################
            ###############################
            ###############################
            ###############################
            DATASCIENCE_ROOM = new_room['_id']
            ###############################
            ###############################
            ###############################
            ###############################
            print('\n\nDATASCIENCE_ROOM', DATASCIENCE_ROOM, '\n')

if __name__ == '__main__':
    asyncio.run(main())
