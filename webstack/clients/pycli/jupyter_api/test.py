import os
import json
import requests
import datetime
import uuid
import base64

from pprint import pprint
from websocket import create_connection

# REDIS
import redis

env_url = os.environ.get('REDIS_URL')
if env_url:
    redis_url = 'redis://' + env_url
else:
    redis_url = 'redis://localhost'
print("Redis URL:", redis_url)
# REDIS handle
r = redis.from_url(redis_url)
# Token to login
jupyter_token = r.get("config:jupyter:token").decode()
# localhost URL including token
jupyter_local_url = r.get("config:jupyter:localurl").decode()
# when using docker, use this URL
jupyter_external_url = r.get("config:jupyter:externalurl").decode()

print('Token', jupyter_token)
print('Local', jupyter_local_url)
print('Docker', jupyter_external_url)

# Get base URL
# base = 'http://localhost:8888'
base = jupyter_local_url.split('?')[0]
# remove trailing slash
base = base[:-1]
headers = {'Authorization': 'Token ' + jupyter_token}
print('Headers:', headers)

# Get server status
j_url = base + '/api/status'
response = requests.get(j_url, headers=headers)
status = json.loads(response.text)
print('Status: connections',
      status['connections'], ' - kernels:', status['kernels'])

# Get list of kernels
j_url = base + '/api/kernels'
response = requests.get(j_url, headers=headers)
kernels = json.loads(response.text)
print('Kernels', kernels)

# Create a new notebook
# j_url = base + '/api/contents/' + 'n1.ipynb'
# data = {'type': 'notebook', 'content': '# Hello World', 'format': 'text'}
# response = requests.put(j_url, headers=headers, json=data)
# note = json.loads(response.text)
# print('New notebook', note)

# Get list of files
j_url = base + '/api/contents'
response = requests.get(j_url, headers=headers)
contents = json.loads(response.text)
print('Files')
for f in contents['content']:
    print('\t', f['path'])

# Create a new kernel
j_url = base + '/api/kernels'
data = {'name': 'python3', 'path': '/'}
response = requests.post(j_url, headers=headers, json=data)
kernel = json.loads(response.text)
print('New kernel', kernel)

# Start the kernel
# j_url = base + '/api/kernels' + kernel['id'] + '/start'
# response = requests.post(j_url, headers=headers)
# ret = response.status_code
# print('Start kernel', ret)

# The token is written on stdout when you start the notebook
# notebook_path = '/n1.ipynb'
notebook_path = '/matplotlib1.ipynb'

# Load the notebook and get the code of each cell
j_url = base + '/api/contents' + notebook_path
response = requests.get(j_url, headers=headers)
file = json.loads(response.text)
code = [c['source'] for c in file['content']['cells'] if len(c['source']) > 0]
print('Code:', code)

# Execution request/reply is done on websockets channels
socket_url = base.replace('http', 'ws') + \
    "/api/kernels/"+kernel["id"]+"/channels"
print('Connecting to', socket_url)
ws = create_connection(socket_url, header=headers)


def send_execute_request(code):
    msg_type = 'execute_request'
    content = {'code': code, 'silent': False}
    hdr = {'msg_id': uuid.uuid1().hex,
           'username': 'test',
           'session': uuid.uuid1().hex,
           'data': datetime.datetime.now().isoformat(),
           'msg_type': msg_type,
           'version': '5.0'}
    msg = {'header': hdr, 'parent_header': hdr,
           'metadata': {},
           'content': content}
    return msg


for c in code:
    e = send_execute_request(c)
    p = json.dumps(e)
    print('C:', c)
    # print('E:', e)
    # print('P:', p)
    ws.send(p)

# We ignore all the other messages, we just get the code execution output
# (this needs to be improved for production to take into account errors, large cell output, images, etc.)
for i in range(0, len(code)):
    msg_type = ''
    while msg_type != "stream":
        rsp = json.loads(ws.recv())
        msg_type = rsp["msg_type"]
        # print('msg_type:', msg_type, rsp["content"])
        if msg_type == "display_data":
            data = rsp["content"]["data"]["image/png"]
            decoded = base64.b64decode(data)
            file = open("output.png", "wb")
            file.write(decoded)
            file.close()
            print('Image saved')

    print('Result', rsp["content"]["text"])

ws.close()

# # Get list of kernels
# j_url = base + '/api/kernels'
# response = requests.get(j_url, headers=headers)
# kernels = json.loads(response.text)
# print('Kernels', kernels)
