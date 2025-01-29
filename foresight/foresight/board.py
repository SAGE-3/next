# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------
import json

from foresight.smartbitcollection import SmartBitsCollection
from foresight.utils.layout import Layout
from foresight.celery_tasks import CeleryTaskQueue
from foresight.alignment_strategies import *

BOARD_COLORS = [
    "red",
    "orange",
    "yellow",
    "green",
    "teal",
    "blue",
    "cyan",
    "purple",
    "pink",
]


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
        self.cq = CeleryTaskQueue()

    def reorganize_layout(
        self,
        viewport_position,
        viewport_size,
        buffer_size=100,
        by="combined",
        mode="graphviz",
        selected_apps=None,
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

    def restore_layout(self):
        for app_id, coords in self.stored_app_dims.items():
            sb = self.smartbits[app_id]
            sb.data.size.width = coords[0]
            sb.data.size.height = coords[1]
            sb.send_updates()

    def update_stickies_form_labels(self, result):
        data = result["data"]["application/json"]
        print(f"Got results for clustering is {data} of type {type(data)}")

        # {custer_label: number, ....}
        clusters = {b: a for a, b in enumerate(data.values())}
        for k, v in data.items():
            sb = self.smartbits[k]
            sb.state.text = f"{sb.state.text} ({v})"
            sb.state.color = BOARD_COLORS[clusters[v]]
            sb.send_updates()

    def group_by_topic(
        self, viewport_position: dict, viewport_size: dict, selected_apps: list = None
    ):

        # colors = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'cyan', 'purple', 'pink']

        # double-check the selected apps are all Stickies (for now)
        if selected_apps is not None:

            # group all the smartbits as a list of tuples (app_id, text)
            stickies_query = {
                app_id: self.smartbits[app_id].state.text
                for app_id in selected_apps
                if self.smartbits[app_id].data.type == "Stickie"
            }

            print(f"sticky_list is {stickies_query}")
            # temp_data = '{"1": "Algorithm", "2": "Data Structure", "3":  "Clustering", "4": "Volatility", "5": "Churn", "6": "Returns"}'
            task_input = {
                "task_name": "seer",
                "task_params": {"_id": "cluster", "query": json.dumps(stickies_query)},
            }
            self.cq.execute_task(task_input, self.update_stickies_form_labels)

            # TODO: call the clustering algorithm

    def align_selected_apps(
        self, selected_apps: List[str], align_type: str = None
    ) -> None:
        """
        Aligns the apps in the list according to the given align_type

        :param apps: list of apps to be aligned
        :param align_type: type of alignment. Possible values: left, right, top, bottom
        :return: list of apps aligned
        """
        # sort smartbits by the word in parentheses in the state.text field
        smartbits = [self.smartbits[app_id] for app_id in selected_apps]
        # print(f"smartbits is {smartbits}")

        if smartbits is None or len(smartbits) == 0 or align_type is None:
            return

        by_dim = 1

        if align_type == "left":
            align_to_left(smartbits)
        elif align_type == "right":
            align_to_right(smartbits)
        elif align_type == "top":
            align_to_top(smartbits)
        elif align_type == "bottom":
            align_to_bottom(smartbits)
        elif "column" in align_type:
            align_by_col(smartbits, num_cols=by_dim)
        elif "row" in align_type:
            align_by_row(smartbits, num_rows=by_dim)
        elif align_type == "stack":
            align_stack(smartbits)

    def clean_up(self):
        print("cleaning up client resources")
        for room_id in self.rooms.keys():
            for board_id in self.rooms[room_id].boards.keys():
                for app_info in self.rooms[room_id].boards[board_id].smartbits:
                    app_info[1].clean_up()
