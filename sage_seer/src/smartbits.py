from langchain.pydantic_v1 import BaseModel, Field, UUID4
from typing import Union, Literal, List


class Size(BaseModel):
    """
    The dimensions of the app
    """
    width: int = Field(description="The width of the app")
    height: int = Field(description="The height of the app")
    depth: int = Field(description="The depth of the app")


class Position(BaseModel):
    """
    The position of the app on the board
    """
    x: int = Field(description="The x position of the app")
    y: int = Field(description="The y position of the app")
    z: int = Field(description="The z position of the app")


class Data(BaseModel):
    position: Position = Field(description="The position of the stickie note on the board")
    size: Size = Field(description="The dimensions of the stickie note on the board")
    type: Literal['Stickie', 'PDFViewer', 'Counter', 'Slider', 'VegaViewer'] = Field(
        description="The type of the app represented. For example, Stickie for stickie note, PDFViewer, etc.")


class StickieState(BaseModel):
    text: str = Field(description="The text to display on the stickie note")
    color: str = Field(description="The background color of the stickie note, use yellow if a color is not provided")
    fontSize: int = Field(description="The font size to use for the text")


class CounterState(BaseModel):
    count: int = Field(description="The count to display on the counter")


class PDFViewerState(BaseModel):
    currentPage: int = Field(description="The page number currently showing")
    numPages: int = Field(description="The total number of pages in the pdf document")
    displayPages: int = Field(description="The number of pages to display at a time")
    analyzed: str = Field(description="Whether the pdf was converted to text")
    client: str = Field(description="The client used. This is currently set to empty")


class SmartBit(BaseModel):
    app_id: str = Field(description="The UUID4 of this asset")
    data: Data = Field(description="Generic app data like position, width and height")
    state: Union[StickieState, CounterState, PDFViewerState] = Field(
        description="Data specific to the app type like color of a stickie or page currently being viewed for a PDF viewer")
    tags: List[str] = Field(default_factory=list, description="List of tag assigned to this app")


# Update forward references to resolve ForwardRef issues
SmartBit.update_forward_refs()
