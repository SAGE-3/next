#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

import os

# run _env.sh to set up environment variables
os.system("source _env.sh")

# os.environ["ENVIRONMENT"] = "development"
# os.environ["FUNCX_SDK_CLIENT_ID"] = "test_client_id"
# os.environ["FUNCX_SDK_CLIENT_SECRET"] = "test_client_secret"
# os.environ["TOKEN"] = "TEST_TOKEN"
# os.environ["LOG_LEVEL"] = "TEST_DEBUG"

def test_environment_setup():
    assert os.getenv("ENVIRONMENT") is not None, "Environment variable ENVIRONMENT not set"
    assert os.getenv("FUNCX_SDK_CLIENT_ID") is not None, "Environment variable FUNCX_SDK_CLIENT_ID not set"
    assert os.getenv("FUNCX_SDK_CLIENT_SECRET") is not None, "Environment variable FUNCX_SDK_CLIENT_SECRET not set"
    assert os.getenv("TOKEN") is not None, "Environment variable TOKEN not set"
    assert os.getenv("LOG_LEVEL") is not None, "Environment variable LOG_LEVEL not set"
