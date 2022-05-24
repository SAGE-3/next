#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

# # from fluent import sender
# # from fluent import event
# # from .utils import generic_utils
# import json
#
# class Logger():
#     __instance = None
#
#     @staticmethod
#     def get_instance(system="sage3.smartbits", host="localhost", port=24224):
#         """ Static access method. """
#         if Logger.__instance == None:
#             Logger(system, host, port)
#         return Logger.__instance
#
#     def __init__(self, system="sage3.smartbits", host="localhost", port=24224):
#         """ Virtually private constructor. """
#         if Logger.__instance != None:
#             raise Exception("This class is a singleton and instance already exists!")
#         else:
#             sender.setup(system, host=host, port=port)
#             Logger.__instance = self
#
#
#     def log(self, log_tag="smartbit", log_level="info"):
#         def log(my_func):
#             def wrapper(*args, **kwargs):
#                 # not printing the args because it's self and don't have
#                 # way to serialize some of the objects
#                 # Doesn't matter since all params are passed as kwargs
#                 # event.Event(log_tag, {"func_name": my_func.__name__, "args": args, "kwargs":  kwargs, "level": log_level})
#                 event.Event(log_tag,
#                             {"func_name": my_func.__name__, "kwargs": kwargs})
#                 return_val = my_func(*args, **kwargs)
#                 return return_val
#             return wrapper
#         return log
