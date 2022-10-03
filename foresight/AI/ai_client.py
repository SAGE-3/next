# TODO: should this have it's own SageComm info or should it use the proxy instead?
# import time
# import asyncio
# import threading
# import redis
# import requests
# from config import config as conf, prod_type
# import json


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
        if not hasattr(self, "XYZ"):
            pass

    def execute(self, command_info):
        pass

    def process_response(self):
        pass
