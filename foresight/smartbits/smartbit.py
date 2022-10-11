# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, validate_model
from utils.generic_utils import create_dict
from utils.sage_communication import SageCommunication
from operator import attrgetter
from jupyterkernelproxy_client import JupyterKernelClient
from ai.ai_client import AIClient
from config import config as conf, prod_type

class TrackedBaseModel(BaseModel):
    path: Optional[int]
    touched: Optional[set] = set()
    _s3_comm: SageCommunication = SageCommunication(conf, prod_type)
    _jupyter_client: JupyterKernelClient = JupyterKernelClient(conf[prod_type]["flask_server"])
    _ai_client: AIClient = AIClient()

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def __setattr__(self, name, value):
        try:
            if self.path is not None:
                if name[0] != "_":
                    print(f"in setting __setattr__ {name} to {value}")
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
                fields = name.split(".")
                for field in fields[0:-1]:
                    obj = getattr(obj, field)
                # using object setattr to avoid adding field to touched
                try:
                    object.__setattr__(obj, fields[-1], val)
                except:
                    obj[fields[-1]] = val
            return setter

        def recursive_iter(u_data, path=[]):
            if isinstance(u_data, dict) and len(u_data) > 0:
                for k, item in u_data.items():
                    path.append(k)
                    yield from recursive_iter(item, path)
                    path.pop(-1)
            else:
                dotted_path = ".".join(path)
                yield dotted_path, u_data

        for dotted_path, val in recursive_iter(update_data):
            attrsetter(dotted_path)(self, val)

    def copy_touched(self):
        touched = self.touched
        fields = [("self", self)]
        while fields:
            field = fields.pop(0)
            for child in [(i, field[1].__dict__[i]) for i in field[1].__fields__.keys()]:

                if isinstance(child[1], BaseModel) and child[0] != "_":
                    child[1].touched = touched
                    fields.append(child)

    def set_path(self):
        self.path = ""
        fields = [("self", self)]
        while fields:
            field = fields.pop(0)
            path = field[1].path
            for child in [(i, field[1].__dict__[i]) for i in field[1].__fields__.keys()]:
                if isinstance(child[1], BaseModel):
                    child[1].path = path + "." + child[0]
                    fields.append(child)

    def get_all_touched_fields_dict(self):
        data = {}
        for field in self.touched:
            if field.startswith("data."):
                # updates don't need the data prefix
                data[field[5:]] = attrgetter(field)(self)
            else:
                data[field] = attrgetter(field)(self)
        return data

    def action_sends_update(_func):
        def wrapper(self, *args, **kwargs):
            _func(self, *args, **kwargs)
            # clearing the func and the and params
            self.state.executeInfo.executeFunc = ""
            self.state.executeInfo.params = {}
        return wrapper


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
    ai_pane = "AIPane"
    counter = "Counter"
    note = "Note"
    data_table = "DataTable"
    code_cell = "CodeCell"
    sage_cell = "SageCell"
    slider = "Slider"
    stickie = "Stickie"
    vegalite = "VegaLite"
    vegaliteviewer = "VegaLiteViewer"

    genericsmartbit = "GenericSmartBit"

class Data(TrackedBaseModel):
    name: str
    description: str
    position: Position
    size: Size
    rotation: Rotation
    #type: AppTypes
    type: str
    # owner_id: str = Field(alias='ownerId')
    owner_id: str = Field(alias='ownerId')


class SmartBit(TrackedBaseModel):
    app_id: str = Field(alias='_id')
    _createdAt: int
    _updatedAt: int
    data: Data

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.copy_touched()
        self.set_path()

    def send_updates(self):
        new_data = self.get_all_touched_fields_dict()
        self.touched.clear()
        self._s3_comm.send_app_update(self.app_id, new_data)


class ExecuteInfo(TrackedBaseModel):
    # executeFunc is not recognized duirng manual update in refresh_data_form_update
    # so we end up updating executeFunc instead
    # execute_func: str = Field(alias='executeFunc')
    executeFunc: str
    params: dict
