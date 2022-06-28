#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field,  validate_model
from utils.generic_utils import create_dict
from operator import attrgetter

class TrackedBaseModel(BaseModel):
    path: Optional[int]
    touched: Optional[set] = set()

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def __setattr__(self, name, value):
        try:
            if self.path is not None:
                if name[0] != "_":
                    print(f"setting {self.path + '.' + name} to {value}. I am in class {self.__class__}")
                    self.touched.add(f"{self.path}.{name}"[1:])
            super().__setattr__(name, value)
        except:
            self.touched.remove(f"{self.path}.{name}"[1:])

    def refresh_data_form_update(self, update_data):
        # TODO replace this temp solution, which updates everything with a
        # solution that updates only necessary fields
        update_data['state'] = update_data['data']['state']
        del (update_data['data']['state'])
        # we don't need to update the following keys:
        do_not_modify = ["_id", "_createdAt", '_updatedAt']
        _ = [update_data.pop(key) for key in do_not_modify]

        def attrsetter(name):
            def setter(obj, val):
                setattr(obj, name, val)

            return setter

        def recursive_iter(u_data, path=[]):
            if isinstance(u_data, dict):
                for k, item in u_data.items():
                    path.append(k)
                    yield from recursive_iter(item, path)
                    path.pop(-1)
            else:
                dotted_path = ".".join(path)
                # attrgetter(dotted_path)(self)
                attrsetter(dotted_path)(self, u_data)

                # yield u_data, path
        # for i, v in recursive_iter(update_data, path=[]):
        #     print(i, v)


    def copy_touched(self):
        touched = self.touched
        fields = [("self", self)]
        while fields:
            field = fields.pop(0)
            for child in [(i,field[1].__dict__[i]) for i in field[1].__fields__.keys()]:

                if isinstance(child[1], BaseModel) and child[0] != "_":
                    child[1].touched = touched
                    fields.append(child)

    def set_path(self):
        self.path = ""
        fields = [("self", self)]
        while fields:
            field = fields.pop(0)
            path = field[1].path
            for child in [(i,field[1].__dict__[i]) for i in field[1].__fields__.keys()]:
                if isinstance(child[1], BaseModel):
                    child[1].path = path + "." + child[0]
                    fields.append(child)

    def  get_touched_data_field_dict(self, field, data):
        """
        add field  of type data.X to the data dict
        used to send update
        :param field:
        :param data:
        :return:
        """
        path_chunks = field.split(".")
        if path_chunks[0] != "data":
            raise Exception(f"The field {field} is not of type data and cannot be handled by this function")
        temp = self
        for path_chunk in path_chunks:
            temp = getattr(temp, path_chunk)
        if temp is None:
            raise Exception(f"cannot find field {field}")
        data = create_dict(field, temp, data)

        return data

    def get_touched_state_field_dict(self, field, data):
        path_chunks = field.split(".")
        if path_chunks[0] != "state":
            raise Exception(f"The field {field} is not of type state and cannot be handled by this function")
        temp = self
        for path_chunk in path_chunks:
            temp = getattr(temp, path_chunk)
        if temp is None:
            raise Exception(f"cannot find field {field}")
        if "state" not in data:
            data["state"] = {}
        data["state"][field] = temp
        return data

    def get_all_touched_fields_dict(self):
        data = {}
        for field in self.touched:
            if field.startswith("data"):
                data = self.get_touched_data_field_dict(field, data)
            elif  field.startswith("state"):
                data = self.get_touched_state_field_dict(field, data)
        return data





class Position(TrackedBaseModel):
    x: int
    y: int

class Size(TrackedBaseModel):
    width: int
    height: int
    depth: int

class Rotation(TrackedBaseModel):
    x: int
    y: int
    z: int

class AppTypes(Enum):
    counter = "Counter"
    note = "Note"

class Data(TrackedBaseModel):
    name: str
    description: str
    position: Position
    size: Size
    rotation: Rotation
    type: AppTypes
    owner_id: str = Field(alias='ownerId')


class SmartBit(TrackedBaseModel):
    app_id: str = Field(alias='_id')
    _createdAt: int
    _updatedAt: Position
    data: Data

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.copy_touched()
        self.set_path()