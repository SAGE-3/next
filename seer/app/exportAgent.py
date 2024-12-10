# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

import json, time
from logging import Logger

# SAGE3 API
from foresight.Sage3Sugar.pysage3 import PySage3

# AI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_nvidia_ai_endpoints import ChatNVIDIA

# Typing for RPC
from libs.localtypes import Question, Answer, ExportQueryType, ExportReturnType
from libs.utils import getRoomInfo, getAssets, getBoardInfo, getBoards,getImageFile, getModelsInfo, getUsers, getPDFFile, getRooms

import pandas as pd

# Templates
sys_template_str = "Today is {date}. You are a helpful and succinct assistant, providing informative answers to {username} (whose location is {location})."
human_template_str = "Answer: {question}"


# For OpenAI / Message API compatible models
prompt = ChatPromptTemplate.from_messages(
    [
        ("system", sys_template_str),
        ("user", human_template_str),
    ]
)

# OutputParser that parses LLMResult into the top likely string.
# Create a new model by parsing and validating input data from keyword arguments.
# Raises ValidationError if the input data cannot be parsed to form a valid model.
output_parser = StrOutputParser()

class ExportAgent:
    def __init__(self, logger: Logger, ps3: PySage3):
        """
        Initialize the ExportAgent with a logger and PySage3 instance.

        Args:
            logger (Logger): Logger instance for logging information.
            ps3 (PySage3): SAGE3 API wrapper instance.
        """
        logger.info("ExportAgent initialized")
        self.logger = logger
        self.ps3 = ps3

        self.llm_llama = ChatNVIDIA(
                base_url= "https://arcade.evl.uic.edu/llama32-11B-vision" + "/v1",
                model="meta/llama-3.2-11b-vision-instruct",
                stream=False,
                max_tokens=1000,
        )

        self.session = prompt | self.llm_llama | output_parser

        #ADD CONTEXT MODEL HERE

    def export_room_data(self, export_query: ExportQueryType) -> ExportReturnType:
        """
        Export all data related to a room, including boards, assets, and metadata.

        Args:
            room_id (str): The unique ID of the room to export.

        Returns:
            dict: Exported room data containing metadata, boards, assets, and user details.
        """
        room_id = export_query.room_id
        self.logger.info(f"Exporting data for room: {room_id}")

        # Get room information
        room_info = getRoomInfo(self.ps3, room_id)
        if not room_info:
            self.logger.error(f"Room {room_id} not found.")
            return {}

        # Get all boards in the room
        boards = getBoards(self.ps3, room_id)

        # Get all assets in the room
        assets = getAssets(self.ps3, room_id)

        # Get all users
        users = getUsers(self.ps3)

        # Assemble export data
        export_data = {
            "room": room_info,
            "boards": boards,
            "assets": assets,
            "users": users,
        }
        data = json.dumps(export_data)
        export_return = ExportReturnType(
            data=str(data),  # Convert the data to string
            success=True,
            actions=[],
        )

        self.logger.info(f"Data export for room {room_id} completed")

        return export_return

    async def export_board_data(self, qq: ExportQueryType) -> ExportReturnType:
        """
        Export all data related to a specific board, including metadata and associated assets.

        Args:
            board_id (str): The unique ID of the board to export.

        Returns:
            dict: Exported board data containing metadata and assets.
        """

        # get the board id from the query
        board_id = qq.board_id
        room_id = qq.room_id

        self.logger.info(f"Exporting data for board: {board_id}")
        report = "# Board Info: "

        # get the list of apps running 
        app_list = self.ps3.get_apps(room_id, board_id)
        print("Return value from list of apps: \n", app_list)

        board_layout = {}

        # look through each application
        for app_id, app in app_list.items():
            app_type = app.get("data", {}).get("type", None)
            
            # check for each respective application
            if app_type == "Stickie":
                text = app.get("data", {}).get("state", {}).get("text")
                
                # init the dictionary for this app type if it doesnt exist
                if app_type not in board_layout:
                    board_layout[app_type] = {}

                # store text into dictionary
                board_layout[app_type][app_id] = text
                self.logger.info("Stickie text: " + text)

            if app_type == "Notepad":
                content = app.get("data", {}).get("state", {}).get("content", [])

                if(isinstance(content.get("ops", []), list) and len(content["ops"]) > 0):
                    text = content["ops"][0].get("insert", "")
                else:
                    text = ""
                
                 # init the dictionary for this app type if it doesnt exist
                if app_type not in board_layout:
                    board_layout[app_type] = {}

                # store text into dictionary
                board_layout[app_type][app_id] = text
                self.logger.info("Notepad text:" + text)

            if app_type == "CSVViewer":
                # get the asset id
                asset_id = app.get("data", {}).get("state", {}).get("assetid")

                # if the assset exists
                if asset_id:
                    #build url
                    url = self.ps3.get_public_url(asset_id)
                    self.logger.info("CSV URL" + url)
                    #turn into data frame
                    df = pd.read_csv(url)

                    # store dataframe in dictionary
                    if app_type not in board_layout:
                        board_layout[app_type] = {}
                    board_layout[app_type][app_id] = df.to_string()
                    self.logger.info("CSV Dataframe: " + df.to_string())

            # add more in the future

        ai_query = ""

        for app_type, apps in board_layout.items():
            for app_id, app in apps.items():
                curr_text = f"{app_type}, {app_id}:\n {app}\n"
                ai_query += curr_text

        today = time.asctime()

        new_question = {
            "Okay, first go through each application, which is distinct by the name and its asset id, and provide a detailed summary on its contents. Moreover, return ur summary grouped by application type in markdown format please. Here are the apps and their states:\n" 
            + ai_query
        }

        response = await self.session.ainvoke(
            {
                "question": new_question,
                "date": today,
            }
        )

        report = response

        # self.logger.info(f"Data export for board {board_id} completed")
        # data = f"board: {board_info}\n assets{board_assets}"
        export_return = ExportReturnType(
            data=report,  # Convert the data to string
            success=True,
            actions=[],
        )
        return export_return
    


    # Get board information
        # board_info = getBoardInfo(self.ps3, board_id)
        # print(board_info)
        # if not board_info:
        #     self.logger.error(f"Board {board_id} not found.")
        #     return {}
        # users = getUsers(self.ps3)
        # print(users)
        # report += board_info + "\n"

        # Get associated assets
        # assets = getAssets(self.ps3)
        # board_assets = [asset for asset in assets if asset.data.room == board_info.roomId]
        # self.logger.info(f"Found {len(board_assets)} assets for board {board_id}")

        # # Assemble export data
        # export_data = {
        #     "board": board_info,
        #     "assets": board_assets,
        # }
