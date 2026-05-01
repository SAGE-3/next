# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal


SupportMode = Literal["generic", "hybrid", "adapter", "read_only"]


@dataclass(frozen=True)
class SeerAppPolicy:
    """Describe how SEER should inspect and update a supported SAGE3 app."""

    mode: SupportMode
    preview_fields: tuple[str, ...] = ()
    allowed_state_fields: tuple[str, ...] = ()
    allowed_create_fields: tuple[str, ...] = ()
    default_create_size: tuple[float, float] | None = None
    default_create_title: str | None = None
    yjs_replace_field: str | None = None
    note: str = ""


MAP_BASE_LAYER_ALIASES: dict[str, str] = {
    "openstreetmap": "OpenStreetMap",
    "osm": "OpenStreetMap",
    "streets": "OpenStreetMap",
    "street": "OpenStreetMap",
    "streetmap": "OpenStreetMap",
    "satellite": "Satellite",
    "hybrid": "Satellite",
}


def normalize_map_base_layer(value: Any) -> str:
    """Map friendly SEER/base-map aliases onto the canonical Map app values."""

    if not isinstance(value, str):
        return "OpenStreetMap"

    normalized = MAP_BASE_LAYER_ALIASES.get(value.strip().casefold())
    return normalized or "OpenStreetMap"


def _flatten_quill_ops(content: Any) -> str:
    """Convert a Quill delta payload into plain text for compact SEER previews."""

    if not isinstance(content, dict):
        return ""

    ops = content.get("ops")
    if not isinstance(ops, list):
        return ""

    chunks: list[str] = []
    for op in ops:
        if not isinstance(op, dict):
            continue
        inserted = op.get("insert")
        if isinstance(inserted, str):
            chunks.append(inserted)

    return "".join(chunks).strip()


def _summarize_poll(poll: Any) -> dict[str, Any] | None:
    """Keep poll previews focused on the editable prompt and option labels."""

    if not isinstance(poll, dict):
        return None

    options = poll.get("options")
    option_labels: list[str] = []
    if isinstance(options, list):
        for option in options[:8]:
            if isinstance(option, dict) and isinstance(option.get("option"), str):
                option_labels.append(option["option"])

    return {
        "question": str(poll.get("question", "")),
        "options": option_labels,
        "optionCount": len(options) if isinstance(options, list) else 0,
    }


def _summarize_map_layers(layers: Any) -> list[dict[str, Any]]:
    """Trim map layer previews down to the fields SEER actually reasons about."""

    if not isinstance(layers, list):
        return []

    summarized: list[dict[str, Any]] = []
    for layer in layers[:8]:
        if not isinstance(layer, dict):
            continue
        summarized.append(
            {
                "assetId": layer.get("assetId", ""),
                "visible": bool(layer.get("visible", False)),
                "color": layer.get("color"),
                "colorScale": layer.get("colorScale"),
                "opacity": layer.get("opacity"),
            }
        )

    return summarized


def _normalize_preview_source(app_type: str, state: dict[str, Any]) -> dict[str, Any]:
    """Inject app-aware derived fields before SEER builds a compact preview."""

    preview_source = dict(state)

    if app_type == "Chat":
        messages = preview_source.get("messages")
        preview_source["messageCount"] = len(messages) if isinstance(messages, list) else 0
    elif app_type == "ImageViewer":
        boxes = preview_source.get("boxes")
        preview_source["boxCount"] = len(boxes) if isinstance(boxes, list) else 0
    elif app_type == "Map":
        preview_source["baseLayer"] = normalize_map_base_layer(preview_source.get("baseLayer"))
        preview_source["layers"] = _summarize_map_layers(preview_source.get("layers"))
    elif app_type == "Notepad":
        preview_source["content"] = _flatten_quill_ops(preview_source.get("content"))
    elif app_type == "Poll":
        poll_summary = _summarize_poll(preview_source.get("poll"))
        if poll_summary is not None:
            preview_source["poll"] = poll_summary

    return preview_source


