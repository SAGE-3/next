# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from foresight.utils.generic_utils import import_cls

import logging

logger = logging.getLogger(__name__)


class SmartBitFactory:
    # TODO: move this to configure file since it's also used in wall
    cls_root = "foresight.smartbits"

    # TODO: read these names from some conf file; not hardcoded here
    class_names = {
        "Chat": "chat",
        "CodeEditor": "codeeditor",
        "Counter": "counter",
        "CSVViewer": "csvviewer",
        "GLTFViewer": "gltfviewer",
        "IFrame": "iframe",
        "ImageViewer": "imageviewer",
        "MapGL": "mapgl",
        #"Notepad": "note",
        "PDFViewer": "pdfviewer",
        "SageCell": "sagecell",
        "Stickie": "stickie",
        "VegaLite": "vegalite",
        "VegaLiteViewer": "vegaliteviewer",
        "VideoViewer": "videoviewer",
        "Webview": "webview",
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
                cls_path = "foresight.smartbits.genericsmartbit"
                smartbit_type = "GenericSmartBit"

            smartbit_class = import_cls(cls_path, smartbit_type)
        except Exception as e:  # eror in the import
            logger.error(f"Couldn't not import {smartbit_type} from {cls_path} {e}")

        try:
            smartbit_instance = smartbit_class(**doc)
        except:  #  issue with doc not compatible with current sb class. maybe too old.
            try:
                if smartbit_class is not None and smartbit_type != "GenericSmartBit":
                    cls_path = ".".join([cls.cls_root, "genericsmartbit"])
                    smartbit_type = "GenericSmartBit"
                    smartbit_class = import_cls(cls_path, smartbit_type)
                    smartbit_instance = smartbit_class(**doc)
                else:
                    logger.info(
                        f"Couldn't convert doc to actual smartbit: {smartbit_class} {smartbit_type}"
                    )
                    # raise Exception("Couldn't conver doc to actual smartbit")
            except Exception as e:
                logger.error(f"Couldn't create the class in the SmartbitFactory {e}")

        return smartbit_instance
