#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

# TODO Change time.sleep(x) to tries until values is found
#  or until timeout afer x seconds

from smartbits.proxy import Proxy
from smartbits.wall import Wall
from media_server.media_server_utils import upload_file

from os import path
from rejson import Path
import json
import time
import uuid
import pytest
import datetime

@pytest.fixture(scope="session", autouse=True)
def cleanup(request):
    """Cleanup a testing directory once we are finished."""

    def unsubscribe_proxy():
        # Proxy.delete_wall()
        # Proxy.wall_instance.task_scheduler.check_status_rq_job_ids = False
        # time.sleep(6)
        print("I am here")
        Proxy.wall_instance.task_scheduler.check_status_rq_job_ids = False
        Proxy.redis_client.unsubscribe()

    request.addfinalizer(unsubscribe_proxy)


def test_instantiate_proxy_pass():
    """  Check that that singleton was instantiated properly """
    p = Proxy()
    assert p == Proxy.get_instance()

def test_instantiate_proxy_fail():
    """test that creating another proxy instant (singleton) raises an exeption"""
    with pytest.raises(Exception) as e:
        # we already created an instance in test_instantiate_proxy_pass so
        # creating another one should raise an exception
        assert Proxy()
    assert str(e.value) == "This class is a singleton and instance already exists!"

def test_instantiating_and_deleting_wall():
    wall_name = Proxy.instantiate_new_wall()
    assert wall_name != None
    assert isinstance(Proxy.get_wall_info()["wall_instance"], Wall)
    assert Proxy.get_wall_info()["wall_instance"].smartbit_id == wall_name
    assert isinstance(Proxy.get_wall_info()["wall_date_time"], datetime.datetime)
    Proxy.delete_wall()
    assert Proxy.get_wall_info() == None


def test_create_pastitsmartbit():
    wall_name = Proxy.instantiate_new_wall()
    # Proxy.wall_instance.format_execute_up()

    json_command_info = {
        "uuid": str(uuid.uuid4()),
        "client_id": 1234,
        "smartbit_id": Proxy.wall_instance.smartbit_id,
        "action": "create_new_smartbit",
        "action_params":{
            "smartbit_type": "PostitSmartBit",
            "smartbit_params": {"text": "Test Post It", "wall_coordinates": [12, 3, 14, 4]}
        }
    }
    Proxy.execute(json_command_info)
    assert len(Proxy.wall_instance.smartbits) == 2
    Proxy.delete_wall()


def test_publish_up():
    wall_name = Proxy.instantiate_new_wall()
    from message_broker.redis_client import RedisThreadedClient
    rclient = RedisThreadedClient()
    _uuid = str(uuid.uuid4())
    json_command_info = {
        "uuid": _uuid,
        "client_id": 1234,
        "smartbit_id": Proxy.wall_instance.smartbit_id,
        "action": "create_new_smartbit",
        "action_params":{
            "smartbit_type": "PostitSmartBit",
            "smartbit_params": {"text": "Test Post It", "wall_coordinates": [12, 3, 14, 4]}
        }
    }
    rclient.publish("execute:up", json.dumps(json_command_info))
    time.sleep(1)
    assert len(Proxy.get_wall_info()["wall_instance"].smartbits) == 2
    channel = Proxy.rejson_client.jsonget(f"msg:{_uuid}", Path(".channel"))
    assert channel == "execute:up"
    response_uuid = Proxy.rejson_client.jsonget(f"execute:up:{_uuid}")
    assert response_uuid is not None
    Proxy.delete_wall()

def test_create_up_stores_json_set():
    wall_name = Proxy.instantiate_new_wall()
    _uuid = str(uuid.uuid4())
    json_command_info = {
        "uuid": _uuid,
        "client_id": 1234,
        "smartbit_id": Proxy.wall_instance.smartbit_id,
        "action": "create_new_smartbit",
        "action_params": {
            "smartbit_type": "PostitSmartBit",
            "smartbit_params": {"text": "Test Post It", "wall_coordinates": [0, 0, 0, 0]}
        }
    }
    Proxy.execute(json_command_info)
    time.sleep(1)
    _obj = Proxy.rejson_client.jsonget(f"msg:{_uuid}")
    assert _obj is not None
    assert Proxy.rejson_client.jsonget(f"msg_details:{_uuid}", Path('.action_params.smartbit_type')) =="PostitSmartBit"
    Proxy.delete_wall()



