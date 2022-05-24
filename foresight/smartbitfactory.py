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
    #   Key is was what apprears in appName field in the payload, value is the className
    class_names = {"stickies": "Stickies", "sagecell": "SageCell",
                   "imageViewer": "ImageViewer", "plotlyViewerAlt": "PlotlyViewer"}

    @classmethod
    def create_smartbit(cls, app_data):
        smartbit_type = app_data["appName"]
        cls_path = ".".join([cls.cls_root, smartbit_type.lower()])
        # print(f"class path is {cls_path}")
        try:
            # create a smartbit for known classes, ignore others
            if smartbit_type in cls.class_names:
                smartbit_class = import_cls(cls_path, cls.class_names[smartbit_type])
                smartbit_instance = smartbit_class(data=app_data)
                return smartbit_instance
        except:
            e = sys.exc_info()[0]
            raise Exception(
                f"Couldn't create the class in the SmartbitFactory {e}")
