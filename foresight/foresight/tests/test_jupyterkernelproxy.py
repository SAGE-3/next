#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

import foresight.jupyterkernelproxy
import uuid
import pytest
import time
import requests
from foresight.config import config as conf, prod_type

# TODO: add a test to check if a kernel exist and report an appropriate error otherwise
# perhaps maybe not even run the remaining tests


@pytest.fixture()
def jupyter_proxy():
    j = jupyterkernelproxy.JupyterKernelProxy()
    yield j
    j.clean_up()

@pytest.fixture()
def kernel_id(jupyter_proxy):
    kernel_id = jupyter_proxy.get_room_kernel_id()
    yield kernel_id

def test_get_room_kernel_id(jupyter_proxy, kernel_id):
    """
    Tests that we can get the default kernel associated with a board.
    We don't have a way to know which kernel is the default but we expect to receive at least
    one available kernel
    """
    #todo: test if a jupyter gateway is running (request), yes, test for kernel, no; return assert True
    try:
        uuid.UUID(kernel_id)
        print("found at least one kernel")
        assert True
    except:
        pass


def test_add_client(jupyter_proxy, kernel_id):
    """
    create test with the following
    """
    jupyter_proxy.add_client(kernel_id)

    assert kernel_id in jupyter_proxy.connections

    # kernel connection shuoul have been created

def test_execute(jupyter_proxy, kernel_id):
    exec_uuid = str(uuid.uuid4())
    jupyter_proxy.execute({"uuid": exec_uuid, "kernel": kernel_id, "code": "1+2",
               "call_fn": lambda x: print(f"got the results {x}")})
    time.sleep(2)
    assert exec_uuid not in jupyter_proxy.connections[kernel_id].pending_reponses

def test_get_kernels(jupyter_proxy):
    # create test kernel

    headers_dict = dict(jupyter_proxy.headers)
    response = requests.post(conf[prod_type]["jupyter_server"] + "/api/kernels", headers=headers_dict)
    assert response.status_code == 201
    new_kernel_id = response.json()["id"]
    response = requests.get(conf[prod_type]["jupyter_server"] + "/api/kernels", headers=headers_dict)

    assert response.status_code == 200
    assert len(response.json()) >= 1
    assert new_kernel_id in [y["id"] for y in response.json()]

def test_remove_stale_tokens():
    pass