def test_exec_up_uppercase_postit():
    wall_name = Proxy.instantiate_new_wall()
    json_command_info = {
        "uuid": str(uuid.uuid4()),
        "client_id": 1234,
        "smartbit_id": Proxy.wall_instance.smartbit_id,
        "action": "create_new_smartbit",
        "action_params": {
            "smartbit_type": "PostitSmartBit",
            "smartbit_params": {"text": "Test Post It", "wall_coordinates": [12, 3, 14, 4]}
        }
    }
    Proxy.execute(json_command_info)
    smartbit_id = list(Proxy.wall_instance.smartbits)[1][0]
    msg = {
        "uuid": str(uuid.uuid4()),
        'client_id': 1234,
        'smartbit_id': smartbit_id,
        'action': 'uppercase',
        'action_params': {}
    }
    from message_broker.redis_client import RedisThreadedClient
    rclient = RedisThreadedClient()
    rclient.publish("execute:up", json.dumps(msg))
    time.sleep(1)
    assert Proxy.wall_instance.smartbits[smartbit_id].text == "Test Post It".upper()
    Proxy.delete_wall()


def test_create_imagesmartbit():
    wall_name = Proxy.instantiate_new_wall()
    file_path = "media_server/tests/data/dog.jpg"
    assert path.exists(file_path)

    file_url = upload_file(file_path)

    json_command_info = {
        "uuid": str(uuid.uuid4()),
        "client_id": 1234,
        "smartbit_id": Proxy.wall_instance.smartbit_id,
        "action": "create_new_smartbit",
        'action_params':
            {
                'smartbit_type': 'ImageSmartBit',
                'smartbit_params':
                    {
                        'fileurl': f"{file_url}",
                        'wall_coordinates': [0, 0, 200, 200]
                    }
            }
    }
    assert len(Proxy.get_wall_info()["wall_instance"].smartbits) == 1
    Proxy.execute(json_command_info)
    assert len(Proxy.wall_instance.smartbits) == 2
    Proxy.delete_wall()

def test_delete_smartbit():
    wall_name = Proxy.instantiate_new_wall()
    json_command_info = {
        "uuid": str(uuid.uuid4()),
        "client_id": 1234,
        "smartbit_id": Proxy.wall_instance.smartbit_id,
        "action": "create_new_smartbit",
        "action_params":{
            "smartbit_type": "PostitSmartBit",
            "smartbit_params": {"text": "Test Post It", "wall_coordinates": [12, 3, 14, 4]}
        }
    }
    Proxy.execute(json_command_info)
    assert len(Proxy.get_wall_info()["wall_instance"].smartbits) == 2 # the wall smartbit + new smartbit
    smartbit_id = list(Proxy.wall_instance.smartbits)[1][0]
    remove_smartbit = {
        "uuid": str(uuid.uuid4()),
        "client_id": 1234,
        "smartbit_id": Proxy.wall_instance.smartbit_id,
        "action": "remove_smartbit",
        "action_params": {"smartbit_id": smartbit_id}
    }
    Proxy.execute(remove_smartbit)
    time.sleep(1)
    assert len(Proxy.wall_instance.smartbits) == 1 # the wall
    Proxy.delete_wall()

