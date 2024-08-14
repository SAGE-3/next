from typing import List

from langchain.pydantic_v1 import BaseModel, Field, UUID4
from src.smartbits import SmartBit
from src.data_exmaples import smartbit_dict_example
from typing_extensions import Literal

class CreateAppToolInput(BaseModel):
    smartbit: SmartBit = Field(
        description="The smartbit data used to instantiate the app, and which include including the smartbit type"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "smartbit": smartbit_dict_example
            }
        }


class DeleteAppToolInput(BaseModel):
    app_id: UUID4 = Field(description="The app_id of the app that needs to be deleted")
    class Config:
        json_schema_extra = {
            "example": {
                "app_id": '9e9c5a5f-bb75-4edf-88b3-7110da5ed964'
            }
        }

class RearrangeAppToolInput(BaseModel):
    apps_ids: List[UUID4] = Field(description="The list of Widget UUIDs to rearrange on the wall")
    align: Literal["left", "right", "top", "bottom", "column", "row", "stack"] = Field(description="How to align the widgets by")
    by_dim: int = Field(description="The dimension to align the widgets by. Only relevant when align is \"row\" or \"column\" ", default=1)

    class Config:
        json_schema_extra = {
            "example_1": {
                "prompt": "Align the PDF and sticky showing its name to the left",
                "apps_ids": ['9e9c5a5f-bb75-4edf-88b3-7110da5ed964', '8fde9693-a2cd-4707-ac77-beee28165c26'],
                "align": "left",
            },
            "example_2": {
                "prompt": "Align the stickies using 2 rows",
                "apps_ids": ['9e9c5a5f-bb75-4edf-88b3-7110da5ed964', '9348d348-4908-4139-97d4-0d9da58b1b4d'],
                "align": "row",
                "by_dim": 2
            },
        }


class SummarizeAppsToolInput(BaseModel):
    app_id: List[UUID4] = Field(description="The app_id list representing the apps whose text will be summarized")
    class Config:
        json_schema_extra = {
            "example": {
                "app_id": ['9e9c5a5f-bb75-4edf-88b3-7110da5ed964']
            }
        }


class SummarizeAppsToolInput(BaseModel):
    asset_id: UUID4 = Field(description="The asset_id of the asset that will be opened as an app on the wall")
    class Config:
        json_schema_extra = {
            "example": {
                "asset_id": '206fca41-a109-4d94-8d17-7e4c621826f2'
            }
        }
