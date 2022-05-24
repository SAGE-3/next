#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

import IPython
from smartbits.smartbit import SmartBit
from IPython import get_ipython
import concurrent.futures
import time
import sys
import io
import json
import matplotlib.artist
import base64
import tempfile
import matplotlib.pyplot as plt
import os
import requests
import pandas as pd


class SageCell(SmartBit):

    state_name = "sagecell"
    # Todo add this somewhere so it's set by default and can be overridden in the child class.
    state_type = "reducer"

    def __init__(self, data):

        super().__init__(self.state_name, data)

        # Ipython executor code
        self._ipython = get_ipython()
        self._executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
        self._future = None
        self._exec_result = None
        self.exec_stdout = None

        # State information
        state = self.get_state()
        self.state = {"code": state["data"]["code"],
                      "output": state["data"]["output"],
                      "needrun": state["data"]["needrun"]
                      }

        # # add callbacks
        self.add_change_listener("needrun", self.update_need_run)

    @property
    def code(self):
        return self.state["code"]

    @code.setter
    def code(self, value):
        if value != self.state["code"]:
            self.state["code"] = value
            self.update_state(self.state)

    @property
    def output(self):
        return self.state["output"]

    @output.setter
    def output(self, value):
        if value != self.state["output"]:
            self.state["output"] = value

    @property
    def needrun(self):
        return self.state["needrun"]

    @needrun.setter
    def needrun(self, value):
        # run only if we are not already running the cell
        # ignores unnecessary run clicks
        print("\n\n\n I am in need run \n\n")

        if value:
            print("Running the code")
            self.run_cell()

    def update_need_run(self, new_value):
        # only invoke this to trigger the run_cell()
        # if we don't check, we get an infinite loop
        if new_value == True:
            self.needrun = new_value

    def handle_results(self, future):

        # This can lead to errors if running an external command using `!`
        while self.future.done() != True:
            time.sleep(0.05)
            print("in the loop")

        if self._exec_result and self._exec_result.success:
            print(f"future.done is {self.future.done()}")
            print(
                f"Success, do something with the result, which is {self._exec_result.result}")
            # {"msg_type": "text", "data": "1827292"}

            # TODO figure out the best representation for the result
            out_type, out_data = self.determine_output_type(
                self._exec_result.result)
            output = f'{{"msg_type": "{out_type}", "data": "{out_data}"}}'

            self.output = output
        else:
            self.output = f'{{"msg_type": "error", "data": "{self._exec_result.error_in_exec}"}}'
            print("Execution: error")

        self.state["needrun"] = False
        print(f"Updating state, which is {self.state}")
        self.update_state_attr("output", self.state)

    def redirect_output(func):
        def wrapper(self):
            old_stdout = sys.stdout
            new_stdout = io.StringIO()
            sys.stdout = new_stdout
            func(self)
            self.exec_stdout = new_stdout.getvalue()
            sys.stdout = old_stdout

        return wrapper

    @redirect_output
    def __run(self):
        # the following will be needed if running out of context
        # loop = asyncio.new_event_loop()
        # asyncio.set_event_loop(loop)
        self._exec_result = self._ipython.run_cell(self.state["code"])
        return self._exec_result

    def run_cell(self):
        self.future = self._executor.submit(self.__run)
        self.future.add_done_callback(self.handle_results)
        # return {"message": "inform the client that I am processing"}

    # TODO: Should be its own class ... exectution CellExecutionResult
    #  it should know how figure out its own type and display itself.
    def determine_output_type(self, result):
        if result is None:
            if self.exec_stdout:
                print(
                    f"self.exec_stdout is {self.exec_stdout} and its type is {type(self.exec_stdout)}")
                # remove quotes around string
                output = "text", repr(self.exec_stdout)[1:-1]
                self.exec_stdout = None
                return output
            else:
                return "text", ""
        elif type(result) is list and len(result) > 0 and isinstance(result[0], matplotlib.artist.Artist):
            print("I've got a matplotlib plot ... handling it here")
            temp_file = tempfile.NamedTemporaryFile()
            file_name = temp_file.name + ".png"
            plt.savefig(file_name, format='png')

            # Upload the image
            # files = {'files': (os.path.basename(
            #     file_name), open(file_name, 'rb'))}
            # payload = {'targetX': self.x + self.width + 20, 'targetY': self.y,
            #            'targetWidth': self.width, 'targetHeight': self.height,
            #            'boardId': self.communication.board_uuid,
            #            'appName': 'imageViewer'
            #            }
            # url = self.communication.upload_url
            # head = self.communication._Sage3Communication__head
            # POST to upload the image
            # requests.post(url, headers=head, files=files, data=payload)

            encoded = base64.b64encode(
                open(file_name, 'rb').read()).decode('utf-8')
            return "image/png", encoded
        elif isinstance(result, pd.core.frame.DataFrame):
            print("Doing Something with the pandas DataFrame result")
            html_object = result.to_html(classes='sage-table', header='true')
            return "html", json.JSONEncoder().encode(repr(html_object))[1:-1]
        elif isinstance(result, IPython.core.display.HTML):
            print("Doing Something with the IPython HTML result")
            return "html", json.JSONEncoder().encode(repr(IPython.core.display.HTML(result)))[1:-1]
        else:
            return "text", json.JSONEncoder().encode(repr(result))[1:-1]
