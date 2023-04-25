import json
import websockets
import uuid

message = {'header': {'msg_id': None,
                      'username': 'tests',
                      'session': None,
                      'msg_type': 'execute_request',
                      'version': '5.0'},
           'parent_header': {},
           'metadata': {},
           'content': {'code': "code",
                       'silent': False,
                       'store_history': True,
                       'user_expressions': {},
                       'allow_stdin': True,
                       'allow_stdout': True,
                       'stop_on_error': True},
           'buffers': {}}

class WebSocketManager:
    def __init__(self, token):
        self.session_id = uuid.uuid4().hex

        self.token = token
        self.headers = {'Authorization': f'Token {token}'}
        self.websockets = {}

    async def connect(self, kernel_id):
        web_server_address = f"ws://localhost/api/kernels/{kernel_id}/channels?session_id={self.session_id}"
        self.websockets[kernel_id] = await websockets.connect(web_server_address, extra_headers=self.headers)

    async def send_message(self, kernel_id, message):
        if self.websockets[kernel_id] is None:
            await self.connect(kernel_id)
        await self.websockets[kernel_id].send(json.dumps(message))

    async def close(self, kernel_id):
        if self.websockets[kernel_id] is not None:
            await self.websockets[kernel_id].close()

    async def close_all(self):
        for kernel_id in self.websockets:
            if self.websockets[kernel_id] is not None:
                await self.websockets[kernel_id].close()



    async def run_code(self, kernel_id, code):
        message["content"]["code"] = code
        message["header"]["msg_id"] = uuid.uuid4().hex
        message["header"]["session "] = websocket_manager.session_id
        if self.websockets[kernel_id].closed:
            print("Disconnected. Reconnecting...")
            await self.connect(kernel_id)
        await self.send_message(kernel_id, message)

        while True:
            received_message = await websocket_manager.websockets[kernel_id].recv()
            received_message = json.loads(received_message)
            print(received_message["content"])
            if "status" in received_message["content"]:
                break


kernel_id = "87609736-d882-41c3-8bc1-898a32f54aec"
token = "da792de798fb2b96"
websocket_manager = WebSocketManager(token)
code = "print(a)"
await websocket_manager.connect(kernel_id)
await websocket_manager.run_code(kernel_id, code)
await websocket_manager.close(kernel_id)
