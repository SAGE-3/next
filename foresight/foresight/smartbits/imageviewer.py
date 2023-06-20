#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

from smartbits.smartbit import SmartBit, ExecuteInfo
from smartbits.smartbit import TrackedBaseModel


class ImageViewerState(TrackedBaseModel):
    # class Config:
    #     arbitrary_types_allowed = True
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

    def set_bboxes(self, bboxes):
        """
        Sets bounding boxes from output produced by AI Pane
        """
        print('+++++++++++++++++')
        print('running set_boxes')
        self.state.boxes = bboxes
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    def clean_up(self):
        pass