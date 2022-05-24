#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

# TODO: read in redis connection information from config file
# import os
# import sys
# PACKAGE_PARENT = '..'
# SCRIPT_DIR = os.path.dirname(os.path.realpath(os.path.join(os.getcwd(), os.path.expanduser(__file__))))
# sys.path.append(os.path.normpath(os.path.join(SCRIPT_DIR, PACKAGE_PARENT)))


import queue

from redis import Redis
from rq import Queue, Worker
import dill
import asyncio
import threading
import json
import uuid
from message_broker.redis_client import RedisThreadedClient
from rejson import Client, Path

import signal
import sys
import random
import string



class TaskScheduler():
    __instance = None

    @staticmethod
    def get_instance():
        """ Static access method. """
        if TaskScheduler.__instance is None:
            TaskScheduler()
        return TaskScheduler.__instance

    def __init__(self, set_ids_queue= False):

        with open('config.json', 'r') as f:
            config = json.load(f)

        if TaskScheduler.__instance is not None:
            raise Exception("This class is a singleton and instance already exists!")
        else:
            self.__instance = self
            self.redis_conn = Redis(host= config['redis-server'], port=6379)
            self.queue = Queue('default',
                               connection=self.redis_conn,
                               serializer=dill)
            self.check_status_rq_job_ids = True
            self.rejson_client = Client(host= config['redis-server'], port=6379, decode_responses=True)
            self.redis_client = RedisThreadedClient()
            if set_ids_queue:
                self.rq_queue_id = self.set_ids_queue()
            else:
                q_list = self.rejson_client.keys("task_scheduler:*")
                if len(q_list) > 1:
                    raise Exception("There is more than one possible task ids queue")
                self.rq_queue_id = q_list[0]



    def handle_completed_jobs(self):
        asyncio.run(self.consume_completed_jobs())

    async def consume_completed_jobs(self):
        print(f"I am in and check_status_rq_job_ids is {self.check_status_rq_job_ids}")
        while self.check_status_rq_job_ids:

            _uuid = self.get_finished_job()
            # print(f"_uuid is {_uuid}")
            if _uuid is None:
                await asyncio.sleep(2)
                continue
            print("***** I am here after waiting")
            try:
                job = self.get_job(_uuid)
            
                if job.result["channel"] == "execute:up":
                    msg = self.format_execute_up(job)
                    # print("I am in 1 ......")
                    response_uuid = msg["uuid"]
                    original_uuid = msg["original_uuid"]
                    # TODO: nested the json document below with another object, instead of Path.rootPath()
                    print("I am executing up form task scheduler")

                    self.rejson_client.jsonset(f"execute:up:{response_uuid}", Path.rootPath(), original_uuid)
                    self.rejson_client.jsonset(f"execute:up:{original_uuid}", Path.rootPath(), response_uuid)
                    self.redis_client.publish("execute:up", json.dumps(msg))
                else:
                    print(f"*********************************Channel to publish on is {channel}")
                    channel = job.result["channel"]
                    raise Exception(f"***********Unknown channel {channel} received in task scheduler*************")
            except  Exception as e:
                import os
                print("!!!!!!!!!!!!!!!!!!!!Unhandled error occurred in Task Scheduled Try block!!!!!!!!!!!!!")
                print(e)
                exc_type, exc_obj, exc_tb = sys.exc_info()
                fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
                print(exc_type, fname, exc_tb.tb_lineno)

            # we don't want to flood the clients with messages
            await asyncio.sleep(2)


    def enqueue(self, func, params, job_id):
        if self.rq_queue_id is None:
            raise Exception("Redis Ids queue is not setup. Are you sure the daemon is runnig")
        print("I am equeuing a job")
        l = self.rejson_client.jsonget(self.rq_queue_id, Path('.pending_ids'))
        l.append(job_id)
        self.rejson_client.jsonset(self.rq_queue_id, Path('.pending_ids'), l)

        return self.queue.enqueue(func, kwargs=params, job_id=job_id)

    def get_status(self, job_id):
        job = self.queue.fetch_job(job_id)
        if job is not None:
            return job.get_status()
        else:
            return None

    def get_result(self, job_id):
        job = self.queue.fetch_job(job_id)
        if job is not None:
            return job.result
        else:
            return None

    def get_job(self, job_id):
        return self.queue.fetch_job(job_id)

    def quit(self, *args, **kwargs):
        print("\nInterrupt received, stoppping threads")
        self.check_status_rq_job_ids= False

    def set_ids_queue(self, length=8):
        # remove previous keys in the db
        for prev_q in  self.rejson_client.keys("task_scheduler:*"):
            self.rejson_client.delete(prev_q)

        letters = string.ascii_lowercase
        result_str = ''.join(random.choice(letters) for i in range(length))
        queue_name = f"task_scheduler:{result_str}"
        self.rejson_client.jsonset(queue_name, Path.rootPath(), {"pending_ids":[]})
        return queue_name

    def get_finished_job(self):
        pending_ids = self.rejson_client.jsonget(self.rq_queue_id,
                                                 Path('.pending_ids'))
        _uuid = None
        if len(pending_ids) > 0:
            for i in range(len(pending_ids)):
                if self.get_status(pending_ids[i]) == "finished":
                    _uuid = pending_ids.pop(i)
                    self.rejson_client.jsonset(self.rq_queue_id,
                                               Path('.pending_ids'), pending_ids)
                    break
            return _uuid
        else:
            return None



    def format_execute_up(self, job):
        # {
        #     "uuid": "b3256b9d-5164-4294-8051-fa06a9bd6772",
        #     "client_id": 1234,
        #     "smartbit_id": 1234,
        #     "action": "convert_bw",
        #     "action_params": {"wall_smartbit_id": "some_wall_name"}
        # }

        protocol = json.load(open("message_broker/protocols/execute_up.json"))

        client_id = self.rejson_client.jsonget(f"msg_details:{job.id}", Path('.client_id'))
        msg_data = {
            "uuid": str(uuid.uuid4()),
            "original_uuid": job.id,
            "client_id": client_id,
            "smartbit_id": job.result["smartbit_id"],
            "action": job.result["action"],
            "action_params": job.result["action_params"]
        }
        protocol.update(msg_data)
        return protocol



def signal_handler(sig, frame):
    sys.exit(0)

if __name__ == "__main__":


    ts = TaskScheduler(set_ids_queue=True)

    threading.Thread(target=ts.handle_completed_jobs).start()

    # Needs to be srarted after the threading.Thread
    w = Worker(['default'],
               connection=ts.redis_conn)
    w.work()

    signal.signal(signal.SIGINT, ts.quit)
    # signal.pause()
