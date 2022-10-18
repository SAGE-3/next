from smartbits.smartbit import SmartBit, ExecuteInfo
from smartbits.smartbit import TrackedBaseModel


class StickieState(TrackedBaseModel):
    text: str
    fontSize: int
    color: str
    executeInfo: ExecuteInfo

class Stickie(SmartBit):
    # the key that is assigned to this in state is
    state: StickieState

    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(Stickie, self).__init__(**kwargs)