# Keep this aligned with the canonical supported-app list for SEER.
# The frontend mirrors the preview fields for fallback snapshots, but the
# server-side policy stays authoritative for validation and tool prompting.
SEER_APP_POLICIES: dict[str, SeerAppPolicy] = {
    "AssetLink": SeerAppPolicy(
        mode="generic",
        preview_fields=("assetid",),
        allowed_state_fields=("assetid",),
        default_create_title="Asset Link",
        note="Asset link apps can swap the referenced asset, but do not mutate the asset itself.",
    ),
    "BoardLink": SeerAppPolicy(
        mode="generic",
        preview_fields=("url", "cardTitle"),
        allowed_state_fields=("url", "cardTitle"),
        default_create_title="Board Link",
    ),
    "Calculator": SeerAppPolicy(
        mode="generic",
        preview_fields=("input", "history"),
        allowed_state_fields=("input",),
        default_create_title="Calculator",
        note="History is derived user interaction; SEER only edits the visible input.",
    ),
    "Chat": SeerAppPolicy(
        mode="read_only",
        preview_fields=("context", "firstQuestion", "messageCount"),
        note="Chat history is conversational state and should not be rewritten by SEER.",
    ),
    "Clock": SeerAppPolicy(
        mode="generic",
        preview_fields=("city", "timeZone", "is24Hour", "color"),
        allowed_state_fields=("city", "timeZone", "is24Hour", "color"),
    ),
    "CoBrowser": SeerAppPolicy(
        mode="read_only",
        preview_fields=("nonOwnerViewOnly", "audio"),
        note="Cobrowse state is session/workflow oriented and needs dedicated commands.",
    ),
    "CodeEditor": SeerAppPolicy(
        mode="hybrid",
        preview_fields=("content", "language", "fontSize", "readonly", "filename"),
        allowed_state_fields=("language", "fontSize", "readonly", "filename", "sources"),
        allowed_create_fields=("content", "language", "fontSize", "readonly", "filename", "sources"),
        default_create_size=(720, 520),
        default_create_title="Code Editor",
        yjs_replace_field="content",
        note="SEER replaces the collaborative document through Yjs and uses generic state updates for editor settings.",
    ),
    "CSVViewer": SeerAppPolicy(
        mode="generic",
        preview_fields=("assetid",),
        allowed_state_fields=("assetid",),
    ),
    "DeepZoomImage": SeerAppPolicy(
        mode="generic",
        preview_fields=("assetid", "zoomLevel", "zoomCenter"),
        allowed_state_fields=("assetid", "zoomLevel", "zoomCenter"),
    ),
    "Drawing": SeerAppPolicy(
        mode="generic",
        preview_fields=("fit", "follow", "camera"),
        allowed_state_fields=("fit", "follow", "camera"),
        note="Drawing content itself is not patched generically, but view/camera state is fair game.",
    ),
    "ImageViewer": SeerAppPolicy(
        mode="generic",
        preview_fields=("assetid", "annotations", "boxCount"),
        allowed_state_fields=("assetid", "annotations"),
        note="Boxes are generated/analysis data and should stay out of generic SEER updates.",
    ),
    "Map": SeerAppPolicy(
        mode="generic",
        preview_fields=("location", "zoom", "bearing", "pitch", "baseLayer", "layers", "assetid"),
        allowed_state_fields=("location", "zoom", "bearing", "pitch", "baseLayer", "layers", "assetid"),
        allowed_create_fields=("location", "zoom", "bearing", "pitch", "baseLayer", "layers", "assetid"),
        default_create_size=(720, 480),
        default_create_title="Map",
    ),
    "Notepad": SeerAppPolicy(
        mode="adapter",
        preview_fields=("content",),
        note="Notepad editing should go through a Quill/Yjs-aware adapter rather than raw state patches.",
    ),
    "PDFViewer": SeerAppPolicy(
        mode="generic",
        preview_fields=("assetid", "currentPage", "displayPages", "numPages"),
        allowed_state_fields=("assetid", "currentPage", "displayPages"),
        default_create_title="PDF",
    ),
    "Poll": SeerAppPolicy(
        mode="adapter",
        preview_fields=("poll",),
        note="Poll updates should preserve votes/options semantics, so they need a dedicated adapter.",
    ),
    "SageCell": SeerAppPolicy(
        mode="hybrid",
        preview_fields=("code", "language", "fontSize"),
        allowed_state_fields=("language", "fontSize"),
        allowed_create_fields=("code", "language", "fontSize"),
        default_create_size=(720, 480),
        default_create_title="SageCell",
        yjs_replace_field="code",
        note="SEER rewrites code through Yjs and leaves kernel/session execution fields alone.",
    ),
    "Screenshare": SeerAppPolicy(
        mode="read_only",
        preview_fields=("aspectRatio",),
        note="Screenshare state is runtime/session driven and should not be modified by SEER.",
    ),
    "Stickie": SeerAppPolicy(
        mode="hybrid",
        preview_fields=("text", "fontSize", "color", "lock", "sources"),
        allowed_state_fields=("fontSize", "color", "lock", "sources"),
        allowed_create_fields=("text", "fontSize", "color", "lock", "sources"),
        default_create_size=(360, 360),
        default_create_title="Stickie",
        yjs_replace_field="text",
    ),
    "Timer": SeerAppPolicy(
        mode="generic",
        preview_fields=("originalTotal", "total", "isRunning"),
        allowed_state_fields=("originalTotal", "total", "isRunning"),
        note="clientStartTime is runtime bookkeeping and should not be patched by SEER.",
    ),
    "VideoViewer": SeerAppPolicy(
        mode="generic",
        preview_fields=("assetid", "currentTime", "paused", "loop"),
        allowed_state_fields=("assetid", "currentTime", "paused", "loop"),
    ),
    "WebpageLink": SeerAppPolicy(
        mode="generic",
        preview_fields=("url", "streaming"),
        allowed_state_fields=("url", "streaming"),
    ),
    "Webview": SeerAppPolicy(
        mode="generic",
        preview_fields=("webviewurl", "zoom"),
        allowed_state_fields=("webviewurl", "zoom"),
        allowed_create_fields=("webviewurl", "zoom"),
        default_create_size=(960, 720),
        default_create_title="Webview",
    ),
}

