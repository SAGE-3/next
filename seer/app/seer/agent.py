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

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_openai import AzureChatOpenAI, ChatOpenAI

from pysage3.client import PySage3

from app.seer.helpers import format_content, step_summary
from app.seer.tools import build_seer_tools
from libs.localtypes import Question, SeerAnswer
from libs.utils import getModelsInfo, parse_openai_error


class SeerAgent:
    """Board-aware SEER planner that uses Seer-controlled tool calling."""

    def __init__(self, logger: Logger, ps3: PySage3, image_agent=None, pdf_agent=None):
        logger.info("Initializing SeerAgent")
        self.logger = logger
        self.ps3 = ps3
        self.image_agent = image_agent
        self.pdf_agent = pdf_agent

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

    def _history_messages(self, qq: Question) -> list[Any]:
        """Convert the recent SEER question/answer history into model messages."""

        history_messages: list[Any] = []
        questions = qq.ctx.previousQ[-10:]
        answers = qq.ctx.previousA[-10:]

        for question, answer in zip(questions, answers):
            if question:
                history_messages.append(HumanMessage(content=question))
            if answer:
                history_messages.append(AIMessage(content=answer))

        return history_messages

    async def process(self, qq: Question):
        self.logger.info("Got SeerAgent> from %s using %s on board %s", qq.user, qq.model, qq.ctx.boardId)

        llm = self._get_model(qq.model)
        if llm is None:
            message = "SEER currently supports OpenAI and Azure. Please switch SEER away from Llama in User Settings."
            return SeerAnswer(id=qq.id, r=message, success=False, actions=[], toolCalls=[])

        tools = build_seer_tools(self, qq)
        tools_by_name = {tool_obj.name: tool_obj for tool_obj in tools}
        llm_with_tools = llm.bind_tools(tools)

        today = time.asctime()
        system_prompt = (
            f"Today is {today}. "
            "You are SEER, SAGE3's board-aware assistant. "
            "Default to the current SEER scope first: selected apps if there are any, otherwise the focused app, otherwise the full current board. "
            "Use the recent SEER conversation history to resolve short follow-up replies like 'yes', 'do that', or 'move it there'. "
            "Use the current-scope tools first for most requests, and only switch to current-board tools when the user explicitly asks about the whole board. "
            "Treat room and board tools as read-only inspection tools. "
            "Never propose deletes. Never claim you already executed an action. "
            "When the user asks to create stickies, use the planning tool so the UI can show approval buttons. "
            "When the user asks to move, align, reorder, grid, cluster, or rearrange existing apps, inspect the current scope apps first and then use the update planning tools. "
            "Prefer the single-app update planner for focused changes like moving one app, changing one title, or updating one map. "
            "For map-like apps, state patches can include location, zoom, bearing, pitch, baseLayer, and layers. "
            "When the user asks about an image, PDF, or other asset-backed app in the current scope, use the asset analysis tool instead of guessing from titles. "
            "The scope app tools support filtering by app type, title, stickie text, and stickie color. "
            "If the request is ambiguous, ask a short clarifying question instead of guessing. "
            "Keep responses concise and use valid Markdown."
        )

        messages = [
            SystemMessage(content=system_prompt),
            *self._history_messages(qq),
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
                return SeerAnswer(id=qq.id, r=description, success=False, actions=[], toolCalls=tool_calls_trace)

            messages.append(reply)
            calls = getattr(reply, "tool_calls", None) or []

            if not calls:
                answer = format_content(reply.content).strip()
                if not answer:
                    answer = "I could not complete that request."
                return SeerAnswer(
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
                    result = await tool_fn.ainvoke(tool_args)
                    summary = step_summary(tool_name, result)
                    if isinstance(result, dict) and isinstance(result.get("actions"), list):
                        planned_actions.extend(result["actions"])
                    tool_calls_trace.append({"name": tool_name, "args": tool_args, "summary": summary})
                    messages.append(ToolMessage(content=json.dumps(result, default=str), tool_call_id=call["id"]))
                except Exception as e:
                    error_payload = {"error": str(e)}
                    tool_calls_trace.append({"name": tool_name, "args": tool_args, "summary": f"{tool_name} failed: {e}"})
                    messages.append(ToolMessage(content=json.dumps(error_payload), tool_call_id=call["id"]))

        return SeerAnswer(
            id=qq.id,
            r="I hit the current planning limit before I could finish. Please try a shorter or more specific request.",
            success=False,
            actions=planned_actions,
            toolCalls=tool_calls_trace,
        )
