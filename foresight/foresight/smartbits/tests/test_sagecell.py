#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

import pytest

from smartbits.sagecell import SageCell
from smartbits.tests.sample_sb_docs import sagecell_doc


@pytest.fixture()
def sage_cell():
    sc = SageCell(**sagecell_doc)
    yield sc
    sc._jupyter_client.clean_up()



def test_is_created(sage_cell):
    assert isinstance(sage_cell, SageCell)

