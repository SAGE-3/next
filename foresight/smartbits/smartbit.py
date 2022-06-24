#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------
from enum import Enum
from treelib import Node, Tree
from typing import Optional
from pydantic import BaseModel, Field,  validator

class TrackedBaseModel(BaseModel):

    path: Optional[int]
    touched: Optional[set] = set()

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def __setattr__(self, name, value):
        if self.path is not None:
            print(f"setting {self.path+'.'+ name} to {value}. I am in class {self.__class__}")
            self.touched.add(f"{self.path}.{name}"[1:])
        return super().__setattr__(name, value)

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
                if isinstance(child[1], BaseModel) and child[0] != "_":
                    child[1].path = path + "." + child[0]
                    fields.append(child)

class Position(TrackedBaseModel):
    x: int
    y: int
    z: int

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