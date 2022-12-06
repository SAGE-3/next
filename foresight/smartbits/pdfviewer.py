# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from smartbits.smartbit import SmartBit, ExecuteInfo
from smartbits.smartbit import TrackedBaseModel

class PDFViewerState(TrackedBaseModel):
    assetid: str
    currentPage: int
    numPages: int
    displayPages: int
    analyzed: str
    executeInfo: ExecuteInfo


class PDFViewer(SmartBit):
    # the key that is assigned to this in state is
    state: PDFViewerState

    # _some_private_info: dict = PrivateAttr()
    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(PDFViewer, self).__init__(**kwargs)

    def analyze_pdf(self, asset):
        print('Analyzing PDF', asset)
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.state.analyzed = "bla bla 42"
        self.send_updates()

    def clean_up(self):
        pass