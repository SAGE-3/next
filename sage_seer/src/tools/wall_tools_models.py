from typing import List

from langchain.pydantic_v1 import BaseModel, Field, UUID4
from src.smartbits import SmartBit
from src.data_exmaples import smartbit_dict_example


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
