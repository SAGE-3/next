#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

from foresight.smartbits.counter import Counter
import pytest
from foresight.smartbits.tests.sample_sb_docs import counter_doc


@pytest.fixture()
def counter_instance():
    c = Counter(**counter_doc)
    yield c
    # c._ai_client.clean_up()
    #c._jupyter_client.clean_up()

def test_create_counter(counter_instance):
    assert isinstance(counter_instance, Counter)
    assert counter_instance.state.count == 42


def test_reset_to_zero(counter_instance):
    _ = counter_instance.reset_to_zero()
    assert counter_instance.state.count == 0


