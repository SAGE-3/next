# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from typing import Optional, Dict, Any
from pydantic import Field
from pysage3.smartbits.smartbit import SmartBit, TrackedBaseModel


class WebpageLinkState(TrackedBaseModel):
    url: str = Field(description="The URL of the linked webpage", default="http://google.com")
    streaming: bool = Field(description="Whether the page is being streamed", default=False)
    meta: Dict[str, Any] = Field(
        description="Metadata for the page (title, description, image)",
        default_factory=lambda: {"title": "", "description": "", "image": ""},
    )


class WebpageLink(SmartBit):
    state: WebpageLinkState

    def __init__(self, **kwargs):
        super(WebpageLink, self).__init__(**kwargs)

    def clean_up(self):
        pass
