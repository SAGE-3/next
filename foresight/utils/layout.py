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
        print(f"layout is {self._layout}")
        g = graphviz.Graph()
        for app_id, dim in self.app_dims.items():
            g.node(app_id, shape="box", width=f"{dim[0]/100}", height=f"{dim[1]/100}", fixedsize="True")

        # for node1, node2 in zip(self.app_dims.keys(), list(self.app_dims.keys())[1:]):
        #     print(f"drawing edge between {node1} and {node2}")
        #     g.edge(node1, node2, style="invis")


        objects = json.loads(g.pipe(engine="neato", format="json").decode())["objects"]
        for obj in objects:
            bin_id = 0
            coords = obj["_draw_"][1]["points"][1]
            app_id = obj["name"]
            width = self.app_dims[app_id][0]
            height = self.app_dims[app_id][1]
            self._layout.append((bin_id, coords[0], self.viewport_dim[1] - coords[1], width, height, app_id))

        self._layout_method = "graphviz"
        temp_app_id = objects[0]["name"]
        drawn_width = obj["_draw_"][1]["points"][3][0] - obj["_draw_"][1]["points"][2][0]
        scale = self.app_dims[temp_app_id][0] / drawn_width * 1.2

        min_x_offset = min(x[1] for x in self._layout)
        min_y_offset = min(x[2] for x in self._layout)


        if top_gutter is None:
            top_gutter = self.viewport_dim[1]/8
        if left_gutter is None:
            left_gutter = self.viewport_dim[0] / 10

        self._layout_dict = {x[-1]: (((x[1] - min_x_offset) * scale + self.viewport_coords[0] + left_gutter,
                                      (x[2] - min_y_offset) * scale + self.viewport_coords[1] + top_gutter))
                             for x in self._layout}
        # self._layout_dict = {x[-1]: (((x[1] - min_x_offset) * scale + self.viewport_coords[0], (x[2] - min_y_offset) * scale + self.viewport_coords[0]))
        #                      for x in self._layout}
        #


        # self._layout_dict = {x[-1]: (x[1], x[2]) for x in self._layout}
        # self.__convert_relative_to_absolute_pos()

    def rectpacking_layout(self):
        packer = newPacker(sort_algo=rectpack.packer.SORT_RATIO, rotation=False)
        self.bins = self.split_viewport_grid()

        for _bin in self.bins:
            packer.add_bin(*_bin)

        # Add the rectangles to packing queue
        for app_id, dim in self.app_dims.items():
            packer.add_rect(*dim, rid=app_id)

        # Start packing
        packer.pack()
        self._layout = packer.rect_list()
        self._layout_method = "rect-packing"
        self.__convert_relative_to_absolute_pos()


    def __convert_relative_to_absolute_pos(self, top_gutter=None, left_gutter=None, getter_width=0, bin_number = 0):
        if top_gutter is None:
            top_gutter = self.viewport_dim[1]/8
        if left_gutter is None:
            left_gutter = self.viewport_dim[0] / 10

        if self._layout_method == "rect-packing":
            for el in self._layout:

                self._layout_dict[el[-1]] = [el[1] ,el[2]]
                bin_id = el[0]
                # fix x
                self._layout_dict[el[-1]][0] += self.bins[bin_id][0] * (bin_id // 2) + self.viewport_coords[0] +  left_gutter
                if bin_id > 1:
                    self._layout_dict[el[-1]][0] += getter_width

                # fix y
                self._layout_dict[el[-1]][1] += self.viewport_coords[1] + top_gutter
                if bin_id % 2 != 0:
                    # top row
                    self._layout_dict[el[-1]][1] += self.bins[bin_id][1] + getter_width

    # private?
    def split_viewport_grid(self):
        unit_height = (self.viewport_dim[1]) / 2
        unit_width = 0.8 * unit_height
        nb_cell_width = self.viewport_dim[0] // unit_width
        return [(int(unit_width), int(unit_height))] * 2 * int(nb_cell_width)

