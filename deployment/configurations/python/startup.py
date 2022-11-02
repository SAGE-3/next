import json
import uuid
import asyncio
import websockets
import os
import redis
import requests
import pprint

printer = pprint.PrettyPrinter(indent=1, depth=5, width=120, compact=True)

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

async def list_boards(sock):
    """
    Get the list of boards
    """
    messageId = str(uuid.uuid4())
    msg_sub = { 'route': '/api/boards', 'method': 'GET', 'id': messageId}
    # send the message
    await sock.send(json.dumps(msg_sub))
    return  messageId

async def list_rooms(sock):
    """
    Get the list of rooms
    """
    messageId = str(uuid.uuid4())
    msg_sub = { 'route': '/api/rooms', 'method': 'GET', 'id': messageId}
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
      msg_id = await list_boards(ws)

      # loop to receive messages
      async for msg in ws:
          event = json.loads(msg)
          if 'success' in event:
            # return message from a previous request
            if msg_id == event['id'] and event['success'] == True:
              if 'data' in event:
                rooms = event['data']
                print('SAGE3> listRooms')
                printer.pprint(rooms)

if __name__ == '__main__':
    asyncio.run(main())
