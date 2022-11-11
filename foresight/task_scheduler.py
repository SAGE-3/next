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
        self.stop_thread = True
        self.runner.join()
