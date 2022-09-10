# TODO: should this have it's own SageComm info or should it use the proxy instead?
import time


import asyncio
import threading
import json
from jupyter_client import AsyncKernelClient

class AsyncioEventLoopThread(threading.Thread):
    def __init__(self, *args, loop=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.running = False
        self.loop = asyncio.new_event_loop()


    def run(self):
        # print("I a running the thread......")
        self.running = True
        asyncio.set_event_loop(self.loop)
        self.loop.run_forever()

    def run_coro(self, coro):
        return asyncio.run_coroutine_threadsafe(coro, loop=self.loop).result()

    def stop(self):
        self.running = False
        # self.kc.shutdown()
        self.loop.call_soon_threadsafe(self.loop.stop)
        # print("waiting for the asyncio loop to stop")
        time.sleep(1)

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
    def __init__(self, kernel_config="config/kernel-s3-next.json", startup_timeout=60):
        Borg.__init__(self)
        if not hasattr(self, "kernel_config"):
            self.kernel_config = json.load(open(kernel_config))
            self.startup_timeout = startup_timeout
            # self.kernel_name = kernel_name
            self.thr = AsyncioEventLoopThread()
            self.thr.start()
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
        def wrapper(self, command_info=None):
            if command_info is not None:
                res = self.thr.run_coro(_func(self, command_info))
            else:
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
    @_run_coro
    async def execute(self, command_info):
        """
        :param command_info: a dict with three keys, 1- uuid, 2-call_fn, a callback function and 3 code to run
        :return:
        """
        user_passed_uuid = command_info["uuid"]
        callback_fn = command_info["call_fn"]
        command = command_info["code"]
        execute_uuid = self.kc.execute(command)
        self.callback_info[execute_uuid] = (user_passed_uuid, callback_fn)
        return execute_uuid

    # TODO make sure to top threads only if it's not running (leads to block)
    @_run_coro
    async def cleanup(self):
        self.stop_thread = True
        # print("Stopping processes")
        # self.kc.shutdown()
        await asyncio.sleep(.05)
        # print("Done Stopping processes")
        self.thr.stop()
        # print("Done Stopping processes")


    @_run_coro
    async def process_iopub(self, log_every = 10 ):
        time_since_logged = 0
        while True:
            if self.stop_thread:
                # print("Stopping thread that checks for messages")
                break
            try:
                msg = await self.kc.get_iopub_msg(timeout=1)
                # ignore messages that report execution_state (busy or idle messages)
                # also ignore messages that report the code

                msg_exec_state = msg["content"].get("execution_state", None)
                # if msg_exec_state is valid, it means the info contained is not necessary
                if msg_exec_state is None and msg["content"].get("code", None) is None:
                    # print(f"Handling message {msg}")
                    parent_msg_id = msg['parent_header']['msg_id']
                    # print(f"Calling fuction responsible and parent message id is {parent_msg_id}")

                    #todo: inspect function and make sure it has a first parameter that is ...
                    self.callback_info[parent_msg_id][1](msg)

                    # self.iopub_responses.put(msg)
            except:
                time_since_logged += 1
                if time_since_logged == log_every:
                    # print("Still checking")
                    time_since_logged = 0
        # print("Done with the While True loop that check for messages")
        # self.msg_checker.join()
        # print("Successfully joined the loop that check for messages")



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

