from funcx.sdk.client import FuncXClient
from config import funcx
import time

class Borg:
    """
    The Borg pattern to store execution state across instances
    """
    _shared_state = {}

    def __init__(self):
        self.__dict__ = self._shared_state


class AIClient(Borg):
    """
    ai Client get requests to execute a model, executed it, gets the results and propagates them to the client.
    """

    def __init__(self):
        Borg.__init__(self)
        self.callback_info = {}
        self.running_jobs = set()
        self.fxc = FuncXClient()

    def execute(self, command_info):
        """
        Got request to exectue. everything i need is in command_info
        TODO: should we figure out if input is appropriate for the passed model?
        :param command_info: contains model id, model data input
        :return: Execution UUID?
        """
        app_uuid = command_info["app_uuid"]
        msg_uuid = command_info["msg_uuid"]

        callback_fn = command_info["callback_fn"]

        model_id = command_info["model_id"]
        data = command_info["data"]

        resp = self.fxc.run(model_id, data, function_id=funcx["test_ai_func_uuid"],
                            endpoint_id=funcx["endpoint_id"])
        self.running_jobs.add(resp)

        self.callback_info[resp] = (app_uuid, msg_uuid, callback_fn)

        return resp

    def process_response(self):
        while True:
            task_id = ""
            resp = self.fxc.get_task(task_id)

            if not resp['pending']:
                if resp['status'] != 'success':
                    print("report it")
                    pass
                else:
                    print("sending the results back")

                # ignore first message
                if msg["data"] == 1:
                    continue
                msg = msg['data'].decode("utf-8")
                msg=eval(msg)
                request_id = msg['request_id']
                self.callback_info[request_id][1](msg)

            time.sleep(1)  # be nice to the system :)