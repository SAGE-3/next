#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

from smartbits.utils.generic_utils import say_hi
from task_queue.taskscheduler import TaskScheduler
import time
from rq import Worker


def test_get_status():

    ts = TaskScheduler()
    params = {"first_name": "John", "last_name": "Doe"}
    ts.enqueue(say_hi, params, "1234")
    assert  ts.get_status("1234") is not None
    w = Worker(['default'], connection=ts.redis_conn)
    w.work(burst=True)

    while ts.get_status("1234") != "finished":
         time.sleep(2)

    assert ts.get_result("1234") == "Hi John Doe"
    ts.check_status_rq_job_ids = False

