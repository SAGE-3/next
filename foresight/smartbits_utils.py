#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

import os
import tempfile

# TODO: Better way to do this?
def _action(*args, **kwargs):
    enqueue = False
    if "enqueue" in kwargs:
        enqueue = kwargs["enqueue"]
    def _inner(func):
        func.action = True
        func.enqueue = enqueue
        return func
    return _inner

# TODO: this is hard coded, make it part of the config
def get_temp_file_name(extension=None):
    return os.path.join("/tmp/", f"{next(tempfile._get_candidate_names())}.{extension}")

