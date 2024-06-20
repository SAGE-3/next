from langchain_core.tools import BaseTool
from langchain.callbacks.manager import CallbackManagerForToolRun
from langchain.pydantic_v1 import BaseModel, PrivateAttr, UUID4
from typing import Optional, Type, Any
from src.tools.wall_tools_models import CreateAppToolInput, DeleteAppToolInput, SummarizeAppsToolInput
from src.smartbits import SmartBit
from src.config.temp_room_board_info import config as room_board_info


class CreateAppTool(BaseTool):
    args_schema: Type[BaseModel] = CreateAppToolInput

    name: str = "CreateAppTool"
    description: str = "Create an app on the wall given an app type and the data that defines the app"

    _ps3: Any = PrivateAttr()

    def __init__(self, ps3_instance=None):
        super().__init__()
        if ps3_instance is not None:
            self._ps3 = ps3_instance  # Initialize the private attribute

    def _run(self, smartbit: SmartBit, run_manager: Optional[CallbackManagerForToolRun] = None) -> str:
        if smartbit.tags:
            # TODO: don't forget to add the tags using the wall.
            pass
        room_id = room_board_info.room_id
        board_id = room_board_info.board_id

        self._ps3.create_app(room_id, board_id, smartbit.data.type, smartbit.state.dict(), smartbit.data.dict())
        print("Running Create app")
        return "Done with CreateAppTool"


class DeleteAppTool(BaseTool):
    args_schema: Type[BaseModel] = DeleteAppToolInput

    name: str = "DeleteAppTool"
    description: str = "Remove the app with the provided app_id from the wall"

    _ps3: Any = PrivateAttr()

    def __init__(self, ps3_instance=None):
        super().__init__()
        if ps3_instance is not None:
            self._ps3 = ps3_instance  # Initialize the private attribute

    def _run(self, app_id: UUID4, run_manager: Optional[CallbackManagerForToolRun] = None) -> str:
        self._ps3.delete_app(app_id)
        print("Running delete app")
        return "Done with DeleteAppTool"





class SummarizeAppsTool(BaseTool):
    args_schema: Type[BaseModel] = SummarizeAppsToolInput

    name: str = "SummarizeAppsTool"
    description: str = "Summarize the apps with the provided app_id from the wall"

    _ps3: Any = PrivateAttr()

    def __init__(self, ps3_instance=None):
        super().__init__()
        if ps3_instance is not None:
            self._ps3 = ps3_instance  # Initialize the private attribute

    def _run(self, app_id: UUID4, run_manager: Optional[CallbackManagerForToolRun] = None) -> str:
        print("Running summarize apps")
        return "Done with SummarizeAppsTool"


class OpenAssetTool(BaseTool):
    args_schema: Type[BaseModel] = CreateAppToolInput

    name: str = "OpenAssetTool"
    description: str = "Opens an asset file (e.g., pdf, csv or image) with the provided app_id as an app (widget) on the wall"

    _ps3: Any = PrivateAttr()

    def __init__(self, ps3_instance=None):
        super().__init__()
        if ps3_instance is not None:
            self._ps3 = ps3_instance  # Initialize the private attribute
    def _run(self, smartbit: SmartBit, run_manager: Optional[CallbackManagerForToolRun] = None) -> str:
        room_id = room_board_info.room_id
        board_id = room_board_info.board_id
        smartbit.state.assetid = str(smartbit.state.assetid)

        self._ps3.create_app(room_id, board_id, smartbit.data.type, smartbit.state.dict(), smartbit.data.dict())
        print("Opening asset {app_id}")
        return "Done with with Open Asset"


class Complete(BaseModel):
    """A tool to mark the current task as completed"""

    cancel: bool = True
    reason: str

    class Config:
        schema_extra = {
            "example": {
                "cancel": False,
                "reason": "The task from the sub agent was completed",
            },
            "example 2": {
                "cancel": True,
                "reason": "The user changed their mind about the current task.",
            },
        }

class Escalate(BaseModel):
    """
    A tool to mark the current task as needing to be escalated to the parent higher level agent
    that can re-route the dialog to another agent for further processing.
    """

    cancel: bool = True
    reason: str

    class Config:
        schema_extra = {
            "example": {
                "cancel": True,
                "reason": "User changed their mind about the current task.",
            },
            "example 2": {
                "cancel": False,
                "reason": "I have fully completed the task.",
            },
            "example 3": {
                "cancel": True,
                "reason": "The user is asking about something that I can complete using existing tools.",
            },
        }