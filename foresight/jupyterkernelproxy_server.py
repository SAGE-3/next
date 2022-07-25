# TODO: Check throught the kernel client that the kernel is actually alive
from flask import Flask, request

from  jupyter_client import AsyncKernelClient
import asyncio
import json
import redis


kc = AsyncKernelClient()
app = Flask(__name__)
red = None


@app.before_first_request
async def before_first_request():
    global red
    print("\n\n\n\nrunning this first\n\n\n")

    kernel_config = json.load(open("config/kernel-s3-next.json"))
    kc.load_connection_info(kernel_config)
    red = redis.StrictRedis('localhost', 6379, charset="utf-8", decode_responses=True)
    # For some reason, sometimes the first execute is ignored
    try:
        kc.execute("")
        await kc.get_iopub_msg(timeout=0)
    except:
        print("The expected error")
        pass


@app.route('/exec', methods=['POST'])
async def run_code():
    result = {}
    print("i am here")
    code = request.data.decode("utf-8")
    print(f"Executing code {code}")
    parent_msg_id = kc.execute(code)
    result["request_id"] = parent_msg_id
    while True:
        try:
            msg = await kc.get_iopub_msg(timeout=1)
            #print(f"msg is {msg}")
            if msg["parent_header"]['msg_id'] != parent_msg_id:
                print("in 1")
                continue
            if 'execution_state' in msg['content'] and msg['content']['execution_state'] == 'idle':
                print("in 2")
                break
            if msg['msg_type'] in ['execute_result', 'display_data', "error", "stream"]:
                print("in 3")
                result[msg['msg_type']] = msg['content']
        except Exception as e:
            #print("Wow Somthing went wrong")
            raise Exception(f"Error in jupyter kernel sever: {e} ")
    print(f"Result is {result}")
    if 'display_data' in result:
        del(result['execute_result'])
    red.publish('jupyter_outputs', json.dumps(result))
    return {"request_id": parent_msg_id}