STRING_PREVIEW_LIMITS = {
    "text": 280,
    "content": 600,
    "code": 600,
    "input": 200,
    "history": 400,
}


def get_app_policy(app_type: str) -> SeerAppPolicy | None:
    """Return the SEER policy for a supported app type, if one exists."""

    return SEER_APP_POLICIES.get(app_type)


def preview_state_for_app(app_type: str, state: dict[str, Any], include_state: bool) -> dict[str, Any] | None:
    """Shape state into a compact, app-aware preview for the model."""

    if not state:
        return None

    if include_state:
        return state

    policy = get_app_policy(app_type)
    if policy is None:
        return None

    preview_source = _normalize_preview_source(app_type, state)
    preview: dict[str, Any] = {}
    for key in policy.preview_fields:
        if key not in preview_source:
            continue

        value = preview_source[key]
        limit = STRING_PREVIEW_LIMITS.get(key)
        if limit is not None and isinstance(value, str):
            preview[key] = value[:limit]
        else:
            preview[key] = value

    return preview or None


def validate_state_patch(app_type: str, state_patch: dict[str, Any]) -> dict[str, Any]:
    """Reject unsupported generic state updates before they reach the UI."""

    policy = get_app_policy(app_type)
    if policy is None:
        raise ValueError(f"App type {app_type or 'unknown'} is not part of SEER's supported app policy set.")

    if not state_patch:
        raise ValueError(f"State patch for app type {app_type} did not include any values.")

    if policy.mode == "read_only":
        raise ValueError(f"{app_type} is currently read-only for SEER state updates. {policy.note}".strip())

    if policy.mode == "adapter" and not policy.allowed_state_fields:
        raise ValueError(f"{app_type} requires an app-specific SEER adapter. {policy.note}".strip())

    allowed_fields = set(policy.allowed_state_fields)
    unsupported = sorted(key for key in state_patch if key not in allowed_fields)
    if unsupported:
        allowed = ", ".join(sorted(allowed_fields)) if allowed_fields else "no generic fields"
        unsupported_text = ", ".join(unsupported)
        raise ValueError(f"{app_type} does not support generic SEER updates for: {unsupported_text}. Allowed fields: {allowed}.")

    if app_type == "Map" and "baseLayer" in state_patch:
        state_patch = { **state_patch, "baseLayer": normalize_map_base_layer(state_patch["baseLayer"]) }

    return state_patch


