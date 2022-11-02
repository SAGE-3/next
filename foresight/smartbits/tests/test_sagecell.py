import pytest

from smartbits.sagecell import SageCell
from smartbits.tests.sample_sb_docs import sagecell_doc


@pytest.fixture()
def sage_cell():
    sc = SageCell(**sagecell_doc)
    return sc
    # assert isinstance(sc, SageCell)

def test_is_created(sage_cell):
    assert isinstance(sage_cell, SageCell)

