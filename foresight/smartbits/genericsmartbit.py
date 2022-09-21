# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from smartbits.smartbit import SmartBit, ExecuteInfo
from smartbits.smartbit import TrackedBaseModel
from pydantic import PrivateAttr


class GenericSmartBitState(TrackedBaseModel):
    pass

class GenericSmartBit(SmartBit):
    # the key that is assigned to this in state is
    state: GenericSmartBitState
    _some_private_info: dict = PrivateAttr()

    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(GenericSmartBit, self).__init__(**kwargs)
        # self._some_private_info = {1: 2}

