import time
import threading
import random
from asyncio import Queue
import asyncio
import signal


class Test():
    def __init__(self):
        self.message_queue = Queue()

    async def produce(self):
        while True:
            msg = random.randint(0, 5)
            print(f"added value {msg}")
            await self.message_queue.put(msg)
            await asyncio.sleep(1)

    async def consume(self):
        try:
            print("Starting comsume")
            while True:
                print(str(self.message_queue))
                msg = await self.message_queue.get()
                print(f"Got message {msg}")
                await asyncio.sleep(1)
        except asyncio.CancelledError as ex:
            print('task2', type(ex))
            raise

def handler(signum, frame):
    print("I am here")
    res = input("Ctrl-c was pressed. Do you really want to exit? y/n ")

# sage_proxy = Test()
# signal.signal(signal.SIGINT, handler)
# await asyncio.gather(sage_proxy.produce(), sage_proxy.consume())







# asyncio.run(main())



# # listening_process = threading.Thread(target=asyncio.run, args=(sage_proxy.produce(),))
# # listening_process.start()
#
# worker_process = threading.Thread(target=asyncio.run, args=(sage_proxy.consume(),))
# worker_process.start()


# TODO start threads cleanly in a way that can be easily stopped.
# if __name__ == "__main__":
#     # The below is needed in running in iPython -- need to dig into this more
#     # multiprocessing.set_start_method("fork")
#     # parser = get_cmdline_parser()
#     # args = parser.parse_args()
#     sage_proxy = SAGEProxy("config.json", "05828804-d87f-4498-857e-02f288effd3d")
#
#     # room = Room("08d37fb0-b0a7-475e-a007-6d9dd35538ad")
#     # sage_proxy = SAGEProxy(args.config_file, args.room_id)
#     # listening_process = multiprocessing.Process(target=sage_proxy.receive_messages)
#     # worker_process = multiprocessing.Process(target=sage_proxy.process_messages)
#
#     listening_process = threading.Thread(target=board_proxy.receive_messages)
#     worker_process = threading.Thread(target=board_proxy.process_messages)
#
#     try:
#         # start the process responsible for listening to messages and adding them to the queue
#         listening_process.start()
#         # start the process responsible for handling message added to the queue.
#         worker_process.start()
#
#         # while True:
#         #     time.sleep(100)
#     except (KeyboardInterrupt, SystemExit):
#         print('\n! Received keyboard interrupt, quitting threads.\n')
#         sage_proxy.clean_up()
#         listening_process.st
#         # worker_process.join()
#         print("I am here")
