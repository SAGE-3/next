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

import time
import socketio
import json
import os
from wall import Wall
import requests
import argparse
import urllib3

urllib3.disable_warnings()


class BoardProxy():
    def __init__(self, config_file):
        NB_TRIALS = 5
        self.wall = None
        try:
            self.__config = json.load(open(config_file, 'r'))
            # Loop to wait for node server to be up
            while NB_TRIALS:
                try:
                    response = requests.get(self.__config['server'], timeout=5)
                    if response.status_code != 500:
                        print(f'Server ready {response.status_code}')
                        break
                except requests.exceptions.RequestException as e:
                    print('Server not ready, trying again', e)
                    time.sleep(1)
                    NB_TRIALS -= 1

            # UUID of the board to track
            self.board_uuid = self.__config["board_uuid"]

            #  Build header with auth token
            self.__head = {'Authorization': 'Bearer {}'.format(self.__config["token"])}

        except Exception as e:
            print(f"Error in the proxy: {e}")
            raise e

    def setup(self):
        self.sio = socketio.Client(ssl_verify=False)
        self.call_backs()
        print(self.__config["server"])
        print(self.__config["path"])
        print({'token': self.__config["token"]})
        self.sio.connect(self.__config["server"],
                         socketio_path=self.__config["path"],
                         auth={'token': self.__config["token"]})

    def loop(self):
        if self.__config['production']:
            self.sio.wait()
        else:
            pass

    def call_backs(self):
        @self.sio.event
        def connect():
            self.sio.emit('board-connect', {'boardId': self.board_uuid})
            print('connection established')

        @self.sio.on("data")
        def raw_data(data):
            print(f"Received msg: {data}")
            if len(data['updates']['apps']) == 0 and len(data['updates']['data']) == 0:
                # just connected and got a wall state message
                # to make sure nothing weired is happending here
                # data["state"]["apps"]
                self.wall = Wall(data, self.__config)
            elif len(data['updates']['apps']) > 0:
                # an app was created or deleted or changes its features (ex. pos)
                app_uuid = list(data["updates"]["apps"].keys())[0]
                if app_uuid not in data["state"]["apps"]:
                    # the app was deleted. Handle app delete
                    print(f"app {app_uuid} was deleted")
                    self.wall.remove_smartbit(app_uuid)
                else:
                    if app_uuid in self.wall.smartbits:
                        # TODO: handle changes to the app features(position)
                        #  or addition of a new element for collection type smartbits (ex.ImageViewer)
                        smartbit = self.wall.smartbits[app_uuid]
                        # check if smartbit exist for this app type
                        if smartbit:
                            smartbit.update_from_msg(
                                data["state"]["apps"][app_uuid])
                    else:
                        print(f"app {app_uuid} was added")
                        # the app was added. Handle app addition
                        app_data = data["state"]["apps"][app_uuid]
                        self.wall.create_smartbit(app_uuid, app_data)

            elif len(data['updates']['data']) > 0:
                # an app changed its data.
                state_uuid = list(data['updates']['data'].keys())[0]
                result = [app_uuid for app_uuid,
                                       app in self.wall.smartbits if app and (app.state_uuid == state_uuid)]
                if len(result) == 1:
                    app_uuid = result[0]
                    print(f"App {app_uuid} changed data")
                    new_data = self.wall.smartbits[app_uuid].get_state()
                    self.wall.smartbits[app_uuid].apply_new_state(
                        new_data["data"])
            else:
                raise Exception(f"Unhandled situation in the proxy. {data}")

        @self.sio.event
        def disconnect():
            print('Disconnecting from the server')

    def run(self):
        self.setup()
        self.loop()


def get_cmdline_parser():
    parser = argparse.ArgumentParser(description='Sage3 Python Proxy Server')
    parser.add_argument('-c', '--config_file', type=str, required=True, help="Configuration file path")
    return parser


if __name__ == "__main__":
    parser = get_cmdline_parser()
    args = parser.parse_args()
    board_proxy = BoardProxy(config_file=args.config_file)
    board_proxy.run()
