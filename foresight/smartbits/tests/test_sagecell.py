import pytest

from smartbits.sagecell import SageCell
from smartbits.tests.sample_sb_docs import sagecell_doc


@pytest.fixture()
def sage_cell():
    sc = SageCell(**sagecell_doc)
    yield sc
    sc._ai_client.clean_up()
    sc._jupyter_client.clean_up()



def test_is_created(sage_cell):
    assert isinstance(sage_cell, SageCell)

