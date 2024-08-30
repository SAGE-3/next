# TODO: REMOVE IN NEXT ITERATION


from langchain.output_parsers import PydanticOutputParser
from typing import List
from pydantic import BaseModel
from pydantic.fields import Field
from uuid import UUID


class TestOutputParser(BaseModel):
    name: str = Field(description="The output of an an LLM")

