#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

from smartbits.smartbit import SmartBit
from smartbits.smartbitfactory import SmartBitFactory


class Node(object):
    def __init__(self, name, path_to_file=None):
        self.name = name
        self.path_to_file = path_to_file
        self.children = []

    def add_child(self, obj):
        self.children.append(obj)

    def dump(self, indent=0):
        """dump tree to string"""

class CompositeSmartBit(SmartBit):

    def __init__(self, **kwargs):
        print(kwargs.keys())
        self.field_ids = list(kwargs.keys())
        wall_coordinates = kwargs.get("wall_coordinates", (0, 0, 0, 0))
        redis_client = kwargs.get("redis_client", None)

        if redis_client is None:
            redis_client = False

        super().__init__(wall_coordinates, redis_client)

        # Dynamically create fiels as described in the parms_dict
        for attr_name, value in kwargs.items():
            # create the data
            try:
                if type(value) == dict:
                    data = SmartBitFactory.create_smartbit(value["smartbit_type"], value["smartbit_params"])
                    setattr(self, attr_name, data)
            except:
                print("Cannot create CompositeSmartbit")
                print(f"exception arose when creating {attr_name} with {value}")
                raise Exception("Composite SmartBit Creation Error")
            # append the data to class



    def jsonify(self):
        """
        :return:
        """
        # we don't need the image field, in the json version of the object
        # we cannot jsonify the object anyway.
        return SmartBit.jsonify(self)

    def get_actions(self):
        actions = {}
        actions["obj"] = super(CompositeSmartBit, self).get_actions()
        for field_id in self.field_ids:
            if not hasattr(self, field_id):
                continue
            field_instance = getattr(self, field_id)
            if hasattr(field_instance, "get_actions"):
                actions[field_id] = field_instance.get_actions()

        return actions
