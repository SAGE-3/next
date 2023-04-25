from utils.generic_utils import create_kernel_message

import json
import uuid
from collections import defaultdict

import websockets


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
        if kernel_id not in  self.websockets:
            await self.connect(kernel_id)
        await self.websockets[kernel_id].send(json.dumps(message))

    async def close(self, kernel_id):
        if self.websockets[kernel_id] is not None:
            await self.websockets[kernel_id].close()
        del self.websockets[kernel_id]

    async def close_all(self):
        for kernel_id in self.websockets:
            if self.websockets[kernel_id] is not None:
                await self.websockets[kernel_id].close()
        self.websockets = {}

    async def run_code(self, kernel_id, code):
        message = create_kernel_message(self.session_id)
        message["content"]["code"] = code
        msg_id = uuid.uuid4().hex
        message["header"]["msg_id"] = msg_id
        message["header"]["session"] = self.session_id
        output = defaultdict(str)

        if kernel_id in self.websockets and self.websockets[kernel_id].closed:
            print("Disconnected. Reconnecting...")
            await self.connect(kernel_id)
        await self.send_message(kernel_id, message)

        return await self.collect_output(kernel_id)

    async def collect_output(self, kernel_id):
        output_received = False
        execute_reply_received = False
        idle_status_received = False
        error_received = False
        output = defaultdict(str)

        while True:
            received_message = await self.websockets[kernel_id].recv()
            received_message = json.loads(received_message)
            # print(received_message["msg_type"], received_message["content"])

            if received_message["msg_type"] == "stream":
                if not "text" in output:
                    output["text"] = ""
                output["text"] += received_message["content"]["text"]
                output_received = True
            elif received_message["msg_type"] == "execute_result":
                output["text/plain"] += received_message["content"]["data"]["text/plain"]
                if "text/html" in received_message["content"]["data"]:
                    output["text/html"] += received_message["content"]["data"]["text/html"]
                output_received = True
            elif received_message["msg_type"] == "display_data":
                output["text/plain"] += received_message["content"]["data"]["text/plain"]
                if "image/png" in received_message["content"]["data"]:
                    output["image/png"] += received_message["content"]["data"]["image/png"]
                output_received = True
            elif received_message["msg_type"] == "execute_reply":
                if received_message["content"]["status"] == "error":
                    output["traceback"] = received_message["content"]["traceback"]
                    output["ename"] += received_message["content"]["ename"]
                    output["evalue"] += received_message["content"]["evalue"]
                    error_received = True
                execute_reply_received = True
            elif received_message["msg_type"] == "status" and received_message["content"]["execution_state"] == "idle":
                idle_status_received = True
            if execute_reply_received and idle_status_received and (output_received or error_received or True):
                return dict(output)


kernel_id = "87609736-d882-41c3-8bc1-898a32f54aec"
token = "da792de798fb2b96"
websocket_manager = WebSocketManager(token)

await websocket_manager.connect(kernel_id)

code = "print(a)"
await websocket_manager.run_code(kernel_id, code)

# if __name__ == "__main__":
#     kernel_id = "87609736-d882-41c3-8bc1-898a32f54aec"
#     token = "da792de798fb2b96"
#     websocket_manager = WebSocketManager(token)
#     code = "print(a)"
#
#
#     async def main():
#         await websocket_manager.connect(kernel_id)
#         await websocket_manager.run_code(kernel_id, code)
#         await websocket_manager.close(kernel_id)
#
#     import asyncio
#     asyncio.run(main())

