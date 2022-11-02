from smartbits.counter import Counter
import pytest
from sample_sb_docs import counter_doc


@pytest.fixture()
def counter_instance():
    c = Counter(**counter_doc)
    yield c
    print("cleaning up happend after all the tests completed.")
    c._ai_client.stop_thread = True
    c._jupyter_client.stop_thread = True


def test_create_counter(counter_instance):
    assert isinstance(counter_instance, Counter)
    assert counter_instance.state.count == 42


def test_reset_to_zero(counter_instance):
    _ = counter_instance.reset_to_zero()
    assert counter_instance.state.count == 0


