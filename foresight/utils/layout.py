from rectpack import newPacker
import rectpack.packer


class Layout:
    def __init__(self, app_dims, viewport_coords, viewport_dim):
        self.app_dims = app_dims # dict {app_id: dim}
        self.viewport_coords = viewport_coords
        self.viewport_dim = viewport_dim
        self._layout = None
        self._layout_method = None

    def rectpacking_layout(self):
        packer = newPacker(sort_algo=rectpack.packer.SORT_RATIO, rotation=False)

        packer.add_bin(*self.viewport_dim)

        # Add the rectangles to packing queue
        for app_id, dim in self.app_dims.items():
            packer.add_rect(*dim, rid=app_id)

        # Start packing
        packer.pack()
        self._layout = list(packer[0])
        self._layout_method = "rect-packing"
        self.__convert_relative_to_absolute_pos()



    # TODO: change left right top and bottom gutters to 0
    def __convert_relative_to_absolute_pos(self):
        if self._layout_method == "rect-packing":
            for i in range(len(self._layout)):
                self._layout[i].x += self.viewport_coords[0]
                self._layout[i].y += self.viewport_coords[1]

    # Static
    def get_layout_area(self, layout):
        width, height = 0, 0
        for el in layout:
            pass



