#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

from message_broker.redis_client import RedisThreadedClient
import redis
import json



def test_instantiate_redisclient():
    rclient = RedisThreadedClient()
    assert isinstance(rclient.redis_conn, redis.client.Redis)

def test_subscribe():
    r = redis.Redis(host='localhost', port=6379)
    payload = json.dumps({"msg": "Hi there"})

    def test_msg_func(msg):
        r.set("msg", json.loads(msg['data'])["msg"])

    rclient = RedisThreadedClient()
    rclient.subscribe("chan:1", test_msg_func)
    assert "chan:1" in rclient.subscriptions


    r.publish("chan:1", payload)
    assert json.loads(payload)['msg'] == r.get("msg").decode("utf-8")

    rclient.unsubscribe()

    assert rclient.running_thread == None
