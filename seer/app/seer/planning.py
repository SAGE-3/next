# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.seer.app_support import get_default_create_payload, validate_create_state, validate_state_patch, yjs_replace_field_for_app


class PlannedPositionUpdate(BaseModel):
    """Top-level app position patch used by SEER planning tools."""

    x: float = Field(description="Board x position in pixels.")
    y: float = Field(description="Board y position in pixels.")
    z: float | None = Field(default=None, description="Optional z position. Leave unset to preserve the current z value.")


class PlannedSizeUpdate(BaseModel):
    """Top-level app size patch used by SEER planning tools."""

    width: float = Field(description="App width in pixels.")
    height: float = Field(description="App height in pixels.")
    depth: float | None = Field(default=None, description="Optional depth. Leave unset to preserve the current depth.")


class PlannedStatePatch(BaseModel):
    """
    Explicit v1 generic state fields that SEER may patch after user approval.

    Keep this aligned with the per-app allowlist in app_support.py so the tool
    schema and server-side validation describe the same safe update surface.
    """

    model_config = ConfigDict(extra="allow")

    assetid: str | None = Field(default=None, description="Optional asset id for asset-backed apps.")
    location: list[float] | None = Field(
        default=None,
        description="Optional location patch. For Map use [longitude, latitude].",
    )
    zoom: float | None = Field(default=None, description="Optional zoom value for Map or Webview apps.")
    bearing: float | None = Field(default=None, description="Optional bearing value for map-like apps.")
    pitch: float | None = Field(default=None, description="Optional pitch value for map-like apps.")
    baseLayer: str | None = Field(
        default=None,
        description="Optional base layer name for Map. Prefer the canonical values OpenStreetMap or Satellite.",
    )
    layers: list[dict[str, Any]] | None = Field(default=None, description="Optional layer list for Map.")
    zoomLevel: float | None = Field(default=None, description="Optional zoom level for DeepZoomImage.")
    zoomCenter: list[float] | None = Field(default=None, description="Optional zoom center for DeepZoomImage.")
    fontSize: float | None = Field(default=None, description="Optional font size for text/code apps.")
    color: str | None = Field(default=None, description="Optional color for Stickie or Clock.")
    lock: bool | None = Field(default=None, description="Optional lock toggle for Stickie.")
    sources: list[str] | None = Field(default=None, description="Optional sources list for apps that track provenance.")
    url: str | None = Field(default=None, description="Optional URL for BoardLink or WebpageLink.")
    webviewurl: str | None = Field(default=None, description="Optional URL for Webview apps.")
    cardTitle: str | None = Field(default=None, description="Optional card title for BoardLink apps.")
    streaming: bool | None = Field(default=None, description="Optional streaming toggle for WebpageLink.")
    input: str | None = Field(default=None, description="Optional calculator input.")
    city: str | None = Field(default=None, description="Optional city label for Clock.")
    timeZone: str | None = Field(default=None, description="Optional timezone for Clock.")
    is24Hour: bool | None = Field(default=None, description="Optional 24-hour toggle for Clock.")
    currentPage: int | None = Field(default=None, description="Optional current page for PDFViewer.")
    displayPages: int | None = Field(default=None, description="Optional page span for PDFViewer.")
    annotations: bool | None = Field(default=None, description="Optional annotation toggle for ImageViewer.")
    currentTime: float | None = Field(default=None, description="Optional playback time for VideoViewer.")
    paused: bool | None = Field(default=None, description="Optional paused toggle for VideoViewer.")
    loop: bool | None = Field(default=None, description="Optional loop toggle for VideoViewer.")
    language: str | None = Field(default=None, description="Optional language for CodeEditor or SageCell.")
    readonly: bool | None = Field(default=None, description="Optional readonly toggle for CodeEditor.")
    filename: str | None = Field(default=None, description="Optional filename label for CodeEditor.")
    fit: bool | None = Field(default=None, description="Optional fit toggle for Drawing.")
    follow: str | None = Field(default=None, description="Optional follow target for Drawing.")
    camera: dict[str, float] | None = Field(default=None, description="Optional camera patch for Drawing.")
    originalTotal: float | None = Field(default=None, description="Optional original duration for Timer.")
    total: float | None = Field(default=None, description="Optional current total for Timer.")
    isRunning: bool | None = Field(default=None, description="Optional running toggle for Timer.")


