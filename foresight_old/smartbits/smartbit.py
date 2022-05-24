#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

import json
# from optparse import OptionParser
import inspect
# from functools import wraps
import datetime
from smartbits.utils.smartbits_utils import _action
import uuid
# from message_broker.redis_client import RedisThreadedClient

from json import JSONEncoder

def _default(self, obj):
    return getattr(obj.__class__, "jsonify", _default.default)(obj)

_default.default = JSONEncoder.default
JSONEncoder.default = _default

class SmartBit(object):
    def __init__(self, wall_coordinates=None, redis_client=None):
        # TODO validate passed data
        self.smartbit_id = str(uuid.uuid4())
        self.wall_coordinates = wall_coordinates
        self._created_date =  datetime.datetime.now()
        self._redis_client = None
        if redis_client is not None:
            self._redis_client = redis_client

    def log(self):
        pass

    def save_state(self):
        pass

    @_action(enqueue=False)
    def update_wall_coordinates(self, wall_coordinates):
        # assumes wall coordinates are valid (proxy's job )

        self.wall_coordinates = wall_coordinates
        params = {"wall_coordinates": wall_coordinates}
        return {"channel": "execute:down", "action": "update", "action_results": params}

    @_action(enqueue=False)
    def update_attribute(self, attr_name, new_attr_value):
        try:
            setattr(self, attr_name, new_attr_value)
        except:
            raise Exception(f"Could not set attribute {attr_name} on class postit {self.__class__.__name__}")
        params = {str(attr_name): new_attr_value}
        return {"channel": "execute:down", "action": "update", "action_results": params}

    def jsonify(self, ignore=None, as_string = True):
        """
        :return:
        """
        if ignore is None:
            ignore = []
        json_repr = {}

        temp_dict_representation = self.__dict__.copy()
        temp_dict_representation['_created_date'] = self.__dict__['_created_date'].__str__()
        temp_dict_representation["smartbit_type"] = type(self).__name__
        temp_dict_representation["available_actions"] = self.get_actions()
        # ignore certain field
        for field in ignore:
            del(temp_dict_representation[field])

        # Use field's jsonify() if it has one
        to_remove = []
        for k, v in temp_dict_representation.items():
            # print(k)
            if hasattr(v, "jsonify"):
                # we convert the objects to json because we don't want nest json strings
                json_repr[k] = v.jsonify()
                to_remove.append(k)
        for k in to_remove:
            del (temp_dict_representation[k])

        if as_string:
            json_repr.update(temp_dict_representation)

        return json_repr

    def get_possible_actions(self):
        return [func[0] for func in inspect.getmembers(self, predicate=inspect.ismethod) if
                    hasattr(func[1], "action")]

    def get_attributes(self):
        attributes = inspect.getmembers(self, lambda a: not (inspect.isroutine(a)))
        non_ignore_attributes = []
        return dict([a for a in attributes if not (a[0].startswith('_'))])

    def get_actions(self):
        return [func[0] for func in inspect.getmembers(self, predicate=inspect.ismethod) if
                    hasattr(func[1], "action")]

    def execute_up(self, msg):
        self.redis_client.publish("execute:up", json.dumps(msg))

    def execute_down(self, msg):
        self.redis_client.publish("execute:up", json.dumps(msg))


