from smartbits.aipane import AIPane
import pytest
from smartbits.tests.sample_sb_docs import aipane_doc


@pytest.fixture()
def aipane_instance():
    c = AIPane(**aipane_doc)
    yield c
    c._ai_client.clean_up()


def test_create_counter(aipane_instance):
    assert isinstance(aipane_instance, AIPane)


# TODO add test that uplod the the yolo image to a server and test it.