class PlannedCreateState(BaseModel):
    """
    Explicit create-time state fields SEER may populate for supported app types.

    This is intentionally separate from PlannedStatePatch because creation can
    include document/code content for new apps, while later generic updates for
    those same fields should still route through Yjs or app-specific adapters.
    """

    model_config = ConfigDict(extra="allow")

    text: str | None = Field(default=None, description="Optional text content for a new Stickie.")
    content: str | None = Field(default=None, description="Optional initial content for a new CodeEditor.")
    code: str | None = Field(default=None, description="Optional initial code for a new SageCell.")
    assetid: str | None = Field(default=None, description="Optional asset id for asset-backed apps.")
    location: list[float] | None = Field(default=None, description="Optional location for Map as [longitude, latitude].")
    zoom: float | None = Field(default=None, description="Optional zoom value for Map or Webview.")
    bearing: float | None = Field(default=None, description="Optional bearing value for Map.")
    pitch: float | None = Field(default=None, description="Optional pitch value for Map.")
    baseLayer: str | None = Field(
        default=None,
        description="Optional base layer name for Map. Prefer the canonical values OpenStreetMap or Satellite.",
    )
    layers: list[dict[str, Any]] | None = Field(default=None, description="Optional layer list for Map.")
    fontSize: float | None = Field(default=None, description="Optional font size for text/code apps.")
    color: str | None = Field(default=None, description="Optional color for a new Stickie.")
    lock: bool | None = Field(default=None, description="Optional lock toggle for a new Stickie.")
    sources: list[str] | None = Field(default=None, description="Optional provenance/source list for supported apps.")
    webviewurl: str | None = Field(default=None, description="Optional URL for a new Webview.")
    language: str | None = Field(default=None, description="Optional language for CodeEditor or SageCell.")
    readonly: bool | None = Field(default=None, description="Optional readonly toggle for CodeEditor.")
    filename: str | None = Field(default=None, description="Optional filename label for CodeEditor.")


SupportedCreateApp = Literal["Stickie", "CodeEditor", "SageCell", "Map", "Webview"]


class PlannedAppCreate(BaseModel):
    """Structured app creation SEER can propose before the user approves it."""

    app: SupportedCreateApp = Field(description="Supported app type to create.")
    title: str | None = Field(default=None, description="Optional app title. Leave unset to use the SEER default title.")
    position: PlannedPositionUpdate | None = Field(default=None, description="Optional top-level position. Leave unset to use the next default slot.")
    size: PlannedSizeUpdate | None = Field(default=None, description="Optional top-level size. Leave unset to use the default size for this app type.")
    state: PlannedCreateState | None = Field(default=None, description="Optional initial state for the new app.")


class PlannedAppUpdate(BaseModel):
    """Structured app update planned by SEER before the user approves it."""

    id: str = Field(description="App id to update on the current board.")
    position: PlannedPositionUpdate | None = Field(default=None, description="Optional top-level position update.")
    size: PlannedSizeUpdate | None = Field(default=None, description="Optional top-level size update.")
    title: str | None = Field(default=None, description="Optional new app title.")
    state: PlannedStatePatch | None = Field(
        default=None,
        description="Optional partial state patch for supported non-collaborative app fields.",
    )


def build_update_action(existing: dict[str, Any], update: PlannedAppUpdate) -> dict[str, Any]:
    """Convert a planned app update into the frontend action payload SEER applies."""

    app_type = str(existing.get("type", ""))
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
        action["updates"]["state"] = validate_state_patch(app_type, state_patch)

    if not action["updates"]:
        raise ValueError(f"Update for app {update.id} did not include any supported changes.")

    return action


def build_yjs_replace_action(existing: dict[str, Any], content: str) -> dict[str, Any]:
    """Build a full collaborative replace action for Yjs-backed SEER apps."""

    app_type = str(existing.get("type", ""))
    field = yjs_replace_field_for_app(app_type)
    if field is None:
        raise ValueError(f"App type {app_type or 'unknown'} does not support SEER Yjs replace actions.")

    return {
        "type": "replace_yjs_content",
        "id": existing["id"],
        "appType": app_type,
        "field": field,
        "content": content,
    }


def build_create_action(create: PlannedAppCreate, default_x: float, default_y: float, index: int) -> dict[str, Any]:
    """Convert a planned app creation into the frontend create_app payload."""

    app_type = create.app
    default_title, (default_width, default_height) = get_default_create_payload(app_type)

    position = create.position
    size = create.size
    state_patch = create.state.model_dump(exclude_none=True) if create.state is not None else {}

    pos_x = float(position.x) if position is not None else float(default_x + index * 48)
    pos_y = float(position.y) if position is not None else float(default_y + index * 48)
    pos_z = float(position.z) if position is not None and position.z is not None else 0.0

    width = float(size.width) if size is not None else float(default_width)
    height = float(size.height) if size is not None else float(default_height)
    depth = float(size.depth) if size is not None and size.depth is not None else 0.0

    return {
        "type": "create_app",
        "app": app_type,
        "state": validate_create_state(app_type, state_patch),
        "data": {
            "title": create.title or default_title,
            "position": {"x": pos_x, "y": pos_y, "z": pos_z},
            "size": {"width": width, "height": height, "depth": depth},
        },
    }
