# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from enum import Enum
from typing import Optional, Literal, List
from pydantic import BaseModel, Field, UUID4
from typing import ClassVar
from abc import abstractmethod


# from utils.generic_utils import create_dict
from foresight.utils.sage_communication import SageCommunication
from operator import attrgetter
from foresight.config import config as conf, prod_type


class TrackedBaseModel(BaseModel):
    path: Optional[str] = None
    touched: Optional[set] = set()

    # _s3_comm: SageCommunication = PrivateAttr()
    # The following params should be defined as required in
    # the constructor since Not all apps need them!a
    # _jupyter_client: JupyterKernelProxy = PrivateAttr()
    # _ai_client: AIClient  = PrivateAttr()

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # self._s3_comm = SageCommunication(conf, prod_type)
        # self._jupyter_client: JupyterKernelProxy = JupyterKernelProxy()
        # self._ai_client: AIClient  = AIClient()

    def __setattr__(self, name, value):
        try:
            if self.path is not None:
                if name[0] != "_":
                    # print(f"in setting __setattr__ {name} to {value}")
                    self.touched.add(f"{self.path}.{name}"[1:])
            super().__setattr__(name, value)
        except:
            self.touched.remove(f"{self.path}.{name}"[1:])

    def is_dotted_path_dict(self, dotted_path):
        partial_obj = self
        if dotted_path.split(".")[0] != "state":
            dotted_path = "data." + dotted_path

        for part in dotted_path.split(".")[:-1]:
            partial_obj = getattr(partial_obj, part)
        if type(getattr(partial_obj, dotted_path.split(".")[-1])) is dict:
            return True
        else:
            return False

    def refresh_data_form_update(self, update_data, updates):
        # First, copy state to top level
        update_data["state"] = update_data["data"]["state"]
        del update_data["data"]["state"]
        
        # Remove keys we don't want to modify
        do_not_modify = ["_id", "_createdAt", "_updatedAt", "_createdBy", "_updatedBy"]
        for key in do_not_modify:
            if key in update_data:
                update_data.pop(key)
        
        def set_by_path(obj, path, value):
            """Set a value in nested object using a dotted path string"""
            fields = path.split(".")
            
            # Navigate to the parent object
            for i, field in enumerate(fields[:-1]):
                if hasattr(obj, field):
                    obj = getattr(obj, field)
                elif isinstance(obj, dict) and field in obj:
                    obj = obj[field]
                else:
                    # Path doesn't exist, create it
                    try:
                        # Try to set as attribute first
                        setattr(obj, field, {})
                        obj = getattr(obj, field)
                    except:
                        # Fall back to dictionary
                        if not isinstance(obj, dict):
                            obj = {}
                        obj[field] = {}
                        obj = obj[field]
            
            # Set the final field value
            last_field = fields[-1]
            try:
                # Try direct attribute setting first to avoid touching
                object.__setattr__(obj, last_field, value)
            except:
                # Fall back to dictionary assignment
                obj[last_field] = value
        
        # Process explicit updates first
        for field_path, new_value in updates.items():
            try:
                set_by_path(self, field_path, new_value)
            except Exception as e:
                print(f"Error updating {field_path}: {e}")

    def copy_touched(self):
        touched = self.touched
        fields = [("self", self)]
        while fields:
            field = fields.pop(0)
            for child in [
                (i, field[1].__dict__[i]) for i in field[1].__fields__.keys()
            ]:

                if isinstance(child[1], BaseModel) and child[0] != "_":
                    child[1].touched = touched
                    fields.append(child)

    def set_path(self):
        self.path = ""
        fields = [("self", self)]
        while fields:
            field = fields.pop(0)
            path = field[1].path
            for child in [
                (i, field[1].__dict__[i]) for i in field[1].__fields__.keys()
            ]:
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

        return wrapper

    def cleanup(self):
        pass


class Position(TrackedBaseModel):
    """
    The position of the app on the board
    """

    x: float = Field(description="The x position of the app")
    y: float = Field(description="The y position of the app")
    z: float = Field(description="The z position of the app")


class Size(TrackedBaseModel):
    """
    The dimensions of the app
    """

    width: float = Field(description="The width of the app", default=200)
    height: float = Field(description="The height of the app", default=200)
    depth: float = Field(description="The depth of the app", default=0)


class Rotation(TrackedBaseModel):
    """
    The rotation of the app on the board
    """

    x: float = Field(description="The x angle of the app", default=0)
    y: float = Field(description="The y angle of the app", default=0)
    z: float = Field(description="The z angle of the app", default=0)


class AppTypes(Enum):
    ai_pane = "AIPane"
    counter = "Counter"
    note = "Note"
    data_table = "DataTable"
    code_cell = "CodeCell"
    kernel_dashboard = "KernelDashboard"
    sage_cell = "SageCell"
    slider = "Slider"
    stickie = "Stickie"
    vegalite = "VegaLite"
    vegaliteviewer = "VegaLiteViewer"
    genericsmartbit = "GenericSmartBit"


class Data(TrackedBaseModel):
    position: Position = Field(description="The position of the app on the board")
    size: Size = Field(description="The dimensions of the app on the board")
    rotation: Rotation = Field(description="The rotation of the app on the board")
    raised: bool = Field(description="is the app raised")
    type: str = Field(
        description="The type of the app represented. For example, Stickie for stickie note, PDFViewer, etc."
    )


class SmartBit(TrackedBaseModel):
    app_id: UUID4 = Field(alias="_id", description="A valid UUID4 of this asset.")
    data: Data = Field(description="Generic app data like position, width and height")
    tags: List[str] = Field(description="List of tag assigned to this app", default=[])
    _createdAt: int
    _updatedAt: int

    _s3_comm: ClassVar = SageCommunication(conf, prod_type)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.copy_touched()
        self.set_path()

    def send_updates(self):
        new_data = self.get_all_touched_fields_dict()
        self.touched.clear()
        self._s3_comm.send_app_update(self.app_id, new_data)

    def get_updates_for_batch(self):
        new_data = self.get_all_touched_fields_dict()
        self.touched.clear()
        obj = {"id": self.app_id, "updates": new_data}
        return obj

    @abstractmethod
    def clean_up(self):
        """cleans up any threads that are unused"""
        pass
