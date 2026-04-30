# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from langchain_core.tools import tool
from pydantic import BaseModel, ConfigDict, Field

from app.seer.helpers import (
    asset_id_from_app,
    board_bounds,
    filter_app_summaries,
    normalize_fallback_app,
    stickie_position,
    summarize_asset_doc,
)
from app.inspection import list_app_summaries, list_board_summaries, list_room_summaries
from libs.localtypes import ImageQuery, PDFQuery, Question

if TYPE_CHECKING:
    from app.seer.agent import SeerAgent


class PlannedPositionUpdate(BaseModel):
    x: float = Field(description="Board x position in pixels.")
    y: float = Field(description="Board y position in pixels.")
    z: float | None = Field(default=None, description="Optional z position. Leave unset to preserve the current z value.")


class PlannedSizeUpdate(BaseModel):
    width: float = Field(description="App width in pixels.")
    height: float = Field(description="App height in pixels.")
    depth: float | None = Field(default=None, description="Optional depth. Leave unset to preserve the current depth.")


class PlannedStatePatch(BaseModel):
    model_config = ConfigDict(extra="allow")

    location: list[float] | None = Field(
        default=None,
        description="Optional location patch. Use the app's native ordering. For Map use [longitude, latitude]. For LeafLet use [latitude, longitude].",
    )
    zoom: float | None = Field(default=None, description="Optional zoom value for map-like apps.")
    bearing: float | None = Field(default=None, description="Optional bearing value for map-like apps.")
    pitch: float | None = Field(default=None, description="Optional pitch value for map-like apps.")
    baseLayer: str | None = Field(default=None, description="Optional base layer name for map-like apps.")
    layers: list[dict[str, Any]] | None = Field(default=None, description="Optional layer list for map-like apps.")
    text: str | None = Field(default=None, description="Optional text content for note-like apps.")
    color: str | None = Field(default=None, description="Optional color for note-like apps.")
    url: str | None = Field(default=None, description="Optional URL for web-like apps.")


class PlannedAppUpdate(BaseModel):
    id: str = Field(description="App id to update on the current board.")
    position: PlannedPositionUpdate | None = Field(default=None, description="Optional top-level position update.")
    size: PlannedSizeUpdate | None = Field(default=None, description="Optional top-level size update.")
    title: str | None = Field(default=None, description="Optional new app title.")
    state: PlannedStatePatch | None = Field(
        default=None,
        description="Optional partial state patch. Use this for map location, zoom, bearing, pitch, baseLayer, note text/color, and similar state updates.",
    )


def _build_update_action(existing: dict[str, Any], update: PlannedAppUpdate) -> dict[str, Any]:
    action: dict[str, Any] = {
        "type": "update_app",
        "id": update.id,
        "updates": {},
    }

    if update.position is not None:
        action["updates"]["position"] = {
            "x": float(update.position.x),
            "y": float(update.position.y),
            "z": float(update.position.z if update.position.z is not None else existing["position"]["z"]),
        }

    if update.size is not None:
        action["updates"]["size"] = {
            "width": float(update.size.width),
            "height": float(update.size.height),
            "depth": float(update.size.depth if update.size.depth is not None else existing["size"]["depth"]),
        }

    if update.title is not None:
        action["updates"]["title"] = str(update.title)

    if update.state is not None:
        state_patch = update.state.model_dump(exclude_none=True)
        if not state_patch:
            raise ValueError(f"State patch for app {update.id} did not include any values.")
        action["updates"]["state"] = state_patch

    if not action["updates"]:
        raise ValueError(f"Update for app {update.id} did not include any supported changes.")

    return action


