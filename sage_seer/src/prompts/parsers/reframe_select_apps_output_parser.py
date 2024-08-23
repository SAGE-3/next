# TODO: REMOVE IN NEXT ITERATION

from langchain.output_parsers import PydanticOutputParser
from typing import List
from pydantic import BaseModel
from pydantic.fields import Field
from uuid import UUID


class ReframeSelectAppsOutputParser(BaseModel):
    updated_query: str = Field(description="The new reframed query str describing the items referenced in this query")
