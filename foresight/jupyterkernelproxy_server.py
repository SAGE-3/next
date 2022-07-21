from flask import Flask, request
from  jupyter_client import AsyncKernelClient
import json
import redis

import asyncio
asyncio.set_event_loop(asyncio.new_event_loop())

kc = AsyncKernelClient()

kernel_config = json.load(open("config/kernel-s3-next.json"))
kc.load_connection_info(kernel_config)
red = redis.StrictRedis('localhost', 6379, charset="utf-8", decode_responses=True)

app = Flask(__name__)

@app.route('/exec', methods=['POST'])
async def run_code():
    global i
    result = {}
    print("i am here")
    code = request.data.decode("utf-8")
    print(code)
    parent_msg_id = kc.execute(code)
    result["request_id"] = parent_msg_id
    while True:
        try:
            msg = await kc.get_iopub_msg(timeout=1)
            if msg["parent_header"]['msg_id'] != parent_msg_id:
                continue
            print(f"message is {msg}")
            if 'execution_state' in msg['content'] and msg['content']['execution_state'] == 'idle':
                break
            if msg['msg_type'] in ['execute_result', 'display_data', "error"]:
                result[msg['msg_type']] = msg['content']
        except:
            break
    print(f"Result is {result}")
    if 'display_data' in result:
        del(result['execute_result'])
    red.publish('jupyter_outputs', json.dumps(result))
    return {"request_id": parent_msg_id}