# def test_get_wall_state():
#     wall_name = Proxy.instantiate_new_wall()
#     json_command_info = {
#         "uuid": str(uuid.uuid4()),
#         "client_id": 1234,
#         "smartbit_id": Proxy.wall_instance.smartbit_id,
#         "action": "create_new_smartbit",
#         "action_params": {
#             "smartbit_type": "PostitSmartBit",
#             "smartbit_params": {"text": "Test Post It", "wall_coordinates": [12, 3, 14, 4]}
#         }
#     }
#     Proxy.execute(json_command_info)
#
#     file_path = "media_server/tests/data/dog.jpg"
#     file_url = upload_file(file_path)
#     json_command_info = {
#         "uuid": str(uuid.uuid4()),
#         "client_id": 1234,
#         "smartbit_id": Proxy.wall_instance.smartbit_id,
#         "action": "create_new_smartbit",
#         'action_params':
#             {
#                 'smartbit_type': 'ImageSmartBit',
#                 'smartbit_params':
#                     {
#                         'fileurl': f"{file_url}",
#                         'wall_coordinates': [0, 0, 200, 200]
#                     }
#             }
#     }
#     Proxy.execute(json_command_info)
#     assert len(Proxy.get_wall_info()["wall_instance"].smartbits) == 3
#     _uuid = str(uuid.uuid4())
#     json_command_info = {
#         "uuid": _uuid,
#         "client_id": 1234,
#         "smartbit_id": Proxy.wall_instance.smartbit_id,
#         "action": "get_wall_state",
#         "action_params": {}
#     }
#     Proxy.execute(json_command_info)
#     uuid_response = Proxy.rejson_client.jsonget(f"execute:up:{_uuid}")
#     assert uuid_response is not None
#     assert len(Proxy.rejson_client.jsonget(f"msg_details:{uuid_response}", Path('.action_results.smartbits'))) == 2
#     Proxy.delete_wall()


def test_update_smartbit():
    wall_name = Proxy.instantiate_new_wall()
    json_command_info = {
        "uuid": str(uuid.uuid4()),
        "client_id": 1234,
        "smartbit_id": Proxy.wall_instance.smartbit_id,
        "action": "create_new_smartbit",
        "action_params": {
            "smartbit_type": "PostitSmartBit",
            "smartbit_params": {"text": "Test Post It", "wall_coordinates": [0, 0, 0, 0]}
        }
    }
    Proxy.execute(json_command_info)
    from message_broker.redis_client import RedisThreadedClient
    rclient = RedisThreadedClient()
    smartbit_id = list(Proxy.wall_instance.smartbits)[1][0]
    update_up_msg = {
        "uuid": str(uuid.uuid4()),
        'smartbit_type': 'PostitSmartBit',
        'client_id': 1234,
        'smartbit_id': smartbit_id,
        'action': 'update_wall_coordinates',
        'action_params': {'wall_coordinates': [1, 2, 3, 4]}
    }
    rclient.publish("execute:up", json.dumps(update_up_msg))
    # give the update a couple of seconds to update
    time.sleep(1)
    assert Proxy.wall_instance.smartbits[smartbit_id].wall_coordinates == [1, 2, 3, 4]
    Proxy.delete_wall()

def test_exec_up_bw_image():
    # we need to make sure the fileurl exisits, otherwise this test fails
    wall_name = Proxy.instantiate_new_wall()
    file_path = "media_server/tests/data/dog.jpg"
    file_url = upload_file(file_path)
    json_command_info = {
        "uuid": str(uuid.uuid4()),
        "client_id": 1234,
        "smartbit_id": Proxy.wall_instance.smartbit_id,
        "action": "create_new_smartbit",
        'action_params':
            {
                'smartbit_type': 'ImageSmartBit',
                'smartbit_params':
                    {
                        'fileurl': f"{file_url}",
                        'wall_coordinates': [0, 0, 200, 200]
                    }
            }
    }
    Proxy.execute(json_command_info)
    assert len(Proxy.wall_instance.smartbits) == 2
    smartbit_id = list(Proxy.wall_instance.smartbits)[1][0]
    _uuid = str(uuid.uuid4())
    msg = {
        "uuid": _uuid,
        'client_id': 1234,
        'smartbit_id': smartbit_id,
        'action': 'convert_bw',
        'action_params': {"wall_smartbit_id": Proxy.wall_instance.smartbit_id}
    }
    from message_broker.redis_client import RedisThreadedClient
    rclient = RedisThreadedClient()
    rclient.publish("execute:up", json.dumps(msg)) # creates new smartbit bw image
    time.sleep(1)
    assert len(Proxy.wall_instance.smartbits) == 3
    Proxy.delete_wall()
    print("I just deleted a wall")

