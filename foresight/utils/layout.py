from rectpack import newPacker
import rectpack.packer
import networkx as nx
import graphviz
import json


class Layout:
    def __init__(self, app_dims, viewport_coords, viewport_dim):
        self.app_dims = app_dims # dict {app_id: dim}
        self.viewport_coords = viewport_coords
        self.viewport_dim = viewport_dim
        self._layout = None
        self._layout_dict = {}
        self._layout_method = None

    def graphviz_layout(self,  top_gutter=None, left_gutter=None,):

        self._layout = []

        g = graphviz.Graph()
        for app_id, dim in self.app_dims.items():
            g.node(app_id, shape="box", width=f"{dim[0]/100}", height=f"{dim[1]/100}", fixedsize="True")

        objects = json.loads(g.pipe(engine="neato", format="json").decode())["objects"]
        for obj in objects:
            if "_draw_" not in obj:
                continue
            bin_id = 0
            coords = obj["_draw_"][1]["points"][1]
            app_id = obj["name"]
            width = self.app_dims[app_id][0]
            height = self.app_dims[app_id][1]
            self._layout.append((bin_id, coords[0], self.viewport_dim[1] - coords[1], width, height, app_id))

        self._layout_method = "graphviz"

        obj = objects[0]
        temp_app_id = obj["name"]
        drawn_width = obj["_draw_"][1]["points"][3][0] - obj["_draw_"][1]["points"][2][0]
        scale_line = self.app_dims[temp_app_id][0] / drawn_width

        min_x_offset = min(x[1] for x in self._layout)
        min_y_offset = min(x[2] for x in self._layout)


        if top_gutter is None:
            top_gutter = self.viewport_dim[1]/8
        if left_gutter is None:
            left_gutter = self.viewport_dim[0] / 10

        self._layout_dict = {x[-1]: (((x[1] - min_x_offset) * scale_line + self.viewport_coords[0] + left_gutter,
                                      (x[2] - min_y_offset) * scale_line + self.viewport_coords[1] + top_gutter))
                             for x in self._layout}


    def fdp_graphviz_layout(self, app_to_type, top_gutter=None, left_gutter=None,):
        self._layout = []

        g = graphviz.Graph()

        type_to_apps = {}

        for key, value in app_to_type.items():
            if value in type_to_apps:
                type_to_apps[value].append(key)
            else:
                type_to_apps[value] = [key]

        for app_type, app_ids in type_to_apps.items():
            with g.subgraph(name=f"cluster_{app_type}") as c:
                for app_id in app_ids:
                    dim = self.app_dims[app_id]
                    c.node(app_id, shape="box", fixedsize="True",
                            width=f"{dim[0] / 10}", height=f"{dim[1] / 10}")

        # for app_id, dim in self.app_dims.items():
        #     g.node(app_id, shape="box", width=f"{dim[0]/100}", height=f"{dim[1]/100}", fixedsize="True")

        # index of an app we will use to get the scaling
        index_of_app = -1

        objects = json.loads(g.pipe(engine="fdp", format="json").decode())["objects"]
        for i, obj in enumerate(objects):
            if "_draw_" not in obj or obj["name"].startswith("cluster_"):
                continue

            if index_of_app == -1:
                index_of_app = i

            coords = obj["_draw_"][1]["points"][1]
            app_id = obj["name"]
            width = self.app_dims[app_id][0]
            height = self.app_dims[app_id][1]
            self._layout.append((index_of_app, coords[0], self.viewport_dim[1] - coords[1], width, height, app_id))

        self._layout_method = "graphviz"

        # use the first app obj to determine the scale used in graphviz
        obj = objects[index_of_app]
        temp_app_id = obj["name"]
        drawn_width = obj["_draw_"][1]["points"][3][0] - obj["_draw_"][1]["points"][2][0]
        scale_line = self.app_dims[temp_app_id][0] / drawn_width

        min_x_offset = min(x[1] for x in self._layout)
        min_y_offset = min(x[2] for x in self._layout)


        if top_gutter is None:
            top_gutter = self.viewport_dim[1]/8
        if left_gutter is None:
            left_gutter = self.viewport_dim[0] / 10

        self._layout_dict = {x[-1]: (((x[1] - min_x_offset) * scale_line + self.viewport_coords[0] + left_gutter,
                                      (x[2] - min_y_offset) * scale_line + self.viewport_coords[1] + top_gutter))
                             for x in self._layout}


    # def rectpacking_layout(self):
    #     packer = newPacker(sort_algo=rectpack.packer.SORT_RATIO, rotation=False)
    #     self.bins = self.split_viewport_grid()
    #
    #     for _bin in self.bins:
    #         packer.add_bin(*_bin)
    #
    #     # Add the rectangles to packing queue
    #     for app_id, dim in self.app_dims.items():
    #         packer.add_rect(*dim, rid=app_id)
    #
    #     # Start packing
    #     packer.pack()
    #     self._layout = packer.rect_list()
    #     self._layout_method = "rect-packing"
    #     self.__convert_relative_to_absolute_pos()
    #
    #
    # def __convert_relative_to_absolute_pos(self, top_gutter=None, left_gutter=None, getter_width=0, bin_number = 0):
    #     if top_gutter is None:
    #         top_gutter = self.viewport_dim[1]/8
    #     if left_gutter is None:
    #         left_gutter = self.viewport_dim[0] / 10
    #
    #     if self._layout_method == "rect-packing":
    #         for el in self._layout:
    #
    #             self._layout_dict[el[-1]] = [el[1] ,el[2]]
    #             bin_id = el[0]
    #             # fix x
    #             self._layout_dict[el[-1]][0] += self.bins[bin_id][0] * (bin_id // 2) + self.viewport_coords[0] +  left_gutter
    #             if bin_id > 1:
    #                 self._layout_dict[el[-1]][0] += getter_width
    #
    #             # fix y
    #             self._layout_dict[el[-1]][1] += self.viewport_coords[1] + top_gutter
    #             if bin_id % 2 != 0:
    #                 # top row
    #                 self._layout_dict[el[-1]][1] += self.bins[bin_id][1] + getter_width
    #
    # # private?
    # def split_viewport_grid(self):
    #     unit_height = (self.viewport_dim[1]) / 2
    #     unit_width = 0.8 * unit_height
    #     nb_cell_width = self.viewport_dim[0] // unit_width
    #     return [(int(unit_width), int(unit_height))] * 2 * int(nb_cell_width)

