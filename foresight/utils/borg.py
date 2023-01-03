#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

class Borg:
    """
    The Borg pattern to store execution state across instances
    """
    _shared_state = {}

    def __init__(self):
        self.__dict__ = self._shared_state