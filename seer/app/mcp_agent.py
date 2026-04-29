# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from __future__ import annotations

import json
import time
from logging import Logger
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool
from langchain_openai import AzureChatOpenAI, ChatOpenAI

from pysage3.client import PySage3

from app.mcp_server import list_app_summaries, list_board_summaries, list_room_summaries
from libs.localtypes import AlfredAnswer, Question
from libs.utils import getModelsInfo, parse_openai_error


def _format_content(content: Any) -> str:
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


def _step_summary(name: str, result: Any) -> str:
    if isinstance(result, list):
        return f"{name} returned {len(result)} item(s)."

    if isinstance(result, dict):
        if "actions" in result and isinstance(result["actions"], list):
            return f"{name} planned {len(result['actions'])} action(s)."
        if "name" in result:
            return f"{name} resolved {result.get('name')}."
        if "board" in result and result.get("board"):
            return f"{name} resolved board {result['board'].get('name', 'unknown')}."

    return f"{name} completed."


def _stickie_position(
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


class MCPAgent:
    def __init__(self, logger: Logger, ps3: PySage3):
        logger.info("Initializing MCPAgent")
        self.logger = logger
        self.ps3 = ps3

        models = getModelsInfo(ps3)
        openai = models["openai"]
        azure = models["azure"]

        self.session_openai = None
        self.session_azure = None

        if openai["apiKey"] and openai["model"]:
            self.session_openai = ChatOpenAI(api_key=openai["apiKey"], model=openai["model"], temperature=0)

        if azure["text"]["apiKey"] and azure["text"]["model"]:
            model = azure["text"]["model"]
            endpoint = azure["text"]["url"]
            credential = azure["text"]["apiKey"]
            api_version = azure["text"]["api_version"]

            self.session_azure = AzureChatOpenAI(
                azure_deployment=model,
                api_version=api_version,
                azure_endpoint=endpoint,
                azure_ad_token=credential,
                model=model,
                temperature=0,
            )

    def _get_model(self, model_name: str):
        if model_name == "openai":
            return self.session_openai
        if model_name == "azure":
            return self.session_azure
        return None

    def _build_tools(self, qq: Question):
        current_room_id = qq.ctx.roomId
        current_board_id = qq.ctx.boardId
        cursor_x = qq.ctx.pos[0]
        cursor_y = qq.ctx.pos[1]

        @tool
        def get_rooms(room_id: str | None = None) -> list[dict[str, Any]]:
            """List rooms visible to Seer. Use this when the user explicitly asks about rooms."""
            self.logger.info("MCPAgent> get_rooms room_id=%s", room_id)
            return list_room_summaries(self.ps3, room_id=room_id)

        @tool
        def get_boards(room_id: str | None = None, board_id: str | None = None) -> list[dict[str, Any]]:
            """List boards. Defaults to boards in the current room when no filter is given."""
            effective_room_id = room_id if room_id is not None else (None if board_id else current_room_id)
            self.logger.info("MCPAgent> get_boards room_id=%s board_id=%s", effective_room_id, board_id)
            return list_board_summaries(self.ps3, room_id=effective_room_id, board_id=board_id)

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

            self.logger.info(
                "MCPAgent> get_apps room_id=%s board_id=%s app_id=%s app_type=%s title_contains=%s include_state=%s",
                effective_room_id,
                effective_board_id,
                app_id,
                app_type,
                title_contains,
                include_state,
            )
            return list_app_summaries(
                self.ps3,
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
            self.logger.info("MCPAgent> get_current_board board_id=%s room_id=%s", current_board_id, current_room_id)
            boards = list_board_summaries(self.ps3, board_id=current_board_id)
            rooms = list_room_summaries(self.ps3, room_id=current_room_id)
            apps = list_app_summaries(self.ps3, board_id=current_board_id)
            return {
                "room": rooms[0] if rooms else None,
                "board": boards[0] if boards else None,
                "appCount": len(apps),
            }

        @tool
        def get_current_board_apps(
            title_contains: str | None = None,
            app_type: str | None = None,
            include_state: bool = False,
        ) -> list[dict[str, Any]]:
            """List apps on the current board. Use this first for most Alfred board actions."""
            self.logger.info(
                "MCPAgent> get_current_board_apps board_id=%s app_type=%s title_contains=%s include_state=%s",
                current_board_id,
                app_type,
                title_contains,
                include_state,
            )
            return list_app_summaries(
                self.ps3,
                board_id=current_board_id,
                app_type=app_type,
                title_contains=title_contains,
                include_state=include_state,
            )

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
                apps = list_app_summaries(self.ps3, board_id=current_board_id, app_id=anchor_app_id, include_state=False)
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
                pos_x, pos_y = _stickie_position(base_x, base_y, stickie_width, stickie_height, index, normalized_side, gap)
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

        return [get_rooms, get_boards, get_apps, get_current_board, get_current_board_apps, plan_create_stickies]

    async def process(self, qq: Question):
        self.logger.info("Got MCPAgent> from %s using %s on board %s", qq.user, qq.model, qq.ctx.boardId)

        llm = self._get_model(qq.model)
        if llm is None:
            message = "Alfred board planning currently supports OpenAI and Azure. Please switch SAGE Intelligence away from Llama in User Settings."
            return AlfredAnswer(id=qq.id, r=message, success=False, actions=[], toolCalls=[])

        tools = self._build_tools(qq)
        tools_by_name = {tool_obj.name: tool_obj for tool_obj in tools}
        llm_with_tools = llm.bind_tools(tools)

        today = time.asctime()
        system_prompt = (
            f"Today is {today}. "
            "You are SAGE3 Alfred, an assistant for board-aware actions. "
            "Use the current-board tools first for most requests. "
            "Treat room and board tools as read-only inspection tools. "
            "Never propose deletes. Never claim you already executed an action. "
            "When the user asks to create stickies, use the planning tool so the UI can show approval buttons. "
            "If the request is ambiguous, ask a short clarifying question instead of guessing. "
            "Keep responses concise and use valid Markdown."
        )

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=qq.q),
        ]

        planned_actions: list[dict[str, Any]] = []
        tool_calls_trace: list[dict[str, Any]] = []

        for _ in range(8):
            try:
                reply = await llm_with_tools.ainvoke(messages)
            except Exception as e:
                code, message = parse_openai_error(e)
                if code:
                    description = f"Error from {qq.model}: {code}, {message}"
                else:
                    description = f"Error from {qq.model}: {message}"
                return AlfredAnswer(id=qq.id, r=description, success=False, actions=[], toolCalls=tool_calls_trace)

            messages.append(reply)
            calls = getattr(reply, "tool_calls", None) or []

            if not calls:
                answer = _format_content(reply.content).strip()
                if not answer:
                    answer = "I could not complete that request."
                return AlfredAnswer(
                    id=qq.id,
                    r=answer,
                    success=True,
                    actions=planned_actions,
                    toolCalls=tool_calls_trace,
                )

            for call in calls:
                tool_name = call["name"]
                tool_args = call.get("args", {}) or {}
                tool_fn = tools_by_name.get(tool_name)

                if tool_fn is None:
                    error_payload = {"error": f"Unknown tool: {tool_name}"}
                    tool_calls_trace.append({"name": tool_name, "args": tool_args, "summary": error_payload["error"]})
                    messages.append(ToolMessage(content=json.dumps(error_payload), tool_call_id=call["id"]))
                    continue

                try:
                    result = tool_fn.invoke(tool_args)
                    summary = _step_summary(tool_name, result)
                    if isinstance(result, dict) and isinstance(result.get("actions"), list):
                        planned_actions.extend(result["actions"])
                    tool_calls_trace.append({"name": tool_name, "args": tool_args, "summary": summary})
                    messages.append(ToolMessage(content=json.dumps(result, default=str), tool_call_id=call["id"]))
                except Exception as e:
                    error_payload = {"error": str(e)}
                    tool_calls_trace.append({"name": tool_name, "args": tool_args, "summary": f"{tool_name} failed: {e}"})
                    messages.append(ToolMessage(content=json.dumps(error_payload), tool_call_id=call["id"]))

        return AlfredAnswer(
            id=qq.id,
            r="I hit the current planning limit before I could finish. Please try a shorter or more specific request.",
            success=False,
            actions=planned_actions,
            toolCalls=tool_calls_trace,
        )
