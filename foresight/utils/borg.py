class Borg:
    """
    The Borg pattern to store execution state across instances
    """
    _shared_state = {}

    def __init__(self):
        self.__dict__ = self._shared_state