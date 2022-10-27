# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from smartbits.smartbit import SmartBit, ExecuteInfo
from smartbits.smartbit import TrackedBaseModel
import json

# class boxes(TrackedBaseModel):
#     # executeFunc is not recognized duirng manual update in refresh_data_form_update
#     # so we end up updating executeFunc instead
#     # execute_func: str = Field(alias='executeFunc')
#     executeFunc: str
#     params: dict

class ImageViewerState(TrackedBaseModel):
    boxes: dict
    assetid: str
    annotations: bool
    executeInfo: ExecuteInfo


class ImageViewer(SmartBit):
    # the key that is assigned to this in state is
    state: ImageViewerState

    # _some_private_info: dict = PrivateAttr()

    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(ImageViewer, self).__init__(**kwargs)
        # self._some_private_info = {1: 2}

    def set_bboxes(self, bboxes):
        print('+++++++++++++++++')
        print('running set_boxes')
        # output = {
        #     'dog': {'xmin': 109, 'ymin': 186, 'xmax': 260, 'ymax': 454},
        #     'bicycle': {'xmin': 104, 'ymin': 107, 'xmax': 477, 'ymax': 356},
        #     'truck': {'xmin': 398, 'ymin': 62, 'xmax': 574, 'ymax': 140},
        # }
        self.state.boxes = bboxes
        # self.state.boxes = output
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()
