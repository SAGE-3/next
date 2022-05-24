#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

import time
from threading import Thread
from smartbits.smartbit import SmartBit
from smartbits.utils.smartbits_utils import _action
import asyncio
from concurrent.futures import ThreadPoolExecutor
from IPython import get_ipython
import json

import concurrent.futures

#TODO: add saving message to redis json db

class JupyterCellSmartBit(SmartBit):

    def __init__(self, raw_cell, wall_coordinates=None, redis_client=None):
        print(f"{redis_client}")
        if wall_coordinates == None:
            self.wall_coordinates = (0, 0, 0, 0)
        super().__init__(wall_coordinates, redis_client)

        self.raw_cell = raw_cell
        self._ipython = get_ipython()

        self._executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
        self._future = None
        self._exec_result = None


    def jsonify(self):
        """
        :return:
        """
        # we don't need the image field, in the json version of the object
        # we cannot jsonify the object anyway.
        return SmartBit.jsonify(self, ignore=['_ipython', '_new_loop', '_executor'])

    def cleanup(self):
        self._executor.shutdown()

    def __run(self):
        #print("More work %s" % self.raw_cell)
        self._exec_result = self._ipython.run_cell(self.raw_cell)
        #print("Finished more work %s" % self.raw_cell)

    def publish_results(self, future):

        while future.done() != True:
            time.sleep(0.01)

        if self._exec_result.success:
            # print("Success, I am publishing the results down")
            self._redis_client.publish("execute:down", json.dumps(
                {"smartbit_id": self.smartbit_id, "action": "update","action_results": self._exec_result.result}
            ))
        else:
            # print("Code execution failure, I am publishing the error down")
            params= {"error_before_exec": self._exec_result.error_before_exec,
                     "error_before_exec": self._exec_result.error_in_exec}
            self._redis_client.publish("execute:down", json.dumps({"smartbit_id": self.smartbit_id, "action": "update", "action_results": params}))



    @_action(enqueue=False)
    def run_cell(self):
        self.future = self._executor.submit(self.__run)
        self.future.add_done_callback(self.publish_results)
        return {"channel": "execute:down", "action": "update", "action_results": {"status": "executing"}}


