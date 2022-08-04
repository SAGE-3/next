from smartbits.smartbit import SmartBit, ExecuteInfo
from smartbits.smartbit import TrackedBaseModel


class SliderState(TrackedBaseModel):
    value: int
    executeInfo: ExecuteInfo

class Slider(SmartBit):
    # the key that is assigned to this in state is
    state: SliderState

    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(Slider, self).__init__(**kwargs)

    def set_to_val(self, val):
        self.state.value = val
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()