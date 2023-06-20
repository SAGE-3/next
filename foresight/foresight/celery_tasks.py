from foresight.config import config as conf, prod_type
import uuid
from threading import Thread, Lock
from queue import Queue

from celery import Celery
import time
import httpx

redis_server = conf[prod_type]["redis_server"]
app = Celery('celery_tasks', broker=f'redis://{redis_server}/0', backend=f'redis://{redis_server}/0')
seer_server = conf[prod_type]["seer_server"]


@app.task
def add(params):
    """ Task used of testing purposes only assume that that params contains x and y """ \
    """ Could hve explicitely passed x and y with args=[1, 2] """

    print("Strat the addition task ...")
    print(f"param is {params}")
    time.sleep(4)
    print("Completed the addition task")
    return params['x'] + params['y']


@app.task
def seer_task(task_name, input):
    # TODO check that task_name is a valid Seer task, such as 'nlp2code', 'summarize' or 'cluster'
    #  and that query is string

    payload = {"query": input}
    headers = {'Content-Type': 'application/json'}
    resp = httpx.post(f'{seer_server}/{task_name}', headers=headers, json=payload, timeout=20.0)
    return resp.json()


class CeleryTaskQueue:
    def __init__(self):
        self.task_name_to_func = {"seer": seer_task}

        self.job_queue = Queue()
        self.job_checker_thread = Thread(target=self.check_jobs, args=())
        self.job_checker_thread.start()
        self.pending_tasks = [0]
        self.pending_tasks_lock = Lock()

    def check_jobs(self):
        while True:
            # Get a job from the queue, blocking until one is available
            job = self.job_queue.get()

            if job == "STOP":
                break

            task_id, result, callback = job
            if result.ready():
                if result.successful():
                    callback(result.result)
                else:
                    print(f"Task {task_id} failed.")
                with self.pending_tasks_lock:
                    self.pending_tasks[0] -= 1
            # If the job is not completed, add it back to the queue
            else:
                self.job_queue.put(job)
            time.sleep(1)

    # Task execution
    def __execute_add_task(self, custom_callback):
        task_id = str(uuid.uuid4())  # Generate a UUID for the task
        result = add.apply_async(args=({"x": 1, "y": 2},), task_id=task_id)  # Run the task with the generated UUID
        return task_id, result, custom_callback

    def execute_add_task(self, task_input, custom_callback):
        "User for example only"
        print(f"Task input is {task_input}")
        job = self.__execute_add_task(custom_callback)
        self.job_queue.put(job)
        with self.pending_tasks_lock:
            self.pending_tasks[0] += 1

    def execute_task(self, task_input, custom_callback):
        # TODO: implement proper validation here: task input is valid and callback is callable
        # get the task name form task_input

        print(f"in execute task and task input is {task_input}")
        task_name = task_input['task_name']
        # get the task_params from task_input
        task_params = task_input['task_params']
        task = self.task_name_to_func.get(task_name)

        if task is not None:
            task_id = str(uuid.uuid4())
            result = task.apply_async(args=(task_params["_id"], task_params['query']), task_id=task_id)
            job = (task_id, result, custom_callback)
            self.job_queue.put(job)
        else:
            raise ValueError(f"Task {task_name} is not supported")
        with self.pending_tasks_lock:
            self.pending_tasks[0] += 1

    def terminate(self):
        already_printed = False
        while self.pending_tasks[0] > 0:
            time.sleep(1)
            if not already_printed:
                print("Terminating Celery Queue ...")
                print("Waiting for pending tasks to complete ...")
                already_printed = True
        self.job_queue.put("STOP")
        self.job_checker_thread.join()


# adding a main
if __name__ == '__main__':
    def say_done(x):
        print(f"Done with the task and the result is {x}")

    cq = CeleryTaskQueue()

    print("getting ready for simple add")
    cq.execute_add_task("one", say_done)


    # THIS TEST REQUIRED SEER TO BE DEPLOYED
    # print("getting ready for seer task")
    # task_input = {'task_name': "seer", 'task_params': {"_id": "query",
    #                                                    'query': "load file test.csv"}}
    # cq.execute_task(task_input, cq.say_done)
    # clean up the celery queue


    cq.terminate()

    print("I am done")
