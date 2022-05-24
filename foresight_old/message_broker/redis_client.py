#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

import redis
import json
import signal
import threading
# TODO: add cleanup code to clean up if class is destructed for some reason!
# No release of Redis Connection?

class RedisThreadedClient():
    # __instance = None
    #
    # @staticmethod
    # def get_instance():
    #     """ Static access method. """
    #     if RedisThreadedClient.__instance == None:
    #         RedisThreadedClient()
    #     return RedisThreadedClient.__instance


    def __init__(self, host=None, port=None):

        if host is None:
            with open('config.json', 'r') as f:
                config = json.load(f)
                host = config['redis-server']

        if port is None:
            port = 6379

        self.host = host
        self.port = port
        self.redis_conn =  redis.StrictRedis(host=host, port=6379)
        self.running_thread = None
        self.pubsub = None
        self.subscriptions = set() # TODO: keep track of this
        if threading.current_thread() is threading.main_thread():
            self.setup()
        
    # Needed to catch signal interrupts and clean up the threads
    def catch(self, signum, frame):
        print("caught Ctrl+C signal ")
        if self.running_thread:
            self.running_thread.stop()
            self.running_thread = None

    def setup(self):
        signal.signal(signal.SIGINT, self.catch)


    def __default_callback(self, msg):
        # keep in mind that this cannot return value
        print(f"Channel {msg['channel']}  received message {msg['data']}")

    def subscribe(self, channel, callback=None):
        # TODO check that callback is valid func
        if channel in self.subscriptions:
            return
        else:
            self.subscriptions.add(channel)

        if callback == None:
            callback = self.__default_callback

        if not self.pubsub:
            self.pubsub = self.redis_conn.pubsub()

        self.pubsub.psubscribe(**{channel: callback})

        if not self.running_thread:
            self.running_thread = self.pubsub.run_in_thread(sleep_time=.01)


    def unsubscribe(self, channel=None):
        #TODO properly unsubscribe here, rather than just stop the thread
        if not channel:
            self.subscriptions.clear()
        elif channel in self.subscriptions:
            self.subscriptions.remove(channel)

        if len(self.subscriptions) == 0 and self.running_thread:
            self.running_thread.stop()
            self.running_thread = None # argh!!!

    def publish(self, channel, msg):
        """
        :param channel: String channel name
        :param msg: valid json paylod to send to channel
        """
        try:
            json.loads(msg)
            self.redis_conn.publish(channel, msg)
        except ValueError:
            print(f"{msg} is not a valid json object")

    def get(self, key):
        return self.redis_conn.get(key)

    def set(self, key, val):
        try:
            self.redis_conn.set(key, val)
        except:
            raise Exception(f"Could not set {key} to {val} in redis connection")


