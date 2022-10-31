import pytest
from smartbits.genericsmartbit import GenericSmartBit
from sample_sb_docs import generic_smartbit_doc


@pytest.fixture()
def generic_smartbit_instance():
    generic_smartbit = GenericSmartBit(**generic_smartbit_doc)
    yield generic_smartbit
    print("cleaning up happend after all the tests completed.")
    generic_smartbit._ai_client.stop_thread = True
    generic_smartbit._jupyter_client.stop_thread = True


def test_create_generic_smartbit(generic_smartbit_instance):
    assert isinstance(generic_smartbit_instance, GenericSmartBit)


