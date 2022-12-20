import asyncio
from urllib import response
import websockets
import requests
import json
import uuid


# server info
server = 'localhost:3333'
web_server = 'http://' + server
socket_server = 'ws://' + server
socket_path = '/api'

# Server namespace (get it from your admin)
sage3_namespace = uuid.UUID('XX-XX-XX-XX-XX')

# the asset I want to retrieve
asset_id = '901a3613-cd1e-4813-9411-418a2af703eb'

# generate the token
token = uuid.uuid5(sage3_namespace, asset_id)

# public url
url = web_server + '/api/files/' + asset_id + '/' + str(token)
print(url)

r = requests.get(url)

filename = "out.pdf"

with open(filename, 'wb') as f:
  f.write(r.content)
  print('saved:', filename)
