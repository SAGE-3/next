# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

# Utils
from libs.utils import DotDict

# logging AI prompts
from fluent import sender

ai_logger = None


def getFluentInfo(ps3):
    """
    Retrieves Fluent models information from SAGE3 server.

    Args:
      ps3: SAGE3 API handle.

    Returns:
      dict: A dictionary containing the "fluent" model information.
    """
    sage3_config = ps3.s3_comm.web_config
    fluent = sage3_config["fluentd"]
    if fluent is None:
        raise ValueError("Fluentd configuration not found in SAGE3 server.")
    return DotDict(fluent)


def initFluent(ps3):
    """
    Initializes the Fluent logger.

    Args:
      ps3: SAGE3 API handle.
    """
    global ai_logger
    flinfo = getFluentInfo(ps3)
    ai_logger = sender.FluentSender("seer", host=flinfo.server, port=flinfo.port)
