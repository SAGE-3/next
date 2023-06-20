# Handling Streaming
# First, we need a callback func. Then, when we get a message in handle_output and
# The message is of type received_message["msg_type"] == "stream", then we call the callback func.
# on the partially accumlated or on each message. (easier to do the partially accumulated).
# At the end, if we called on the partially accumulated, we don't need to call at the return
# if we call on each individual message, we need to make sure TypeScript  accumulates the results.


from foresight.utils.generic_utils import create_kernel_message

import json
import uuid
from collections import defaultdict

import websockets


class KernelProxyBlocking:
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

        if kernel_id in self.websockets:
            print(f"is closed: {self.websockets[kernel_id].closed}")
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
                # print(f"Stream and received {received_message['content']['text']}")
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
kernel_proxy = KernelProxyBlocking(token)

# await kernel_proxy.connect(kernel_id)
# code = "print(a)"
# await kernel_proxy.run_code(kernel_id, code)

# if __name__ == "__main__":
#     kernel_id = "87609736-d882-41c3-8bc1-898a32f54aec"
#     token = "da792de798fb2b96"
#     kernel_proxy = KernelProxyBlocking(token)
#     code = "print(a)"
#
#
#     async def main():
#         await kernel_proxy.connect(kernel_id)
#         await kernel_proxy.run_code(kernel_id, code)
#         await websockekernel_proxyt_manager.close(kernel_id)
#
#     import asyncio
#     asyncio.run(main())

