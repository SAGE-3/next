#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

from smartbits.smartbit import SmartBit
from pydantic import BaseModel

class CounterState(BaseModel):
    count: int


class Counter(SmartBit):
    # the key that is assigned to this in state is
    state: CounterState






