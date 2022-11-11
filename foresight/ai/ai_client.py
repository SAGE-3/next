from funcx.sdk.client import FuncXClient
# from config import funcx
import time
import threading
from utils.borg import Borg
from utils import logging_config

logger = logging_config.get_console_logger()


# TODO: move the borg class to its own file


class AIClient(Borg):
    """
    ai Client get requests to execute a model, executed it, gets the results and propagates them to the client.
    """

    def __init__(self, check_every=2.5):
        Borg.__init__(self)
        self.check_every = check_every
        self.callback_info = {}
        self.running_jobs = set()

        self.fxc = FuncXClient()

        self.stop_thread = False  # keep on checking until this changes to false
        self.msg_checker = threading.Thread(target=self.process_response,
                                            kwargs={"check_every": self.check_every})
        self.msg_checker.start()

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
        funcx_uuid = command_info["funcx_uuid"]
        endpoint_uuid = command_info["endpoint_uuid"]
        data = command_info["data"]

        resp = self.fxc.run(**data, function_id=funcx_uuid,
                            endpoint_id=endpoint_uuid)
        self.running_jobs.add(resp)

        self.callback_info[resp] = (app_uuid, msg_uuid, callback_fn)

        return resp

    def process_response(self, check_every):
        while not self.stop_thread:
            tasks_to_remove = set()
            for task_id in self.running_jobs:
                resp = self.fxc.get_task(task_id)
                if not resp['pending']:
                    if resp['status'] != 'success':
                        # TODO: Handle the error
                        logger.error(f"Error while running an AI job {resp}")
                    else:
                        result = resp['result']
                        try:
                            app_uuid = self.callback_info[task_id][0]
                            msg_uuid = self.callback_info[task_id][1]
                            callback_fn = self.callback_info[task_id][2]
                            callback_fn(app_uuid, msg_uuid, result)
                            tasks_to_remove.add(task_id)
                        except Exception as e:
                            logger.error(f"rror while running an AI job {resp}")
                        del self.callback_info[task_id]
            self.running_jobs -= tasks_to_remove

            time.sleep(self.check_every)  # be nice to the system :)
            if self.stop_thread:
                if len(self.running_jobs):
                    print("Exiting the ai Client but queue still contains not communicated jobs")
                break

    def clean_up(self):
        self.stop_thread = True

