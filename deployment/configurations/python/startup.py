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

red = redis.StrictRedis(redisServer, 6379, charset="utf-8", decode_responses=True)
jtoken = red.get('config:jupyter:token')
print('Jupyter> Token', jtoken)

#########################################################
###### Connect to Jupyter and get list of sessions ######
#########################################################

# Jupyter token for authentication
jheaders = {'Authorization': 'Token ' + jtoken}

# Get list of kernels
j_url = jupyterServer + '/api/kernels'
print('Jupyter> url', j_url)
response = requests.get(j_url, headers=jheaders)
if response.status_code == 200:
  kernels = json.loads(response.text)
  print('Jupyter> kernels:')
  for k in kernels:
    print('\t-', k['name'], k['id'], k['execution_state'])
    jsocket = jupyterServer.replace('http', 'ws') +  "/api/kernels/"+k["id"]+"/channels"
    print('\t- socket', jsocket)

else:
  print('Jupyter> Error', response.text)


#########################################################
###### Connect SAGE3 Web server                    ######
#########################################################

# JWT authentication token
token = ''
with open('jwt_sage3.json') as f:
    data = json.load(f)
    token = data['token']
print('SAGE3> Token:', token)

async def listBoards(sock):
    """Get the list of boards
    """
    messageId = str(uuid.uuid4())
    msg_sub = { 'route': '/api/boards', 'method': 'GET', 'id': messageId}
    # send the message
    await sock.send(json.dumps(msg_sub))
    return  messageId

async def main():
  print('SAGE3> server url', wsServer)
  async with websockets.connect(wsServer, extra_headers={"Authorization": f"Bearer {token}"}) as ws:
      # async with websockets.connect(socket_server + socket_path) as ws:
      print('SAGE3> connected')

      # listBoards: send the message and wait for the responses
      msg_id = await listBoards(ws)

      # loop to receive messages
      async for msg in ws:
          event = json.loads(msg)
          if 'success' in event:
            # return message from a previous request
            if msg_id == event['id'] and event['success'] == True:
              if 'data' in event:
                boards = event['data']
                print('SAGE3> listBoards')
                printer.pprint(boards)

if __name__ == '__main__':
    asyncio.run(main())
