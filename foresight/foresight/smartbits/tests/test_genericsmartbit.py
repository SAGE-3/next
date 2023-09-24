#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

import pytest
from foresight.smartbits.genericsmartbit import GenericSmartBit
from sample_sb_docs import generic_smartbit_doc


@pytest.fixture()
def generic_smartbit():
    gs = GenericSmartBit(**generic_smartbit_doc)
    yield gs
    # gs._ai_client.clean_up()
    # gs._jupyter_client.clean_up()

def test_create_generic_smartbit(generic_smartbit):
    assert isinstance(generic_smartbit, GenericSmartBit)


