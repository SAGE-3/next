

#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

# TODO: CRITICAL, I am a proxy -- ignore my own messages.

# TODO: add a new validator function that takes a message received on a
#  channel and makes sure it's structurally valid, i.e., has the right required fields
#  and no unknwon fields

# TODO: call this class something else?
import asyncio
import json
import websockets
import argparse
# import urllib3
import uuid

# urllib3.disable_warnings()


class BoardProxy():
    def __init__(self, config_file, room_id):
        NB_TRIALS = 5
        self.wall = None
        self.__config = json.load(open(config_file))
        self.__room_id = room_id
        self.__headers = {'Authorization': f"Bearer {self.__config['token']}"}

    async def subscribe(self, sock, room_id):
        subscription_id = str(uuid.uuid4())
        message_id = str(uuid.uuid4())
        print('Subscribing to board:', room_id, 'with subscriptionId:', subscription_id)
        msg_sub = {
            'route': '/api/apps/subscribe/:roomId', 'id': message_id,
                   'body': {'subId': subscription_id, 'roomId': room_id}
                   }
        await sock.send(json.dumps(msg_sub))
        msg_sub = {
            'route': '/api/boards/subscribe/:roomId', 'id': message_id,
                   'body': {'subId': subscription_id, 'roomId': room_id}
                   }
        await sock.send(json.dumps(msg_sub))

        # # send the message
        # msg_sub = {'route': '/api/apps/subscribe/:roomId', 'id': message_id,
        #            'body': {'subId': subscription_id, 'roomId': room_id}}
        # await sock.send(json.dumps(msg_sub))

        
    async def run(self):
        async with websockets.connect(self.__config["socket_server"], extra_headers={"Authorization": f"Bearer {self.__config['token']}"}) as ws:
            await self.subscribe(ws, self.__room_id)
            async for msg in ws:
                print(f"I am here and msg is:\n {msg}")






        
def get_cmdline_parser():
    parser = argparse.ArgumentParser(description='Sage3 Python Proxy Server')
    parser.add_argument('-c', '--config_file', type=str, required=True, help="Configuration file path")
    parser.add_argument('-r', '--room_id', type=str, required=False, help="Room id")
    return parser


if __name__ == "__main__":
    parser = get_cmdline_parser()
    args = parser.parse_args()
    board_proxy = BoardProxy(args.config_file, args.room_id)
    asyncio.run(board_proxy.run())
