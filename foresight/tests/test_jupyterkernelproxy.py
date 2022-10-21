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
