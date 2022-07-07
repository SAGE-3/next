import asyncio
import time

from jupyter_client import AsyncKernelManager
import threading

import asyncio
import threading
import json
from jupyter_client import AsyncKernelClient
from multiprocessing import Queue

class AsyncioEventLoopThread(threading.Thread):
    def __init__(self, *args, loop=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.loop = loop or asyncio.new_event_loop()
        self.running = False

    def run(self):
        self.running = True
        self.loop.run_forever()

    def run_coro(self, coro):
        return asyncio.run_coroutine_threadsafe(coro, loop=self.loop).result()

    def stop(self):
        self.running = False
        # self.kc.shutdown()
        self.loop.call_soon_threadsafe(self.loop.stop)
        print("waiting for the asyncio loop to stop")
        time.sleep(1)
        # self.join()


class Borg:
    """
    The Borg pattern to store execution state across instances
    """
    _shared_state = {}
    def __init__(self):
        self.__dict__ = self._shared_state

class JupyterKernelProxy(Borg):
    """
    Jupyter kernel is responsible for
    """

    def __init__(self, kernel_config="config/kernel-s3-next.json", startup_timeout=60,):
        Borg.__init__(self)
        if not hasattr(self, "kernel_config"):
            self.kernel_config = json.load(open(kernel_config))
            self.startup_timeout = startup_timeout
            # self.kernel_name = kernel_name
            self.thr = AsyncioEventLoopThread()
            self.thr.start()
            self.iopub_responses = Queue()
            self.callback_info = {}
            self.kc = None

            self.start_new_async_kernel()
            if self.kc is None:
                raise Exception("Cannot log onto the server")

            # start an independent listening process.
            self.stop_thread = False # keep on checking until this changes to false
            self.msg_checker = threading.Thread(target=self.process_iopub)
            self.msg_checker.start()

    # decorator for async functions that need to run in
    # as coroutine in a separate thread
    def _run_coro(_func):
        def wrapper(self, ):
            res = self.thr.run_coro(_func(self))
            # clearing the func and the and params
            return res
        return wrapper

    @_run_coro
    async def start_new_async_kernel(self):
        """Start a new async kernel client"""
        # self.km = AsyncKernelManager(kernel_name=self.kernel_name)
        # await self.km.start_kernel()
        self.kc = AsyncKernelClient()
        self.kc.load_connection_info(self.kernel_config)
        # self.kc.start_channels()
        # try:
        #     await self.kc.wait_for_ready(timeout=self.startup_timeout)
        # except RuntimeError as e:
        #     self.kc.stop_channels()
        #     await self.km.shutdown_kernel()
        #     raise e

    # execut a command
    def execute(self, command_info):
        """

        :param command_info: a dict with three keys, 1- uuid, 2-call_fn, a callback function and 3 code to run
        :return:
        """
        code_uuid = command_info["uuid"]
        callback_fn = command_info["call_fn"]
        self.callback_info[code_uuid] = callback_fn
        command = command_info["code"]
        return self.kc.execute(command)

    # TODO make sure to top threads only if it's not running (leads to block)
    @_run_coro
    async def cleanup(self):
        self.stop_thread = True
        print("Stopping processes")
        # self.kc.shutdown()
        await asyncio.sleep(1)
        print("Done Stopping processes")
        self.thr.stop()
        print("Done Stopping processes")


    @_run_coro
    async def process_iopub(self):
        while True:
            if self.stop_thread:
                print("Stopping thread that checks for messages")
                break
            try:
                msg = await self.kc.get_iopub_msg(timeout=1)
                # print(f"done checking message and msg is {msg}")
                # ignore messages that report execution_state (busy or idle messages)
                # also ignore messages that report the code
                print(f"adding a message {msg}")

                msg_exec_state = msg["content"].get("execution_state", None)
                if msg_exec_state is not None or msg["content"].get("code", None) is not None:
                    continue
                self.iopub_responses.put(msg)
            except:
                print("In except")
        print("Done with the While True loop that check for messages")
        # self.msg_checker.join()
        print("Successfully joined the loop that check for messages")



# def start_new_kernel(startup_timeout=60, kernel_name='python', **kwargs):
#     """Start a new kernel, and return its Manager and Client"""
#     km = KernelManager()
#     km.start_kernel()
#     kc = km.client()
#     kc.start_channels()
#     try:
#         kc.wait_for_ready(timeout=startup_timeout)
#     except RuntimeError:
#         kc.stop_channels()
#         km.shutdown_kernel()
#         raise
#
#     return km, kc

# async def start_new_async_kernel(startup_timeout=60, kernel_name='python', **kwargs):
#     """Start a new kernel, and return its Manager and Client"""
#     km = AsyncKernelManager(kernel_name=kernel_name)
#     await km.start_kernel(**kwargs)
#     kc = km.client()
#     kc.start_channels()
#     try:
#         await kc.wait_for_ready(timeout=startup_timeout)
#     except RuntimeError:
#         kc.stop_channels()
#         await km.shutdown_kernel()
#         raise
#     return (km, kc)

