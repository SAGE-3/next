#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

import schedule
import time
import threading

class TaskScheduler:

    def __init__(self):
        self.jobs = []
        self.stop_thread = False
        self.runner = threading.Thread(target=self.run_pending)
        self.runner.start()

    def schedule_task(self, func, nb_secs=5, **kwargs):
        job = schedule.every(nb_secs).seconds.do(func, **kwargs)
        self.jobs.append(job)

    def run_pending(self, check_every=1):
        while not self.stop_thread:
            schedule.run_pending()
            time.sleep(check_every)

    def clean_up(self):
        print("I am trying to clean up the task scheduler")
        for j in self.jobs:
            schedule.cancel_job(j)
        self.jobs = []
        self.stop_thread = True
        self.runner.join()

