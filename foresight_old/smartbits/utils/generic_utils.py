#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

from importlib import import_module
import json

def import_cls(abs_module_path, class_name):
    """
    automatically imports a class based on its absolute module path and the a class name
    :param abs_module_path:
    :param class_name:
    :return:
    """
    module_object = import_module(abs_module_path)
    target_class = getattr(module_object, class_name)
    return target_class

def say_hi(first_name=None, last_name=None):
    if first_name is None:
        first_name = "John"

    if last_name is None:
        last_name = "Doe"
    return f"Hi {first_name} {last_name}"



# def __format_create_up(func, smartbit_id, client_id, params):
#         protocol = json.load(open("Python_code/protocols/create_up.json"))
#         msg_data = {'func': func,
#                     "smartbit_type": smartbit_id, 'client_id': client_id,
#                     'params': params,
#                     }
#         protocol.update(msg_data)
#         return protocol
#
# def __format_notify_redis(smartbit_type, smartbit_id, client_id, params, available_actions):
#
#         protocol = json.load(open("Python_code/protocols/notify_redis.json"))
#         msg_data = {'type_of_object': smartbit_type,
#                     "object_id": smartbit_id, 'client_id': client_id,
#                     'action_params': params,
#                     'availble_actions': available_actions
#                     }
#         protocol.update(msg_data)
#         return protocol



# def register_action_in_class():
#     # function we use to with the @register decoratro
#     # To register a function a possible action on a SmarBit Type
#     # https://stackoverflow.com/questions/5707589/calling-functions-by-array-index-in-python/5707605#5707605
#     registry = {}
#     def registrar(func):
#         registry[func.__name__] = func
#         return func # normally a decorator returns a wrapped function,
#                     # but here we return func unmodified, after registering it
#     registrar.all = registry
#     return registrar

