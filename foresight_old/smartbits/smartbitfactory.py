#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

from smartbits.utils.generic_utils import import_cls
from message_broker.redis_client import RedisThreadedClient


class SmartBitFactory():
    cls_root = "smartbits"

    @classmethod
    def create_smartbit(cls, smartbit_type, params, requires_redis=False):
        """
        :param type: The string representation of the smartbit, ex. postit_smartbit
        :param params: the dictionary with the exact params that are needed to construct an object of
        smartbit_type
        :return: returns an instance of smartbit_type
        """

        # Remove
        redis_client = None
        try:

            if smartbit_type in ["S_Int", "S_Float", "S_String"]:
                cls_path = ".".join([cls.cls_root, "primitives"])
                return import_cls(cls_path, smartbit_type)(**params)
            else: # non-primitive
                cls_path = ".".join([cls.cls_root, smartbit_type.lower()])
                if requires_redis == True:
                    redis_client = RedisThreadedClient()
                params["redis_client"] = redis_client

                smartbit_type_instance = import_cls(cls_path, smartbit_type)(**params)
                return smartbit_type_instance
        except:
            raise Exception("In SmartbitFactory: Could not create smartbit {} with params {}"
                            .format(smartbit_type, params))





