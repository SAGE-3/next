# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

# TODO: checking messages that are created at the same time and only executing the first
#  one keeping info in received_msg_log for now. These seems to be related to raised=True

# TODO: add a new validator function that takes a message received on a
#  channel and makes sure it's structurally valid, i.e., has all the required fields
#  and no unknown fields

# TODO prevent apps updates on fields that were touched?
import uuid
import json
from board import Board
from room import Room
from smartbitfactory import SmartBitFactory
from utils.sage_communication import SageCommunication
from smartbits.genericsmartbit import GenericSmartBit
from utils.sage_websocket import SageWebsocket
from json_templates.templates import create_app_template

from alignment_stratgies import *

class PySage3:

    def __init__(self, conf, prod_type):
        print("Configuring ps3 client ... ")

        self.done_init = False
        self.conf = conf
        self.prod_type = prod_type
        # self.__headers = {'Authorization': f"Bearer {os.getenv('TOKEN')}"}
        self.__MSG_METHODS = {
            "CREATE": self.__handle_create,
            "UPDATE": self.__handle_update,
            "DELETE": self.__handle_delete,
        }

        self.rooms = {}
        self.s3_comm = SageCommunication(self.conf, self.prod_type)
        self.socket = SageWebsocket(on_message_fn=self.__process_messages)

        self.socket.subscribe(['/api/apps', '/api/rooms', '/api/boards'])
        # Grab and load info already on the board
        self.__populate_existing()
        self.room = None
        self.board = None
        self.done_init = True
        print("Completed configuring Sage3 Client")


    def __populate_existing(self):
        rooms_info = self.s3_comm.get_rooms()
        for room_info in rooms_info:
            self.__handle_create("ROOMS", room_info)
        # Populate existing boards
        boards_info = self.s3_comm.get_boards()
        for board_info in boards_info:
            self.__handle_create("BOARDS", board_info)
        # Populate existing apps
        apps_info = self.s3_comm.get_apps()
        for app_info in apps_info:
            self.__handle_create("APPS", app_info)

    def create_app(self, room_id, board_id, app_type, state):
        try:
            create_app_template["state"].update(state)
            create_app_template["type"] = app_type

            create_app_template["roomId"] = room_id
            create_app_template["boardId"] = board_id
            if app_type not in SmartBitFactory.class_names:
                raise Exception("Smartbit not supported in interactive mode")

            # just try to create to see if it's going to raise an error
            _ = SmartBitFactory.create_smartbit({
                "_id":str(uuid.uuid4()),
                "data": create_app_template,
                "state": create_app_template["state"]
            })
            self.s3_comm.create_app(create_app_template)
        except Exception as e:
            print(f"Err or during creation of app {e}")



    # Handle Create Messages
    def __handle_create(self, collection, doc):
        # we need state to be at the same level as data
        if collection == "ROOMS":
            new_room = Room(doc)
            self.rooms[new_room.id] = new_room
        elif collection == "BOARDS":
            new_board = Board(doc)
            if new_board.roomId in self.rooms:
                self.rooms[new_board.roomId].boards[new_board.id] = new_board
        elif collection == "APPS":
            doc["state"] = doc["data"]["state"]
            del (doc["data"]["state"])
            smartbit = SmartBitFactory.create_smartbit(doc)
            room_id = doc["data"]["roomId"]
            board_id = doc["data"]["boardId"]
            if room_id in self.rooms:
                if board_id in self.rooms[room_id].boards:
                    self.rooms[room_id].boards[board_id].smartbits[smartbit.app_id] = smartbit

    # Handle Update Messages
    def __handle_update(self, collection, doc, updates):
        # TODO: prevent updates to fields that were touched
        # TODO: this in a smarter way. For now, just overwrite the complete object

        id = doc["_id"]
        if collection == "ROOMS":
            self.rooms[id].handleUpdate(doc)
        elif collection == "BOARDS":
            room_id = doc['data']['roomId']
            # TODO: proceed to BOARD update with the updates field passed as param
        elif collection == "APPS":
            board_id = doc['data']["boardId"]
            room_id = doc['data']['roomId']
            sb = self.rooms[room_id].boards[board_id].smartbits[id]

            if sb is not None and type(sb) is not GenericSmartBit:
                # Note that set_data_form_update clear touched field
                sb.refresh_data_form_update(doc, updates)


    # Handle Delete Messages
    def __handle_delete(self, collection, doc):
        print("Delete not yet supported through API")

    # def get_apps(self, room_id=None, board_id=None, type=None):
    #     if room_id is None or board_id is None:
    #         print("listing apps requires  room and board ids")
    #         return
    #     if type is not None:
    #         return {x[0]: x[1] for x in self.rooms[room_id].boards[board_id].smartbits if x[1].data.type == type}
    #     else:
    #         return {x[0]: x[1] for x in self.rooms[room_id].boards[board_id].smartbits}


    def __process_messages(self, ws, msg):
        message = json.loads(msg)
        # Duplicate messages for the time being to allow python to work
        # event.doc is now an array of docs
        for doc in message['event']['doc']:
            msg = message.copy()
            msg['event']['doc'] = doc
        # End of duplicating messages so old code can work
            collection = msg["event"]['col']
            doc = msg['event']['doc']
            msg_type = msg["event"]["type"]
            app_id = doc["_id"]

            # Its a create message
            if msg_type == "CREATE":
                self.__MSG_METHODS[msg_type](collection, doc)
            # Its a delete message
            elif msg_type == "DELETE":
                self.__MSG_METHODS[msg_type](collection, doc)
            # Its an update message
            elif msg_type == "UPDATE":
                # all updates for this message [{id: string, updates: {}}, {id:string, updates: {}}...]
                all_updates = msg['event']['updates']
                msg_updates = {}
                # find the updates for this specific app
                for u in all_updates:
                    if u['id'] == app_id:
                        msg_updates = u['updates']
                        break
                msg['event']['updates'] = msg_updates

                if "updates" in msg['event'] and 'raised' in msg['event']['updates'] and msg['event']['updates']["raised"]:
                    pass

                self.__MSG_METHODS[msg_type](collection, doc, msg_updates)

    def update_size(self, app, width=None, height=None, depth=None):
        if not isinstance(app, SmartBit):
            print(f"apps should be a smartbit. Found {type(app)}")
            return
        if width is None and height is None and depth is None:
            print("At last one of the parameters is required")
            return
        if width is not None:
            app.data.size.width = width
        if height is not None:
            app.data.size.height = width
        if depth is not None:
            app.data.size.depth = depth
        app.send_updates()

    def update_position(self, app, x=None, y=None, z=None):
        """
        Update the position of the app
        :param app: the smartbit of the app to update
        :param x: the x position
        :param y: the y position
        :param z: the z position
        """
        if not isinstance(app, SmartBit):
            print(f"apps should be a smartbit. Found {type(app)}")
            return
        if x is None and y is None and z is None:
            print("At last one of the parameters is required")
            return
        if x is not None:
            app.data.position.x = x
        if y is not None:
            app.data.position.y = y
        if z is not None:
            app.data.position.z = z # changed from depth
        app.send_updates()

    def update_rotation(self, app, x=None, y=None, z=None):
        if not isinstance(app, SmartBit):
            print(f"apps should be a smartbit. Found {type(app)}")
            return
        if x is None and y is None and z is None:
            print("At last one of the parameters is required")
            return
        if x is not None:
            app.data.rotation.x = x
        if y is not None:
            app.data.rotation.y = y
        if z is not None:
            app.data.rotation.z = z
        app.send_updates()

    def list_assets(self, room_id=None):
        assets = self.s3_comm.get_assets()
        if room_id is not None:
            assets = [x for x in assets if x["data"]["room"] == room_id]
        assets_info = []
        for asset in assets:
            assets_info.append({
                "_id": asset["_id"],
                "filename": asset["data"]["originalfilename"],
                "mimetype": asset["data"]["mimetype"],
                "size":  asset["data"]["size"]
            })
        return assets_info

    def get_public_url(self, asset_id):
        """Returns the public url for the asset with the given id"""
        return self.s3_comm.format_public_url(asset_id)

    def update_state_attrs(self, app, **kwargs):
        """Updates the state attributes of the given app.
        The attributes to be updated are passed as kwargs"""
        if not isinstance(app, SmartBit):
            print(f"Apps should be a smartbit. Found {type(app)}")
            return

        for k in kwargs.keys():
            # TODO also check that the values passed are valid values for that field
            if not hasattr(app.state, k):
                print(f"{k} is not a valid attribute of the {type(app)}'s state")
                return
        for k, v in kwargs.items():
            setattr(app.state, k, v)
        app.send_updates()

    def set_room(self, room_id):
        if room_id in self.rooms:
            self.room = room_id
        else:
            print(f"Room {room_id} not found")

    def set_board(self, board_id):
        if self.room is None:
            print("Please set current room first")
            return
        room_id = self.room
        if board_id in self.rooms[room_id].boards:
            self.board = board_id
        else:
            print(f"Board {board_id} not found")

    def get_current_room(self):
        return self.room

    def get_current_board(self):
        return self.board

    def get_apps(self, room_id: str = None, board_id: str = None) -> List[dict]:
        if room_id is None and board_id is None:
            print("Please provide a room id or a board id")
            return
        if room_id and board_id:
            print("Please provide either a room id or a board id, not both")
            return
        apps = self.s3_comm.get_apps()
        if room_id is not None:
            return [app for app in apps if app['data']['roomId'] == room_id]
        if board_id is not None:
            return [app for app in apps if app['data']['boardId'] == board_id]
        return apps

    def get_apps_by_type(self, app_type: str = None, room_id: str = None, board_id: str = None) -> List[dict]:
        apps = self.get_apps(room_id, board_id)
        if app_type is None:
            print("Please provide an app type to filter by")
        return [app for app in apps if app['data']['type'] == app_type]

    def get_apps_by_room(self, room_id: str = None) -> List[dict]:
        if room_id is None:
            print("Please provide a room id to filter by")
        return self.get_apps(room_id)

    def get_apps_by_board(self, board_id: str = None) -> List[dict]:
        if board_id is None:
            print("Please provide a board id to filter by")
        return self.get_apps(board_id=board_id)

    def get_apps_by_ids(self, room_id: str = None, board_id: str = None, app_ids: List[str] = None) -> List[dict]:
        apps = self.get_apps(room_id, board_id)
        return [app for app in apps if app['_id'] in app_ids]

    def get_smartbit_by_id(self, app_id: str, room_id: str = None, board_id: str = None) -> dict:
        if room_id is None or board_id is None:
            print("Please provide a room id and a board id")
            return
        smartbits = self.get_smartbits(room_id, board_id)
        return smartbits[app_id]

    def get_smartbits(self, room_id: str = None, board_id: str = None) -> dict:
        if room_id is None or board_id is None:
            print("Please provide a room id and a board id")
            return
        return self.rooms[room_id].boards[board_id].smartbits.smartbits_collection

    def get_smartbits_by_ids(self, app_ids: list, room_id: str = None, board_id: str = None) -> list:
        if room_id is None or board_id is None:
            print("Please provide a room id and a board id")
            return
        if app_ids is None:
            print("Please provide a list of app ids to filter by")
        smartbits = self.get_smartbits(room_id, board_id)
        return [smartbits[app_id] for app_id in app_ids]

    def get_smartbits_by_type(self, app_type: str, room_id: str = None, board_id: str = None) -> list:
        if room_id is None or board_id is None:
            print("listing apps requires room and board ids")
            return
        if app_type is None:
            print("Please provide an app type to filter by")
        smartbits = self.get_smartbits(room_id, board_id)
        return [v for k, v in smartbits.items() if v.data.type == 'Stickie']

    def sort_apps_by_creation_date(self, apps: list = None) -> dict:
        if apps is None:
            apps = self.get_apps()
        apps = sorted(apps, key=lambda x: x['_createdAt'], reverse=False)
        return apps

    def sort_apps_by_type(self, apps: list = None) -> dict:
        if apps is None:
            apps = self.get_apps()
        apps = sorted(apps, key=lambda x: x['data']['type'], reverse=False)
        return apps

    def sort_apps_by_size(self, apps: list = None) -> dict:
        if apps is None:
            apps = self.get_apps()
        apps = sorted(apps, key=lambda x: x['data']['size']['width'], reverse=False)
        apps = sorted(apps, key=lambda x: x['data']['size']['height'], reverse=False)
        return apps


    def get_types_count(self, apps: list = None) -> dict:
        """
        Returns a dictionary with the number of apps of each type

        :param apps: list of apps to be counted
        :return: dictionary with the number of apps of each type
        """
        if apps is None:
            apps = self.get_apps()
        count = {}
        for app in apps:
            if app['data']['type'] in count:
                count[app['data']['type']] += 1
            else:
                count[app['data']['type']] = 1
        return count

    def align_selected_apps(self, smartbits: List[SmartBit] = None, align: str = '', gap = 20, **kwargs) -> None:
        """
        Aligns the apps in the list according to the given align_type

        :param apps: list of apps to be aligned
        :param align_type: type of alignment. Possible values: left, right, top, bottom
        :return: list of apps aligned
        """
        # sort smartbits by the word in parentheses in the state.text field
        # smartbits = sorted(smartbits, key=lambda sb: (sb.state.text.split('(')[1].split(')')[0]))

        by_dim = kwargs.get("by_dim", 1) # number of rows or columns to use



        if smartbits is None:
            return

        # left_x, right_x, top_y, bottom_y = self.get_app_geometry(smartbits)
        # center_x, center_y = (left_x + (right_x - left_x) / 2, top_y + (bottom_y - top_y) / 2)

        if align == 'left':
            align_to_left(smartbits)
        elif align == 'right':
            align_to_right(smartbits)
        elif align == 'top':
            align_to_top(smartbits)
        elif align == 'bottom':
            align_to_bottom(smartbits)
        elif 'column' in align:
            align_by_col(smartbits, num_cols=by_dim)
        elif 'row' in align:
            align_by_row(smartbits, num_rows=by_dim)
        # elif align == 'col-center':
        #     self.align_col_center(smartbits)
        # elif align == 'row-center':
        #     self.align_row_center()
        elif align == 'stack':
            align_stack(smartbits)

    def clean_up(self):
        print("cleaning up client resources")
        for room_id in self.rooms.keys():
            for board_id in self.rooms[room_id].boards.keys():
                for app_info in self.rooms[room_id].boards[board_id].smartbits:
                    app_info[1].clean_up()
