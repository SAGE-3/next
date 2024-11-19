# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from fastapi import FastAPI, HTTPException
from exportAgent import ExportAgent
from logging import Logger
from foresight.Sage3Sugar.pysage3 import PySage3

app = FastAPI()
export_agent = (Logger, PySage3)

@app.get("/export/room/{room_id}")
def export_room(room_id: str):
    try:
        data = export_agent.export_room_data(room_id)
        return data
    except Exception as e:
        Logger.error(Exception)

@app.get("/export/board/{board_id}")
def export_room(board_id: str):
    try:
        data = export_agent.export_room_data(board_id)
        return data
    except Exception as e:
        Logger.error(Exception)

