# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from utils.generic_utils import import_cls

import logging

logger = logging.getLogger(__name__)


class SmartBitFactory:
    # TODO: move this to configure file since it's also used in wall
    cls_root = "smartbits"

    # TODO: read these names from some conf file; not hardcoded here
    class_names = {
        "AIPane": "ai_pane",
        "Counter": "counter",
        "Note": "note",
        "Stickie": "stickie",
        "DataTable": "data_table",
        "CodeCell": "codecell",
        "SageCell": "sagecell",
        "Slider": "slider",
        "VegaLite": "vegalite",
        "PDFViewer": "pdfviewer",
        "VegaLiteViewer": "vegaliteviewer",
        "ImageViewer": "imageviewer",
        "Seer": "seer",
    }

    @classmethod
    def create_smartbit(cls, doc):
        smartbit_class = None
        smartbit_type = doc["data"]["type"]
        smartbit_instance = None
        # print(f"class path is {cls_path}")
        try:
            if smartbit_type in cls.class_names:
                cls_path = ".".join([cls.cls_root, smartbit_type.lower()])
            else:
                cls_path = "smartbits.genericsmartbit"
                smartbit_type = "GenericSmartBit"

            smartbit_class = import_cls(cls_path, smartbit_type)
        except Exception as e:  # eror in the import
            logger.error(f"Couldn't not import {smartbit_type} from {cls_path} {e}")

        try:
            smartbit_instance = smartbit_class(**doc)
        except:  #  issue with doc not compatible with current sb class. maybe too old.
            try:
                if smartbit_class is not None and smartbit_type != "GenericSmartBit":
                    cls_path = "smartbits.genericsmartbit"
                    smartbit_type = "GenericSmartBit"
                    smartbit_class = import_cls(cls_path, smartbit_type)
                    smartbit_instance = smartbit_class(**doc)
                else:
                    logger.erorr(
                        f"Couldn't convert following doc to actual smartbit: {doc}"
                    )
                    # raise Exception("Couldn't conver doc to actual smartbit")
            except Exception as e:
                logger.error(f"Couldn't create the class in the SmartbitFactory {e}")

        return smartbit_instance
