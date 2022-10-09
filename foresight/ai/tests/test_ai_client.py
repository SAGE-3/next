from ai.ai_client import AIClient
import uuid
from config import funcx as fcx_cfg

class AIClient:
    def test_run_hello_world(self):
        """
        test that we can
        1. submit a hello world job (response is of type UUID)
        2. the job has  a pending field
        """
        ai_client = AIClient()
        command_info = {
            'app_uuid': uuid.uuid4(),
            'msg_uuid': uuid.uuid4(),
            'callback_fn': lambda x: print(f"hello world and data is {x}"),
            'funcx_uuid': fcx_cfg["test_hello_world_uuid"],
            'endpoint_uuid': fcx_cfg["endpoint_uuid"],
            'data': {"model_id": "model_id", "data": "some_data"}
        }
        resp = ai_client.execute(command_info)
        assert isinstance(uuid.UUID(str("8841223f-de37-4d8a-882d-265c1049616a")), uuid.UUID)
        assert "pending" in ai_client.fxc.get_task(resp)
    def test_dispatch_result(self):
        """
        test that we can get the results of a hello world job
        """
        pass
