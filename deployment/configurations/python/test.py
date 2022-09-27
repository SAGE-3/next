import json
import requests
import datetime
import uuid
import asyncio
import websockets
import base64

# A unique session ID
sessionID = uuid.uuid4().hex

# Build execute request
def execute_request(code):
    msg_type = 'execute_request'
    content = {'code': code, 'silent': False}
    hdr = {'msg_id': uuid.uuid1().hex,
           'username': 'test',
           'data': datetime.datetime.now().isoformat(),
           'msg_type': msg_type,
           'version': '5.0'}
    msg = {'header': hdr,
          'parent_header': hdr,
          'metadata': {},
          'channel': 'shell', # requests for code execution, object information, prompts, etc
          'content': content}
    return msg

# Process messages from the kernel
async def consumer(mesg):
  msg = json.loads(mesg)
  if msg['msg_type'] == 'execute_input':
    print('[%d]> %s' % (msg['content']['execution_count'], msg['content']['code']))
  elif msg['msg_type'] == 'execute_reply':
    print('[%d]> %s' % (msg['content']['execution_count'], msg['content']['status']))
  elif msg['msg_type'] == 'status':
    print('->', msg['content']['execution_state'])
  elif msg['msg_type'] == 'stream':
    print('->', msg['content']['text'].strip())
  elif msg['msg_type'] == 'display_data':
    # text/plain output
    print('->', msg['content']['data']['text/plain'])
    # image output
    with open('output.png', 'wb') as file:
      img = base64.b64decode(msg['content']['data']['image/png'])
      file.write(img)
  else:
    print('Got>', msg)

# Info to connect to the jupyter kernel
# Inside docker compose, the jupyter server is called 'jupyter' (see docker-compose.yml)
base = "http://jupyter:8888"
# Jupyter auth token
jupyter_token = "4b8802de45fbb34d"
# The kernel we are going to use
s3kern = "6fc19ae4-89da-4611-96b3-2acdd268f7ad"

print('Looking for kernel: {}'.format(s3kern))

# Jupyter token for authentication
headers = {'Authorization': 'Token ' + jupyter_token}

# Get list of kernels
j_url = base + '/api/kernels'
response = requests.get(j_url, headers=headers)
if response.status_code != 200:
  print('Error>', response.text)
  exit(1)
kernels = json.loads(response.text)
kernel = None
for k in kernels:
  # that's my kernel
  if k['id'] == s3kern:
    print('\t-', k['name'], k['id'], k['execution_state'])
    kernel = k

if not kernel:
  print('Error> Kernel not found')
  exit(1)

# Code to execute by the kernel
code = """import matplotlib.pyplot as plt
fig, ax = plt.subplots()
fruits = ['apple', 'blueberry', 'cherry', 'orange']
counts = [40, 100, 30, 55]
bar_labels = ['red', 'blue', '_red', 'orange']
bar_colors = ['tab:red', 'tab:blue', 'tab:red', 'tab:orange']
ax.bar(fruits, counts, label=bar_labels, color=bar_colors)
ax.set_ylabel('fruit supply')
ax.set_title('Fruit supply by kind and color')
ax.legend(title='Fruit color')
plt.show()"""
# code = "print(a)"

# Execution request/reply is done on websockets channels
async def Commands():
  if kernel:
    socket_url = base.replace('http', 'ws') +  "/api/kernels/"+kernel["id"]+"/channels"
    # session: not really required, but remove a warning from the server
    socket_url += '?session_id=' + sessionID
    print('Connecting>', socket_url)
    async with websockets.connect(socket_url, extra_headers=headers) as websocket:
      e = execute_request(code)
      res = await websocket.send(json.dumps(e))
      async for message in websocket:
          await consumer(message)

# Asyncio loop
asyncio.run(Commands())
