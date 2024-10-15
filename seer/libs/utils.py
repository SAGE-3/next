# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------


def getModelsInfo(ps3):
    sage3_config = ps3.s3_comm.web_config
    openai = sage3_config["openai"]
    llama = sage3_config["llama"]
    return {"llama": llama, "openai": openai}
