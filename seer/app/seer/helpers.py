# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from __future__ import annotations

from typing import Any


def format_content(content: Any) -> str:
    if isinstance(content, str):
        return content

    if isinstance(content, list):
        texts = []
        for item in content:
            if isinstance(item, str):
                texts.append(item)
            elif isinstance(item, dict) and item.get("type") == "text":
                texts.append(item.get("text", ""))
        return "\n".join(text for text in texts if text)

    return str(content)


def step_summary(name: str, result: Any) -> str:
    if isinstance(result, list):
        return f"{name} returned {len(result)} item(s)."

    if isinstance(result, dict):
        if "actions" in result and isinstance(result["actions"], list):
            return f"{name} planned {len(result['actions'])} action(s)."
        if "name" in result:
            return f"{name} resolved {result.get('name')}."
        if "board" in result and result.get("board"):
            return f"{name} resolved board {result['board'].get('name', 'unknown')}."
        if "asset" in result and isinstance(result["asset"], dict):
            return f"{name} analyzed {result['asset'].get('filename', 'an asset')}."

    return f"{name} completed."


def board_bounds(apps: list[dict[str, Any]]) -> dict[str, Any]:
    if not apps:
        return {
            "appCount": 0,
            "left": 0,
            "top": 0,
            "right": 0,
            "bottom": 0,
            "width": 0,
            "height": 0,
        }

    left = min(app["position"]["x"] for app in apps)
    top = min(app["position"]["y"] for app in apps)
    right = max(app["position"]["x"] + app["size"]["width"] for app in apps)
    bottom = max(app["position"]["y"] + app["size"]["height"] for app in apps)

    return {
        "appCount": len(apps),
        "left": left,
        "top": top,
        "right": right,
        "bottom": bottom,
        "width": right - left,
        "height": bottom - top,
    }


def normalize_fallback_app(doc: dict[str, Any], room_id: str, board_id: str) -> dict[str, Any]:
    position = doc.get("position", {}) or {}
    size = doc.get("size", {}) or {}
    state_preview = doc.get("statePreview")

    return {
        "id": doc.get("id", ""),
        "room_id": doc.get("roomId", room_id),
        "board_id": doc.get("boardId", board_id),
        "title": doc.get("title", ""),
        "type": doc.get("type", ""),
        "created_by": doc.get("createdBy"),
        "position": {
            "x": float(position.get("x", 0)),
            "y": float(position.get("y", 0)),
            "z": float(position.get("z", 0)),
        },
        "size": {
            "width": float(size.get("width", 0)),
            "height": float(size.get("height", 0)),
            "depth": float(size.get("depth", 0)),
        },
        "state_preview": state_preview if isinstance(state_preview, dict) else None,
    }


def state_preview_value(app: dict[str, Any], key: str) -> Any:
    state_preview = app.get("state_preview")
    if isinstance(state_preview, dict):
        return state_preview.get(key)
    return None


def asset_id_from_app(app: dict[str, Any]) -> str | None:
    asset_id = state_preview_value(app, "assetid")
    if asset_id is None:
        return None
    return str(asset_id)


def summarize_asset_doc(doc: dict[str, Any]) -> dict[str, Any]:
    data = doc.get("data", {})
    derived = data.get("derived") or {}
    return {
        "id": doc.get("_id", ""),
        "room_id": data.get("room", ""),
        "filename": data.get("originalfilename", ""),
        "mimetype": data.get("mimetype", ""),
        "size": data.get("size", 0),
        "width": derived.get("width"),
        "height": derived.get("height"),
    }


def filter_app_summaries(
    apps: list[dict[str, Any]],
    app_ids: list[str] | None = None,
    app_type: str | None = None,
    title_contains: str | None = None,
    text_contains: str | None = None,
    color: str | None = None,
) -> list[dict[str, Any]]:
    filtered = apps

    if app_ids:
        app_ids_set = set(app_ids)
        filtered = [app for app in filtered if app.get("id") in app_ids_set]

    if app_type:
        app_type_filter = app_type.casefold()
        filtered = [app for app in filtered if str(app.get("type", "")).casefold() == app_type_filter]

    if title_contains:
        title_filter = title_contains.lower()
        filtered = [app for app in filtered if title_filter in app.get("title", "").lower()]

    if text_contains:
        text_filter = text_contains.lower()
        filtered = [
            app for app in filtered if text_filter in str(state_preview_value(app, "text") or "").lower()
        ]

    if color:
        color_filter = color.casefold()
        filtered = [app for app in filtered if str(state_preview_value(app, "color") or "").casefold() == color_filter]

    return filtered


def stickie_position(
    base_x: float,
    base_y: float,
    width: float,
    height: float,
    index: int,
    side: str,
    gap: float,
) -> tuple[float, float]:
    if side in ("right", "left"):
        return base_x, base_y + index * (height + gap)

    return base_x + index * (width + gap), base_y