def validate_create_state(app_type: str, state_patch: dict[str, Any]) -> dict[str, Any]:
    """Reject unsupported SEER app-creation fields before they reach the UI."""

    policy = get_app_policy(app_type)
    if policy is None:
        raise ValueError(f"App type {app_type or 'unknown'} is not part of SEER's supported app policy set.")

    if not state_patch:
        return {}

    allowed_fields = set(policy.allowed_create_fields)
    if not allowed_fields:
        raise ValueError(f"{app_type} does not currently support SEER app creation.")

    unsupported = sorted(key for key in state_patch if key not in allowed_fields)
    if unsupported:
        allowed = ", ".join(sorted(allowed_fields))
        unsupported_text = ", ".join(unsupported)
        raise ValueError(f"{app_type} does not support SEER creation fields: {unsupported_text}. Allowed fields: {allowed}.")

    if app_type == "Map" and "baseLayer" in state_patch:
        state_patch = { **state_patch, "baseLayer": normalize_map_base_layer(state_patch["baseLayer"]) }

    return state_patch


def get_default_create_payload(app_type: str) -> tuple[str, tuple[float, float]]:
    """Return the default title and size SEER should use for planned app creation."""

    policy = get_app_policy(app_type)
    if policy is None or policy.default_create_size is None:
        raise ValueError(f"{app_type or 'unknown'} does not have SEER creation defaults configured.")

    title = policy.default_create_title or app_type
    return title, policy.default_create_size


def yjs_replace_field_for_app(app_type: str) -> str | None:
    """Return the Yjs-backed field SEER should replace for collaborative text apps."""

    policy = get_app_policy(app_type)
    return policy.yjs_replace_field if policy else None


def seer_state_support_hint() -> str:
    """Compact prompt hint describing the main generic fields SEER can change."""

    generic_support = []
    yjs_support = []
    create_support = []
    adapter_only = []
    read_only = []

    for app_type, policy in SEER_APP_POLICIES.items():
        if policy.allowed_state_fields:
            generic_support.append(f"{app_type}({','.join(policy.allowed_state_fields)})")
        if policy.allowed_create_fields:
            create_support.append(f"{app_type}({','.join(policy.allowed_create_fields)})")
        if policy.yjs_replace_field:
            yjs_support.append(f"{app_type}({policy.yjs_replace_field})")
        if policy.mode == "adapter":
            adapter_only.append(app_type)
        if policy.mode == "read_only":
            read_only.append(app_type)

    parts = [f"Safe generic state patches include {'; '.join(generic_support)}."]
    if create_support:
        parts.append(f"Safe SEER app creation supports {'; '.join(create_support)}.")
    if yjs_support:
        parts.append(f"Full collaborative rewrites use Yjs for {'; '.join(yjs_support)}.")
    if adapter_only:
        parts.append(f"Adapter-only apps: {', '.join(adapter_only)}.")
    if read_only:
        parts.append(f"Read-only apps: {', '.join(read_only)}.")

    return " ".join(parts)
