# TODO: REMOVE IN NEXT ITERATION


from langchain.output_parsers import PydanticOutputParser
from typing import List
from pydantic import BaseModel
from pydantic.fields import Field
from uuid import UUID


class SelectAppsOutputParser(BaseModel):
    uuids: List[UUID] = Field(description="A valid Python list of UUIDs selected")
