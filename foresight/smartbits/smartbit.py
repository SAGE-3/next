#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------
from enum import Enum

from utils.wall_utils import Sage3Communication
from collections import defaultdict
# from json import JSONEncoder
#
# def _default(self, obj):
#     return getattr(obj.__class__, "jsonify", _default.default)(obj)
#
# _default.default = JSONEncoder.default
# JSONEncoder.default = _default

from pydantic import BaseModel, Field,  validator

class Position(BaseModel):
    x: int
    y: int
    z: int

class Size(BaseModel):
    width: int
    height:int
    depth: int

class Rotation(BaseModel):
    x: int
    y: int
    z: int

class AppTypes(Enum):
    counter = "Counter"
    note = "Note"

class SmartBit(BaseModel):
    id: str
    name: str
    description: str
    position: Position
    size: Size
    rotation: Rotation
    type: AppTypes
    owner_id: str = Field(alias='ownerId')

    class Config:
        validate_assignment = True
        # need to field when obj was initialized to keep track of touched fields
        initialized = False
        touched_fields = set()

    def __init__(self, **kwargs):
            self.__config__.initialized = False
        self.__config__.touched_fields = set()
        super().__init__(**kwargs)
        self.__config__.initialized = True

    @validator("*")
    def validate(cls, value, values, config, field):
        if config.initialized:
            print(f"field name is {field}")
            config.touched_fields.add(field.name)
        return value

    # def update(self):
    #     print(f"updating fields {self.__config__.touched_fields}")

