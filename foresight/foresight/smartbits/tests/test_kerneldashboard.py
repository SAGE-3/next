#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

# import pytest
import uuid

import pytest
from smartbits.kerneldashboard import KernelDashboard
from smartbits.tests.sample_sb_docs import kernel_dashboard_doc
import time

@pytest.fixture()
def kernel_dashboard():
    kd = KernelDashboard(**kernel_dashboard_doc)
    yield kd
    kd.clean_up()

def test_create_instance(kernel_dashboard):
    isinstance(kernel_dashboard, KernelDashboard)

def test_creat_kernel(kernel_dashboard):
    room_uuid = str(uuid.uuid4())
    board_uuid = str(uuid.uuid4())
    user_uuid = str(uuid.uuid4())
    alias = str(uuid.uuid4())
    nb_kernels_before = len(kernel_dashboard._jupyter_client.redis_server.json().get(kernel_dashboard._redis_space))
    kernel_dashboard.add_kernel(room_uuid, board_uuid, user_uuid, kernel_alias=alias)
    nb_kernels_after = len(kernel_dashboard._jupyter_client.redis_server.json().get(kernel_dashboard._redis_space))
    assert nb_kernels_after ==  nb_kernels_before + 1

def test_delete_kernel(kernel_dashboard):
    room_uuid = str(uuid.uuid4())
    board_uuid = str(uuid.uuid4())
    user_uuid = str(uuid.uuid4())
    alias = str(uuid.uuid4())
    kernel_dashboard.add_kernel(room_uuid, board_uuid, user_uuid, kernel_alias=alias)
    available_kernels = kernel_dashboard._jupyter_client.redis_server.json().get(kernel_dashboard._redis_space)
    nb_kernels_before = len(kernel_dashboard._jupyter_client.redis_server.json().get(kernel_dashboard._redis_space))
    # time.sleep(0.5)
    kernel_id_to_remove = [k for k in available_kernels.keys() if available_kernels[k]['kernel_alias'] == alias][0]
    kernel_dashboard.delete_kernel(kernel_id_to_remove, user_uuid)
    # time.sleep(0.5)
    nb_kernels_after = len(kernel_dashboard._jupyter_client.redis_server.json().get(kernel_dashboard._redis_space))
    assert nb_kernels_before == nb_kernels_after + 1







