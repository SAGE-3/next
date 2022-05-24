import socketio
import threading
import uuid
import json
import requests
from datetime import datetime


# Socket client
sio = socketio.Client(logger=True, engineio_logger=True)

# server = 'https://minim1.evl.uic.edu'
server = 'http://localhost:4200'
# web socket path
path = "/api/connect-ws"
token = json.load( open('token_test.json'))['token']

@sio.event
def connect():
    print('WS> connection established')
    
@sio.event
def connect_error(message):
    print(f"Connection was rejected due to {message}")
    
@sio.event
async def disconnect():
    print('WS> disconnected from server')



sio.connect(server, socketio_path=path, auth={'token': token})
# sio.wait()
