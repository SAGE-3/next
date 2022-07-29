# TODO: Check throught the kernel client that the kernel is actually alive
from flask import Flask, request
from  jupyter_client import AsyncKernelClient
import sys
import io
import json
import redis
import queue
import logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

from collections import defaultdict
kc = AsyncKernelClient()
session_id= None
app = Flask(__name__)
red = None
import os, contextlib

# def supress_stdout(func):
#     async def wrapper(*a, **ka):
#         with open(os.devnull, 'w') as devnull:
#             with contextlib.redirect_stdout(devnull):
#                 return await func(*a, **ka)
#     return wrapper



@app.before_first_request
async def before_first_request():
    global red
    global kc
    global session_id
    print(f"\n\n\n\nrunning this first and kc is {kc}\n\n\n")
    kernel_config = json.load(open("config/kernel-s3-next.json"))
    kc.load_connection_info(kernel_config)
    red = redis.StrictRedis('localhost', 6379, charset="utf-8", decode_responses=True)
    session_id= kc.session.parent.session.bsession
    # For some reason, sometimes the first execute is ignored
    print(f"my session id is {session_id}")


    try:
        kc.execute("")
        await kc.get_iopub_msg(timeout=0.001)
    except:
        print("The expected error")
        pass




@app.route('/exec', methods=['POST'])
async def run_code():
    global kc
    result = {}
    print("i am here")
    code = request.data.decode("utf-8")

    # Flushing the output and empty the queue before running a job
    # TODO: THIS IS A TEMP FIX> THIS DOES NOT GUARANTEE THAT ANOTHER THREAD IS
    #  NOT GOING TO TRY TO WRITE TO STDOUT, WHICH WILL BE PICKED UP LATER.
    # NEED TO HANDLE THIS BY TESTING WHETHER WE ARE IN EXECUTE MODE AND DELAYING PRINTING UNTIL DONE WITH EXECUTE MODE
    kc.execute("print('flushing stdout', flush=True)")
    while True:
        try:
            msg = await kc.get_iopub_msg(timeout=0.001)
            print("found a message in the queue")
        except queue.Empty:
            print("pre-run the queue is empty")
            break

    parent_msg_id = kc.execute(code)
    result["request_id"] = parent_msg_id
    print(f"Executing code {code} and parent message id is {parent_msg_id}")

    while True:
        try:
            msg = await kc.get_iopub_msg(timeout=0.001)
            print(f"\tmsg is {msg}")
            if msg["parent_header"]['msg_id'] != parent_msg_id:
                logger.info("in 1")
                continue
            if 'execution_state' in msg['content'] and msg['content']['execution_state'] == 'idle':
                logger.info("in 2")
            if msg['msg_type'] in ['execute_result', 'display_data', "error", "stream"]:
                logger.info("in 3")
                result[msg['msg_type']] = msg['content']
        except queue.Empty:
            print("queue is empty")
            break
        except Exception as e:
            raise Exception(f"Error in jupyter kernel sever: {e} ")
    # restore STDOUT

    print(f"Result is {result}")
    # if 'display_data' in result:
    #     del(result['execute_result'])
    red.publish('jupyter_outputs', json.dumps(result))
    return {"request_id": parent_msg_id}
