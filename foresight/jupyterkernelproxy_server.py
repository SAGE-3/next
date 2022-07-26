# TODO: Check throught the kernel client that the kernel is actually alive
from flask import Flask, request

from  jupyter_client import AsyncKernelClient
import asyncio
import json
import redis
import queue

kc = AsyncKernelClient()
app = Flask(__name__)
red = None


@app.before_first_request
async def before_first_request():
    global red
    global kc
    print(f"\n\n\n\nrunning this first and kc is {kc}\n\n\n")

    kernel_config = json.load(open("config/kernel-s3-next.json"))
    kc.load_connection_info(kernel_config)
    red = redis.StrictRedis('localhost', 6379, charset="utf-8", decode_responses=True)
    # For some reason, sometimes the first execute is ignored
    try:
        kc.execute("")
        await kc.get_iopub_msg(timeout=1)
    except:
        print("The expected error")
        pass


@app.route('/exec', methods=['POST'])
async def run_code():
    result = {}
    print("i am here")
    code = request.data.decode("utf-8")
    parent_msg_id = kc.execute(code)
    result["request_id"] = parent_msg_id
    print(f"Executing code {code} and parent message id is {parent_msg_id}")

    while True:
        try:
            msg = await kc.get_iopub_msg(timeout=1)
            if msg["parent_header"]['msg_id'] != parent_msg_id:
                print("in 1")
                continue
            print(f"\tmsg is {msg}")
            if 'execution_state' in msg['content'] and msg['content']['execution_state'] == 'idle':
                print("in 2")
                break
            if msg['msg_type'] in ['execute_result', 'display_data', "error", "stream"]:
                print("in 3")
                result[msg['msg_type']] = msg['content']
        except queue.Empty:
            print("queue is empty")
        except Exception as e:
            raise Exception(f"Error in jupyter kernel sever: {e} ")
    print(f"Result is {result}")
    if 'display_data' in result:
        del(result['execute_result'])
    red.publish('jupyter_outputs', json.dumps(result))
    return {"request_id": parent_msg_id}
