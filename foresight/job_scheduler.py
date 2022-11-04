import schedule
import time
import threading

class JobScheduler:

    def __init__(self):
        self.runner = threading.Thread(target=self.run_pending)
        self.runner.start()
        self.jobs = []


    def schedule_task(self, func, name):
        job = schedule.every(4).seconds.do(func, name=name)
        self.jobs.append(job)


    def run_pending(self, check_every=1):
        while True:
            schedule.run_pending()
            time.sleep(check_every)