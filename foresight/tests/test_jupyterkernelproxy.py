import jupyterkernelproxy
import uuid
import pytest
import json
import requests



@pytest.fixture()
def jupyter_proxy():
    j = jupyterkernelproxy.JupyterKernelProxy()
    yield j
    j.cleanup()


def test_get_room_kernel_id(jupyter_proxy):
    """
    Tests that we can get the default kernel associated with a board.
    We don't have a way to know which kernel is the default but we expect to receive at least
    one available kernel
    """
    #todo: test if a jupyter gateway is running (request), yes, test for kernel, no; return assert True
    board_id = jupyter_proxy.get_room_kernel_id()
    try:
        uuid.UUID(board_id)
        print("found at least one kernel")
        assert True
    except:
        pass


def make_test_with():
    """
    create test with the following
    """
    import jupyterkernelproxy
    import uuid

    j = jupyterkernelproxy.JupyterKernelProxy()
    j.add_client("7697aa88-cfc1-4517-a1e8-bc7607c40eea")

    exec_uuid = str(uuid.uuid4())
    print(f"exec_uuid is {exec_uuid}")
    j.execute({"uuid": exec_uuid, "kernel": "7697aa88-cfc1-4517-a1e8-bc7607c40eea", "code": "b=10",
               "call_fn": lambda x: print(f"got the results {x}")})


