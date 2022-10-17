# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from smartbits.smartbit import SmartBit, ExecuteInfo
from smartbits.smartbit import TrackedBaseModel
from pydantic import PrivateAttr


class PDFViewerState(TrackedBaseModel):
    assetid: str
    currentPage: int
    numPages: int
    displayPages: int


class PDFViewer(SmartBit):
    # the key that is assigned to this in state is
    state: PDFViewerState
    _some_private_info: dict = PrivateAttr()

    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(PDFViewer, self).__init__(**kwargs)
        # self._some_private_info = {1: 2}
        print("new pdf got created")

    def button_clicked(self):
        print("The button was clicked")