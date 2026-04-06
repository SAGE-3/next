# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from pydantic import Field
from pysage3.smartbits.smartbit import SmartBit, TrackedBaseModel


class CalculatorState(TrackedBaseModel):
    input: str = Field(description="The current input expression", default="")
    history: str = Field(description="The history of calculations", default="")


class Calculator(SmartBit):
    state: CalculatorState

    def __init__(self, **kwargs):
        super(Calculator, self).__init__(**kwargs)

    def clean_up(self):
        pass
