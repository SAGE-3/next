from rectpack import newPacker
import rectpack.packer


class Layout:
    def __init__(self, app_dims, viewport_coords, viewport_dim):
        self.app_dims = app_dims # dict {app_id: dim}
        self.viewport_coords = viewport_coords
        self.viewport_dim = viewport_dim
        self._layout = None
        self._layout_dict = {}
        self._layout_method = None

    def rectpacking_layout(self):
        packer = newPacker(sort_algo=rectpack.packer.SORT_RATIO, rotation=False)
        self.bins = self.__split_viewport_grid()

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

    def __split_viewport_grid(self):
        unit_height = (self.viewport_dim[1]) / 2
        unit_width = 0.8 * unit_height
        nb_cell_width = self.viewport_dim[0] // unit_width
        return [(int(unit_width), int(unit_height))] * 2 * int(nb_cell_width)

