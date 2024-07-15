# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from foresight.smartbits.smartbit import SmartBit
from foresight.smartbits.smartbit import TrackedBaseModel


class PDFViewerState(TrackedBaseModel):
    assetid: str
    currentPage: int
    numPages: int
    displayPages: int


class PDFViewer(SmartBit):
    # the key that is assigned to this in state is
    state: PDFViewerState

    # _some_private_info: dict = PrivateAttr()
    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(PDFViewer, self).__init__(**kwargs)

    def clean_up(self):
        pass
