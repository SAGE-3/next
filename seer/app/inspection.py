# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from __future__ import annotations

from collections import Counter
from typing import Any

from pydantic import BaseModel

from app.seer.app_support import preview_state_for_app
from app.seer.helpers import matches_app_type
from pysage3.client import PySage3


class PositionSummary(BaseModel):
    x: float
    y: float
    z: float


class SizeSummary(BaseModel):
    width: float
    height: float
    depth: float


class RoomSummary(BaseModel):
    id: str
    name: str
    description: str = ""
    color: str | None = None
    owner_id: str | None = None
    is_private: bool = False
    is_listed: bool = True
    board_count: int = 0


class BoardSummary(BaseModel):
    id: str
    room_id: str
    room_name: str | None = None
    name: str
    description: str = ""
    color: str | None = None
    owner_id: str | None = None
    app_count: int = 0


class AppSummary(BaseModel):
    id: str
    room_id: str
    board_id: str
    title: str = ""
    type: str
    created_by: str | None = None
    position: PositionSummary
    size: SizeSummary
    state_preview: dict[str, Any] | None = None


def _summarize_room(doc: dict[str, Any], board_count: int) -> RoomSummary:
    data = doc.get("data", {})
    return RoomSummary(
        id=doc["_id"],
        name=data.get("name", ""),
        description=data.get("description", ""),
        color=data.get("color"),
        owner_id=data.get("ownerId"),
        is_private=data.get("isPrivate", False),
        is_listed=data.get("isListed", True),
        board_count=board_count,
    )


def _summarize_board(doc: dict[str, Any], room_name: str | None, app_count: int) -> BoardSummary:
    data = doc.get("data", {})
    return BoardSummary(
        id=doc["_id"],
        room_id=data.get("roomId", ""),
        room_name=room_name,
        name=data.get("name", ""),
        description=data.get("description", ""),
        color=data.get("color"),
        owner_id=data.get("ownerId"),
        app_count=app_count,
    )


def _summarize_app(doc: dict[str, Any], include_state: bool) -> AppSummary:
    data = doc.get("data", {})
    state = data.get("state", {})
    app_type = data.get("type", "")
    position = data.get("position", {})
    size = data.get("size", {})

    return AppSummary(
        id=doc["_id"],
        room_id=data.get("roomId", ""),
        board_id=data.get("boardId", ""),
        title=data.get("title", ""),
        type=app_type,
        created_by=doc.get("_createdBy"),
        position=PositionSummary(x=position.get("x", 0), y=position.get("y", 0), z=position.get("z", 0)),
        size=SizeSummary(width=size.get("width", 0), height=size.get("height", 0), depth=size.get("depth", 0)),
        state_preview=preview_state_for_app(app_type, state, include_state),
    )


def list_room_summaries(ps3: PySage3, room_id: str | None = None) -> list[dict[str, Any]]:
    """Return compact room summaries for SEER tool calls."""

    rooms = ps3.s3_comm.get_rooms()
    boards = ps3.s3_comm.get_boards()
    board_counts = Counter(board.get("data", {}).get("roomId") for board in boards)

    if room_id:
        rooms = [room for room in rooms if room.get("_id") == room_id]

    return [_summarize_room(room, board_counts.get(room.get("_id"), 0)).model_dump() for room in rooms]


def list_board_summaries(ps3: PySage3, room_id: str | None = None, board_id: str | None = None) -> list[dict[str, Any]]:
    """Return compact board summaries with room names and app counts included."""

    rooms = ps3.s3_comm.get_rooms()
    boards = ps3.s3_comm.get_boards(room_id=room_id)
    apps = ps3.s3_comm.get_apps(room_id=room_id)
    room_names = {room["_id"]: room.get("data", {}).get("name") for room in rooms}
    app_counts = Counter(app.get("data", {}).get("boardId") for app in apps)

    if board_id:
        boards = [board for board in boards if board.get("_id") == board_id]

    return [
        _summarize_board(board, room_names.get(board.get("data", {}).get("roomId")), app_counts.get(board.get("_id"), 0)).model_dump()
        for board in boards
    ]


def list_app_summaries(
    ps3: PySage3,
    room_id: str | None = None,
    board_id: str | None = None,
    app_id: str | None = None,
    app_type: str | None = None,
    title_contains: str | None = None,
    include_state: bool = False,
) -> list[dict[str, Any]]:
    """Return compact app summaries, optionally with richer state previews for SEER reasoning."""

    apps = ps3.s3_comm.get_apps(room_id=room_id, board_id=board_id, app_id=app_id)

    if app_type:
        apps = [app for app in apps if matches_app_type(str(app.get("data", {}).get("type", "")), app_type)]

    if title_contains:
        title_filter = title_contains.lower()
        apps = [app for app in apps if title_filter in app.get("data", {}).get("title", "").lower()]

    return [_summarize_app(app, include_state=include_state).model_dump() for app in apps]