def test_execute_up_with_enqueue_function():
    wall_name = Proxy.instantiate_new_wall()
    _uuid = str(uuid.uuid4())
    json_command_info = {
        "uuid": _uuid,
        "client_id": 1234,
        "smartbit_id": Proxy.wall_instance.smartbit_id,
        "action": "create_new_smartbit",
        "action_params": {
            "smartbit_type": "PostitSmartBit",
            "smartbit_params": {"text": "Test Post It", "wall_coordinates": [0, 0, 0, 0]}
        }
    }
    Proxy.execute(json_command_info)
    smartbit_id = list(Proxy.wall_instance.smartbits)[1][0]
    _uuid = str(uuid.uuid4())
    msg = {
        "uuid": _uuid,
        'client_id': 1234,
        'smartbit_id': smartbit_id,
        'action': 'get_topics',
        'action_params': {}
    }
    print(f"UUID is {_uuid}")
    from message_broker.redis_client import RedisThreadedClient
    rclient = RedisThreadedClient()
    rclient.publish("execute:up", json.dumps(msg))
    time.sleep(1)
    assert Proxy.wall_instance.task_scheduler.get_status(_uuid) is not None
    print("\n******")
    print(Proxy.wall_instance.task_scheduler.get_status(_uuid))
    print("******\n")
    # w = Worker(['default'],
    #            connection=Proxy.wall_instance.task_scheduler.redis_conn)
    # w.work(burst=True)
    while Proxy.wall_instance.task_scheduler.get_status(_uuid) != "finished":
        print("\n******")
        print(Proxy.wall_instance.task_scheduler.get_status(_uuid))
        print("******\n")
        time.sleep(2)

    time.sleep(2)
    import random;
    random.seed(44);
    assert Proxy.wall_instance.smartbits[smartbit_id].topics is not None
    Proxy.wall_instance.task_scheduler.check_status_rq_job_ids = False
    Proxy.delete_wall()

def test_yolo():
    wall_name = Proxy.instantiate_new_wall()
    file_path = "media_server/tests/data/dog.jpg"
    file_url = upload_file(file_path)
    json_command_info = {
        "uuid": str(uuid.uuid4()),
        "client_id": 1234,
        "smartbit_id": Proxy.wall_instance.smartbit_id,
        "action": "create_new_smartbit",
        'action_params':
            {
                'smartbit_type': 'ImageSmartBit',
                'smartbit_params':
                    {
                        'fileurl': f"{file_url}",
                        'wall_coordinates': [0, 0, 200, 200]
                    }
            }
    }
    Proxy.execute(json_command_info)
    smrtbit_id = list(Proxy.wall_instance.smartbits)[1][0]
    _uuid = str(uuid.uuid4())
    json_command_info = {
        "uuid": _uuid,
        "client_id": 1234,
        "smartbit_id": smrtbit_id,
        "action": "get_objects",
        "action_params": {}
    }
    Proxy.execute(json_command_info)

    while Proxy.wall_instance.task_scheduler.get_status(_uuid) != "finished":
        print("\n******")
        print(Proxy.wall_instance.task_scheduler.get_status(_uuid))
        print("******\n")
        time.sleep(2)
    time.sleep(2)
    sb = list(Proxy.wall_instance.smartbits)[1][1]
    print(f"******* len of wall is {len(Proxy.wall_instance.smartbits)}")
    print(f"{sb.objects}")
    print("************")
    assert sb.objects[0]["object"] == "dog"
    Proxy.delete_wall()