def build_seer_tools(agent: "SeerAgent", qq: Question) -> list[Any]:
    """Build request-scoped SEER tools around the current board, selection, and cursor."""

    current_room_id = qq.ctx.roomId
    current_board_id = qq.ctx.boardId
    cursor_x = qq.ctx.pos[0]
    cursor_y = qq.ctx.pos[1]
    selected_app_id = qq.ctx.selectedAppId or None
    focused_app_id = qq.ctx.focusedAppId or selected_app_id
    selected_app_ids = [app_id for app_id in (qq.ctx.selectedAppIds or []) if app_id]
    fallback_board_apps = [
        normalize_fallback_app(app, current_room_id, current_board_id) for app in (qq.ctx.currentBoardApps or [])
    ]

    def current_scope_ids() -> list[str] | None:
        if selected_app_ids:
            return selected_app_ids
        if focused_app_id:
            return [focused_app_id]
        return None

    def current_board_apps(
        app_ids: list[str] | None = None,
        title_contains: str | None = None,
        app_type: str | None = None,
        text_contains: str | None = None,
        color: str | None = None,
        include_state: bool = False,
    ) -> list[dict[str, Any]]:
        apps = list_app_summaries(
            agent.ps3,
            board_id=current_board_id,
            app_type=app_type,
            title_contains=title_contains,
            include_state=include_state,
        )
        if apps:
            return filter_app_summaries(
                apps,
                app_ids=app_ids,
                app_type=app_type,
                title_contains=title_contains,
                text_contains=text_contains,
                color=color,
            )

        if fallback_board_apps:
            agent.logger.warning(
                "SeerAgent> current board lookup returned 0 apps for board %s, using SEER fallback snapshot with %s app(s)",
                current_board_id,
                len(fallback_board_apps),
            )
            return filter_app_summaries(
                fallback_board_apps,
                app_ids=app_ids,
                app_type=app_type,
                title_contains=title_contains,
                text_contains=text_contains,
                color=color,
            )

        return []

    def current_scope_apps(
        title_contains: str | None = None,
        app_type: str | None = None,
        text_contains: str | None = None,
        color: str | None = None,
        include_state: bool = False,
    ) -> list[dict[str, Any]]:
        return current_board_apps(
            app_ids=current_scope_ids(),
            title_contains=title_contains,
            app_type=app_type,
            text_contains=text_contains,
            color=color,
            include_state=include_state,
        )

    @tool
    def get_rooms(room_id: str | None = None) -> list[dict[str, Any]]:
        """List rooms visible to Seer. Use this when the user explicitly asks about rooms."""
        agent.logger.info("SeerAgent> get_rooms room_id=%s", room_id)
        return list_room_summaries(agent.ps3, room_id=room_id)

    @tool
    def get_boards(room_id: str | None = None, board_id: str | None = None) -> list[dict[str, Any]]:
        """List boards. Defaults to boards in the current room when no filter is given."""
        effective_room_id = room_id if room_id is not None else (None if board_id else current_room_id)
        agent.logger.info("SeerAgent> get_boards room_id=%s board_id=%s", effective_room_id, board_id)
        return list_board_summaries(agent.ps3, room_id=effective_room_id, board_id=board_id)

    @tool
    def get_apps(
        room_id: str | None = None,
        board_id: str | None = None,
        app_id: str | None = None,
        app_type: str | None = None,
        title_contains: str | None = None,
        include_state: bool = False,
    ) -> list[dict[str, Any]]:
        """List apps. Defaults to the current board when no room or board filter is given."""
        effective_room_id = room_id
        effective_board_id = board_id
        if effective_room_id is None and effective_board_id is None and app_id is None:
            effective_board_id = current_board_id

        agent.logger.info(
            "SeerAgent> get_apps room_id=%s board_id=%s app_id=%s app_type=%s title_contains=%s include_state=%s",
            effective_room_id,
            effective_board_id,
            app_id,
            app_type,
            title_contains,
            include_state,
        )
        return list_app_summaries(
            agent.ps3,
            room_id=effective_room_id,
            board_id=effective_board_id,
            app_id=app_id,
            app_type=app_type,
            title_contains=title_contains,
            include_state=include_state,
        )

    @tool
    def get_current_board() -> dict[str, Any]:
        """Return the current room and board summaries for the board the user is on."""
        agent.logger.info("SeerAgent> get_current_board board_id=%s room_id=%s", current_board_id, current_room_id)
        boards = list_board_summaries(agent.ps3, board_id=current_board_id)
        rooms = list_room_summaries(agent.ps3, room_id=current_room_id)
        apps = current_board_apps()
        return {
            "room": rooms[0] if rooms else None,
            "board": boards[0] if boards else None,
            "appCount": len(apps),
        }

    @tool
    def get_current_board_apps(
        title_contains: str | None = None,
        app_type: str | None = None,
        text_contains: str | None = None,
        color: str | None = None,
        include_state: bool = False,
    ) -> list[dict[str, Any]]:
        """List apps on the current board. Use this first for most SEER board actions."""
        agent.logger.info(
            "SeerAgent> get_current_board_apps board_id=%s app_type=%s title_contains=%s text_contains=%s color=%s include_state=%s",
            current_board_id,
            app_type,
            title_contains,
            text_contains,
            color,
            include_state,
        )
        return current_board_apps(
            title_contains=title_contains,
            app_type=app_type,
            text_contains=text_contains,
            color=color,
            include_state=include_state,
        )

    @tool
    def get_current_scope() -> dict[str, Any]:
        """Return SEER's current scope. Selection wins over focused app, otherwise the whole board is the scope."""
        if selected_app_ids:
            scope = "selection"
        elif focused_app_id:
            scope = "focused_app"
        else:
            scope = "board"

        scope_apps = current_scope_apps()
        return {
            "scope": scope,
            "boardId": current_board_id,
            "roomId": current_room_id,
            "selectedAppIds": selected_app_ids,
            "focusedAppId": focused_app_id,
            "appCount": len(scope_apps),
        }

    @tool
    def get_current_scope_apps(
        title_contains: str | None = None,
        app_type: str | None = None,
        text_contains: str | None = None,
        color: str | None = None,
        include_state: bool = False,
    ) -> list[dict[str, Any]]:
        """List apps in SEER's current scope: selection first, then focused app, then the whole board."""
        agent.logger.info(
            "SeerAgent> get_current_scope_apps scope_ids=%s focused_app_id=%s app_type=%s title_contains=%s text_contains=%s color=%s include_state=%s",
            selected_app_ids,
            focused_app_id,
            app_type,
            title_contains,
            text_contains,
            color,
            include_state,
        )
        return current_scope_apps(
            title_contains=title_contains,
            app_type=app_type,
            text_contains=text_contains,
            color=color,
            include_state=include_state,
        )

    @tool
    def get_current_board_layout_bounds(
        title_contains: str | None = None,
        app_type: str | None = None,
        text_contains: str | None = None,
        color: str | None = None,
    ) -> dict[str, Any]:
        """Return the occupied bounds of apps on the current board, optionally filtered by title, type, text, or color."""
        agent.logger.info(
            "SeerAgent> get_current_board_layout_bounds board_id=%s app_type=%s title_contains=%s text_contains=%s color=%s",
            current_board_id,
            app_type,
            title_contains,
            text_contains,
            color,
        )
        apps = current_board_apps(
            title_contains=title_contains,
            app_type=app_type,
            text_contains=text_contains,
            color=color,
            include_state=False,
        )
        return board_bounds(apps)

    @tool
    def get_scope_assets(app_type: str | None = None) -> list[dict[str, Any]]:
        """List assets referenced by apps in SEER's current scope."""
        apps = current_scope_apps(app_type=app_type, include_state=True)
        asset_ids = []
        for app in apps:
            asset_id = asset_id_from_app(app)
            if asset_id and asset_id not in asset_ids:
                asset_ids.append(asset_id)

        assets = []
        for asset_id in asset_ids:
            asset_doc = agent.ps3.s3_comm.get_asset(asset_id)
            if asset_doc:
                asset_summary = summarize_asset_doc(asset_doc)
                asset_summary["appIds"] = [app["id"] for app in apps if asset_id_from_app(app) == asset_id]
                assets.append(asset_summary)

        return assets

    @tool
    async def analyze_scope_asset(question: str, app_id: str | None = None) -> dict[str, Any]:
        """
        Analyze the image or PDF in SEER's current scope.
        Use this when the user asks about "this image", "this PDF", or another selected asset-backed app.
        """

        if app_id:
            apps = current_board_apps(app_ids=[app_id], include_state=True)
        else:
            apps = current_scope_apps(include_state=True)

        asset_apps = [app for app in apps if asset_id_from_app(app)]
        if not asset_apps:
            raise ValueError("I could not find an asset-backed app in the current SEER scope.")

        if len(asset_apps) > 1:
            raise ValueError("There are multiple asset-backed apps in scope. Narrow the selection or pass a specific app id.")

        target_app = asset_apps[0]
        asset_id = asset_id_from_app(target_app)
        if asset_id is None:
            raise ValueError("The selected app does not reference an asset.")

        asset_doc = agent.ps3.s3_comm.get_asset(asset_id)
        if not asset_doc:
            raise ValueError(f"Could not find asset {asset_id}.")

        asset_summary = summarize_asset_doc(asset_doc)
        mimetype = str(asset_summary.get("mimetype", ""))

        if mimetype.startswith("image/"):
            if agent.image_agent is None:
                raise ValueError("Image analysis is not configured.")
            result = await agent.image_agent.process(
                ImageQuery(ctx=qq.ctx, asset=asset_id, user=qq.user, model=qq.model, q=question)
            )
            return {"app": target_app, "asset": asset_summary, "answer": result.r}

        if "pdf" in mimetype:
            if agent.pdf_agent is None:
                raise ValueError("PDF analysis is not configured.")
            result = await agent.pdf_agent.process(
                PDFQuery(ctx=qq.ctx, assetids=[asset_id], user=qq.user, model=qq.model, q=question)
            )
            return {"app": target_app, "asset": asset_summary, "answer": result.r}

        return {
            "app": target_app,
            "asset": asset_summary,
            "answer": f"{asset_summary.get('filename', 'This asset')} is a {mimetype or 'file'} asset. Detailed SEER analysis is currently available for images and PDFs.",
        }

    @tool
    def plan_create_stickies(
        texts: list[str],
        anchor_app_id: str | None = None,
        side: str = "right",
        gap: int = 32,
        color: str = "yellow",
    ) -> dict[str, Any]:
        """
        Plan Stickie creation actions on the current board without executing them.
        Use anchor_app_id plus side when the user wants notes placed relative to an existing app.
        """

        if not texts:
            raise ValueError("At least one stickie text is required.")

        if len(texts) > 12:
            raise ValueError("Please keep stickie batches to 12 or fewer actions.")

        normalized_side = side.lower()
        if normalized_side not in {"right", "left", "above", "below"}:
            raise ValueError("side must be one of: right, left, above, below")

        stickie_width = 360
        stickie_height = 360
        planned_actions: list[dict[str, Any]] = []

        anchor = None
        if anchor_app_id:
            apps = current_board_apps()
            apps = [app for app in apps if app["id"] == anchor_app_id]
            if not apps:
                raise ValueError(f"Could not find app {anchor_app_id} on the current board.")
            anchor = apps[0]

        if anchor:
            anchor_x = anchor["position"]["x"]
            anchor_y = anchor["position"]["y"]
            anchor_width = anchor["size"]["width"]
            anchor_height = anchor["size"]["height"]

            if normalized_side == "right":
                base_x = anchor_x + anchor_width + gap
                base_y = anchor_y
            elif normalized_side == "left":
                base_x = anchor_x - stickie_width - gap
                base_y = anchor_y
            elif normalized_side == "above":
                base_x = anchor_x
                base_y = anchor_y - stickie_height - gap
            else:
                base_x = anchor_x
                base_y = anchor_y + anchor_height + gap
        else:
            base_x = cursor_x
            base_y = cursor_y

        for index, text in enumerate(texts):
            pos_x, pos_y = stickie_position(base_x, base_y, stickie_width, stickie_height, index, normalized_side, gap)
            planned_actions.append(
                {
                    "type": "create_app",
                    "app": "Stickie",
                    "state": {
                        "text": text,
                        "fontSize": 24,
                        "color": color,
                    },
                    "data": {
                        "title": "Stickie",
                        "position": {"x": pos_x, "y": pos_y, "z": 0},
                        "size": {"width": stickie_width, "height": stickie_height, "depth": 0},
                    },
                }
            )

        return {
            "summary": f"Planned {len(planned_actions)} Stickie action(s) on the current board.",
            "anchorAppId": anchor_app_id,
            "boardId": current_board_id,
            "actions": planned_actions,
        }

    @tool
    def plan_update_app(
        id: str,
        position: PlannedPositionUpdate | None = None,
        size: PlannedSizeUpdate | None = None,
        title: str | None = None,
        state: PlannedStatePatch | None = None,
    ) -> dict[str, Any]:
        """
        Plan a single app update on the current board without executing it.
        Use this for focused changes like moving one app, retitling it, or updating map location/zoom state.
        """

        board_apps = current_board_apps()
        app_lookup = {app["id"]: app for app in board_apps}
        existing = app_lookup.get(id)
        if existing is None:
            raise ValueError(f"Could not find app {id} on the current board.")

        update = PlannedAppUpdate(id=id, position=position, size=size, title=title, state=state)
        action = _build_update_action(existing, update)

        return {
            "summary": f"Planned 1 app update action on the current board.",
            "boardId": current_board_id,
            "actions": [action],
        }

    @tool
    def plan_update_apps(
        updates: list[PlannedAppUpdate],
    ) -> dict[str, Any]:
        """
        Plan updates for existing apps on the current board without executing them.
        Each update must include an app id and may include position, size, title, or a state patch.
        """

        if not updates:
            raise ValueError("At least one app update is required.")

        if len(updates) > 50:
            raise ValueError("Please keep update batches to 50 or fewer actions.")

        board_apps = current_board_apps()
        app_lookup = {app["id"]: app for app in board_apps}
        planned_actions: list[dict[str, Any]] = []

        for update in updates:
            app_id = update.id
            existing = app_lookup.get(app_id)
            if existing is None:
                raise ValueError(f"Could not find app {app_id} on the current board.")

            planned_actions.append(_build_update_action(existing, update))

        return {
            "summary": f"Planned {len(planned_actions)} app update action(s) on the current board.",
            "boardId": current_board_id,
            "actions": planned_actions,
        }

    return [
        get_rooms,
        get_boards,
        get_apps,
        get_current_board,
        get_current_scope,
        get_current_board_apps,
        get_current_scope_apps,
        get_current_board_layout_bounds,
        get_scope_assets,
        analyze_scope_asset,
        plan_create_stickies,
        plan_update_app,
        plan_update_apps,
    ]
