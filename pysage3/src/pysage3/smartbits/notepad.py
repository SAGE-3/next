# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from typing import List, Any, Dict
from pydantic import Field
from pysage3.smartbits.smartbit import SmartBit, TrackedBaseModel


class NotepadContent(TrackedBaseModel):
    ops: List[Any] = Field(description="Quill delta ops representing the document content", default_factory=list)


class NotepadState(TrackedBaseModel):
    content: NotepadContent = Field(description="Quill delta document content")


class Notepad(SmartBit):
    state: NotepadState

    def __init__(self, **kwargs):
        super(Notepad, self).__init__(**kwargs)

    def clean_up(self):
        pass
