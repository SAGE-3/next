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
from libs.localtypes import Question, Answer
from libs.utils import getRoomInfo, getAssets, getBoardInfo, getBoards,getImageFile, getModelsInfo, getUsers, getPDFFile, getRooms

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

        #ADD CONTEXT MODEL HERE

    def export_room_data(self, room_id: str) -> dict:
        """
        Export all data related to a room, including boards, assets, and metadata.

        Args:
            room_id (str): The unique ID of the room to export.

        Returns:
            dict: Exported room data containing metadata, boards, assets, and user details.
        """
        self.logger.info(f"Exporting data for room: {room_id}")

        # Get room information
        room_info = getRoomInfo(self.ps3, room_id)
        if not room_info:
            self.logger.error(f"Room {room_id} not found.")
            return {}

        # Get all boards in the room
        boards = getBoards(self.ps3, room_id)
        self.logger.info(f"Found {len(boards)} boards in room {room_id}")

        # Get all assets in the room
        assets = getAssets(self.ps3, room_id)
        self.logger.info(f"Found {len(assets)} assets in room {room_id}")

        # Get all users
        users = getUsers(self.ps3)
        self.logger.info(f"Retrieved {len(users)} users")

        # Assemble export data
        export_data = {
            "room": room_info,
            "boards": boards,
            "assets": assets,
            "users": users,
        }

        self.logger.info(f"Data export for room {room_id} completed")
        return export_data

    def export_board_data(self, board_id: str) -> dict:
        """
        Export all data related to a specific board, including metadata and associated assets.

        Args:
            board_id (str): The unique ID of the board to export.

        Returns:
            dict: Exported board data containing metadata and assets.
        """
        self.logger.info(f"Exporting data for board: {board_id}")

        # Get board information
        board_info = getBoardInfo(self.ps3, board_id)
        if not board_info:
            self.logger.error(f"Board {board_id} not found.")
            return {}

        # Get associated assets
        assets = getAssets(self.ps3)
        board_assets = [asset for asset in assets if asset.data.room == board_info.roomId]
        self.logger.info(f"Found {len(board_assets)} assets for board {board_id}")

        # Assemble export data
        export_data = {
            "board": board_info,
            "assets": board_assets,
        }

        self.logger.info(f"Data export for board {board_id} completed")
        return export_data