def test_JupyterCell():
    wall_name = Proxy.instantiate_new_wall()
    # assert True
    json_command_info = {
        "uuid": str(uuid.uuid4()),
        "client_id": 1234,
        "smartbit_id": Proxy.wall_instance.smartbit_id,
        "action": "create_new_smartbit",
        'action_params':
            {
                "requires_redis": True,
                'smartbit_type': 'JupyterCellSmartBit',
                'smartbit_params':
                    {
                        "raw_cell": "A=10",
                        "wall_coordinates": [12, 3, 14, 4]
                    }
            }
    }
    Proxy.execute(json_command_info)
    smartbit_id, jupyter_cell = list(Proxy.wall_instance.smartbits)[1]

    # This is a hack to get this test to work outside without needed a iPython cell
    from IPython.terminal.interactiveshell import TerminalInteractiveShell
    jupyter_cell._ipython = TerminalInteractiveShell()

    assert jupyter_cell.raw_cell == "A=10"
    json_command_info = {
        "uuid": str(uuid.uuid4()),
        "client_id": 1234,
        "smartbit_id": smartbit_id,
        "action": "run_cell",
        "action_params": {}
    }
    Proxy.execute(json_command_info)
    # the above is equivalent to
    # jupyter_cell.run_cell()

    json_command_info = {
        "uuid": str(uuid.uuid4()),
        "client_id": 1234,
        "smartbit_id": smartbit_id,
        "action": "update_attribute",
        "action_params": {"attr_name": "raw_cell", "new_attr_value": "B=20"}
    }
    Proxy.execute(json_command_info)
    assert jupyter_cell.raw_cell == "B=20"

    json_command_info = {
        "uuid": str(uuid.uuid4()),
        "client_id": 1234,
        "smartbit_id": smartbit_id,
        "action": "run_cell",
        "action_params": {}
    }
    Proxy.execute(json_command_info)

    json_command_info = {
        "uuid": str(uuid.uuid4()),
        "client_id": 1234,
        "smartbit_id": smartbit_id,
        "action": "update_attribute",
        "action_params": {"attr_name": "raw_cell", "new_attr_value": "A+B"}
    }
    Proxy.execute(json_command_info)


    json_command_info = {
        "uuid": str(uuid.uuid4()),
        "client_id": 1234,
        "smartbit_id": smartbit_id,
        "action": "run_cell",
        "action_params": {}
    }
    Proxy.execute(json_command_info)
    time.sleep(2)

    assert jupyter_cell._exec_result.result == 30
    # print(jupyter_cell.raw_cell)
    # print(jupyter_cell._future)
    # print(jupyter_cell._exec_result)
    jupyter_cell.cleanup()


    Proxy.delete_wall()

def test_create_compositeSmartbit():
    wall_name = Proxy.instantiate_new_wall()
    _uuid = str(uuid.uuid4())

    file_path = "media_server/tests/data/dog.jpg"
    file_url = upload_file(file_path)

    json_command_info = {
        "uuid": _uuid,
        "client_id": 1234,
        "smartbit_id": Proxy.wall_instance.smartbit_id, "action": "create_new_smartbit",
        "action_params": {
            "smartbit_type": "CompositeSmartBit",

            "smartbit_params": {
                "f_name": {'smartbit_type': "S_String", 'smartbit_params': {"value": "John"}},
                "l_name": {'smartbit_type': "S_String", 'smartbit_params': {"value": "Doe"}},
                "age": {'smartbit_type': "S_Int", 'smartbit_params': {"value": 22}},
                "weight": {'smartbit_type': "S_Float", 'smartbit_params': {"value": 169.2}},
                "profile_picture": {
                    'smartbit_type': 'ImageSmartBit',
                    'smartbit_params': {
                        'fileurl': f"{file_url}",
                        'wall_coordinates': [0, 0, 200, 200]
                    }
                }
            }
        }
    }

    from message_broker.redis_client import RedisThreadedClient
    rclient = RedisThreadedClient()
    rclient.publish("execute:up", json.dumps(json_command_info)) # creates new smartbit bw image
    time.sleep(2)
    a = list(Proxy.wall_instance.smartbits)[1][1]
    from smartbits.compositesmartbit import CompositeSmartBit
    assert type(a) == CompositeSmartBit
    from smartbits.primitives import S_Int
    assert type(a.age) == S_Int
    from smartbits.imagesmartbit import ImageSmartBit
    assert type(a.profile_picture) == ImageSmartBit
    Proxy.delete_wall()



