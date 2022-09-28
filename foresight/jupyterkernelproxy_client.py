# TODO: should this have it's own SageComm info or should it use the proxy instead?
import time


import asyncio
import threading
import redis
import requests


class Borg:
    """
    The Borg pattern to store execution state across instances
    """
    _shared_state = {}
    def __init__(self):
        self.__dict__ = self._shared_state

class JupyterKernelClient(Borg):
    """
    Jupyter kernel is responsible for
    """
    def __init__(self, url, startup_timeout=60):
        Borg.__init__(self)
        if not hasattr(self, "redis_serve"):
            self.url = url
            self.redis_server = redis.StrictRedis(host='localhost', port=6379, db=0)
            self.pubsub = self.redis_server.pubsub()
            self.pubsub.subscribe('jupyter_outputs')

            # start an independent listening process.
            self.stop_thread = False # keep on checking until this changes to false
            self.msg_checker = threading.Thread(target=self.process_reponse)
            self.msg_checker.start()
            self.callback_info = {}



    # execut a command
    def execute(self, command_info):
        """
        :param command_info: a dict with three keys, 1- uuid, 2-call_fn, a callback function and 3 code to run
        :return:
        """
        user_passed_uuid = command_info["uuid"]
        callback_fn = command_info["call_fn"]
        command = command_info["code"]
        # print(f"!!!!!EXECUTING COMMAND {command}!!!!!!")

        try:
            msg = requests.post(self.url, data = command).json()
        except:
            raise Exception(f"couldn't run code on {self.url}")
        # msg={"request_id":"bogus_id"}
        self.callback_info[msg['request_id']] = (user_passed_uuid, callback_fn)
        return msg



    def process_reponse(self):
        while True:
            # print("I am processing reponse")
            msg = self.pubsub.get_message()
            if msg:
                # ignore first message
                if msg["data"] == 1:
                    continue
                # print(f"********************I am the client and I got the following from pubsub  is:\n {msg}")
                msg = msg['data'].decode("utf-8")
                msg=eval(msg)
                request_id = msg['request_id']
                self.callback_info[request_id][1](msg)

            time.sleep(1)  # be nice to the system :)





