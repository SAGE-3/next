# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from smartbitcollection import SmartBitsCollection
from utils.layout import Layout
import numpy as np


class Board:
    def __init__(self, doc):
        # TODO: since this happens first and it's a a singleon, should we move it to proxy?
        # self.communication = Sage3Communication.instance(config)
        # TODO call this board_id
        self.id = doc["_id"]
        self.name = doc["data"]["name"]
        self.description = doc["data"]["description"]
        self.color = doc["data"]["color"]
        self.ownerId = doc["data"]["ownerId"]
        self.roomId = doc["data"]["roomId"]
        self.layout = None
        self.whiteboard_lines = None
        self.smartbits = SmartBitsCollection()
        self.stored_app_dims = {}

        if "executeInfo" in doc["data"]:
            self.executeInfo = doc["data"]["executeInfo"]
        else:
            self.executeInfo = {"executeFunc": "", "params": {}}

    def reorganize_layout(
        self,
        viewport_position,
        viewport_size,
        buffer_size=100,
        by="combined",
        mode="graphviz",
        selected_apps = None,
    ):
        if by not in ["app_type", "semantic"]:
            print(f"{by} not a valid by option to organize layout. Not executing")
            return
        if mode not in ["tiles", "stacks"]:
            print(f"{mode} not a valid mode to organize layout. Not executing")
            return
        viewport_position = (
            float(viewport_position["x"]),
            float(viewport_position["y"]),
        )
        viewport_size = (float(viewport_size["width"]), float(viewport_size["height"]))

        print("Started executing organize_layout on the baord")
        print(f"viewport position is {viewport_position}")
        print(f"viewport size  is {viewport_size}")
        print(f"buffer size  is {buffer_size}")

        app_dims = {
            x.app_id: (
                x.data.size.width + buffer_size,
                x.data.size.height + buffer_size,
            )
            for x in self.smartbits.smartbits_collection.values()
        }

        if selected_apps is not None:
            app_dims = {x: app_dims[x] for x in selected_apps}

        self.stored_app_dims = app_dims
        # print(f"app_dims is {app_dims}")

        app_to_type = {x: type(self.smartbits[x]).__name__ for x in app_dims.keys()}
        # print(f"app_to_type is {app_to_type}")

        self.layout = Layout(app_dims, viewport_position, viewport_size)
        self.layout.fdp_graphviz_layout(app_to_type)

        for app_id, coords in self.layout._layout_dict.items():
            sb = self.smartbits[app_id]
            sb.data.position.x = coords[0]
            sb.data.position.y = coords[1]
            sb.send_updates()
        print("Done executing organize_layout on the board")

        self.executeInfo = {"executeFunc": "", "params": {}}

    def restore_layout(self):
        for app_id, coords in self.stored_app_dims.items():
            sb = self.smartbits[app_id]
            sb.data.size.width = coords[0]
            sb.data.size.height = coords[1]
            sb.send_updates()

    def group_by_topic(self,
        viewport_position: dict,
        viewport_size: dict,
        selected_apps: list = None):
        self.executeInfo = {"executeFunc": "", "params": {}}
        colors = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'cyan', 'purple', 'pink']
        # double check the selected apps are all Stickies (for now)
        if selected_apps is not None:
            # group all the smartbits as a list of tuples (app_id, text)
            sticky_list = [(app_id, self.smartbits[app_id].state.text) for app_id in selected_apps]
            print(f"sticky_list is {sticky_list}")
            # TODO: call the clustering algorithm
            # cluster the stickies by topic
            for app_id in selected_apps:
                sb = self.smartbits[app_id]
                if sb.data.type != "Stickie":
                    print(f"App {app_id} is not a Sticky. Not executing")
                else:
                    random_color = np.random.choice(colors)
                    # print(f"App {app_id} is a Sticky. Changing color to {random_color}")
                    sb.state.color = random_color
                    sb.send_updates()

