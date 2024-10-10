# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from typing import Optional
from pydantic import Field, UUID4
from foresight.smartbits.smartbit import SmartBit
from foresight.smartbits.smartbit import TrackedBaseModel


class PDFViewerState(TrackedBaseModel):
    assetid: UUID4 = Field(description="The UUID4 string representation of the asset")
    currentPage: int = Field(description="The page number currently showing", default=0)
    numPages: Optional[int] = Field(
        description="The total number of pages in the pdf document"
    )
    displayPages: int = Field(
        description="The number of pages to display at a time", default=1
    )


class PDFViewer(SmartBit):
    # the key that is assigned to this in state is
    state: PDFViewerState

    # _some_private_info: dict = PrivateAttr()
    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(PDFViewer, self).__init__(**kwargs)

    def clean_up(self):
        pass
