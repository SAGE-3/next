#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

from utils.generic_utils import import_cls
import sys


class SmartBitFactory:
    # TODO: move this to configure file since it's also used in wall
    cls_root = "smartbits"
    # TODO: read these names from some conf file; not hardcoded here
    class_names = {"Counter": "counter", "Note": "note", "DataTable": "data_table", "CodeCell": "codecell",
                   "Slider": "slider", "Stickie": "stickie", "VegaLite": "vegalite", "VegaLiteViewer": "vegaliteviewer"}

    @classmethod
    def create_smartbit(cls, doc):
        smartbit_type = doc["data"]["name"]
        cls_path = ".".join([cls.cls_root, smartbit_type.lower()])
        # print(f"class path is {cls_path}")
        try:
            # create a smartbit for known classes, ignore others
            if smartbit_type in cls.class_names:
                smartbit_class = import_cls(cls_path, smartbit_type)
                smartbit_instance = smartbit_class(**doc)
                return smartbit_instance
            else:
                # find a better exception
                raise Exception("NO class found")
        except:
            e = sys.exc_info()[0]
            raise Exception(
                f"Couldn't create the class in the SmartbitFactory {e}")
