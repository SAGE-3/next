import os
import json
import requests
import datetime
import uuid
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

# Get list of kernels
j_url = base + '/api/kernels'
response = requests.get(j_url, headers=headers)
kernels = json.loads(response.text)
print('Kernels')
for k in kernels:
    print('\t-', k['name'], k['id'], k['execution_state'])

# Get list of sessions
j_url = base + '/api/sessions'
response = requests.get(j_url, headers=headers)
sessions = json.loads(response.text)
print('Sessions')
for s in sessions:
    print('\t-', s['name'], s['id'], s['type'], 'kernel:',
          s['kernel']['name'], s['kernel']['execution_state'])


# Get list of files
j_url = base + '/api/contents'
response = requests.get(j_url, headers=headers)
contents = json.loads(response.text)
print('Files')
for f in contents['content']:
    print('\t', f['path'])
