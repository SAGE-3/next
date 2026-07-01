# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

# Code Agent

import time, json, re
from logging import Logger

# Web API
from fastapi import HTTPException

# SAGE3 API
from pysage3.client import PySage3

# AI Models
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

# Typing for RPC
from libs.localtypes import CodeRequest, Context, Question, Answer
from libs.utils import getModelsInfo, buildContextFromApps
from libs.llm_manager import LLMManager

# Server-side instructions per code method (moved out of the frontend, which
# now sends `appIds` + `method` instead of assembling the prompt).
CODE_PROMPTS = {
    "comment": "Comment this code extensively to explain clearly what each instruction does.",
    "explain": "Explain this code.",
    "refactor": "Refactor this code.",
    "generate": "Generate the best solution for the following request.",
}

# AI logging
from libs.ai_logging import ai_logger


class CodeAgent:
    def __init__(
        self,
        logger: Logger,
        ps3: PySage3,
    ):
        logger.info("Initializing CodeAgent")
        self.logger = logger
        self.ps3 = ps3
        self.logger.info("SAGE3 server configuration:")
        # Capability-driven model registry (providers/tasks/settings)
        self.manager = LLMManager(getModelsInfo(ps3), logger)
        self.logger.info("Code providers: " + ", ".join(self.manager.list_providers()))

        ai_logger.emit(
            "init",
            {
                "agent": "code",
                "providers": self.manager.list_providers(),
            },
        )

        # Templates
        sys_template_str = """Today is {date}. You are a helpful and succinct assistant, providing informative answers to {username} (whose location is {location}).
        Always format your responses using valid Markdown syntax. Use appropriate elements like:
        •	# for headings
        •	**bold** or _italic_ for emphasis
        •	`inline code` and code blocks (...) for code
        •	Bullet lists, numbered lists, and links as needed
        If you include code, always wrap it in fenced code blocks with the correct language tag (e.g., ```python). Default to Python if no language is specified. If asked to create plots, please use Matplotlib. .
        If you don't know the answer, say "I don't know" and suggest to search the web."""

        human_template_str = "{question}"

        # For OpenAI / Message API compatible models
        self.prompt = ChatPromptTemplate.from_messages(
            [
                ("system", sys_template_str),
                ("user", human_template_str),
            ]
        )

        # OutputParser that parses LLMResult into the top likely string.
        # Create a new model by parsing and validating input data from keyword arguments.
        # Raises ValidationError if the input data cannot be parsed to form a valid model.
        self.output_parser = StrOutputParser()

        # Per-provider code chains, built lazily on first use
        self._sessions = {}

        if not self.manager.list_providers():
            # Don't crash startup on an un-migrated/empty config: boot without a
            # provider and let process() return a clear per-request error.
            self.logger.warning("CodeAgent> no model configured; code requests will fail until models are set")

    def _get_session(self, provider: str):
        """Build (and cache) a prompt|llm|parser chain for a provider's
        code-capable model. Returns None if the provider can't handle code."""
        if provider in self._sessions:
            return self._sessions[provider]
        # 'coding' task prefers a 'code' model, falling back to chat
        llm = self.manager.build_chat_model(provider, ["code", "chat"])
        session = (self.prompt | llm | self.output_parser) if llm else None
        self._sessions[provider] = session
        return session

    async def process(self, qq: CodeRequest):
        self.logger.info(
            "Got Code> from " + qq.user + " using: " + qq.model + " : " + qq.method
        )

        # Get the current date and time
        today = time.asctime()

        # Resolve a code session for the requested provider
        session = self._get_session(qq.model)
        if session is None:
            raise HTTPException(
                status_code=400,
                detail=f"Provider '{qq.model}' has no model capable of coding",
            )

        # Read the code from linked apps server-side (frontend sends app ids).
        context = buildContextFromApps(self.ps3, qq.appIds) if qq.appIds else ""
        instruction = CODE_PROMPTS.get(qq.method, qq.q)
        if context:
            question = (
                "Please carefully read the following code:\n"
                f"<code>\n{context}\n</code>\n{instruction}"
            )
        else:
            question = qq.q

        response = await session.ainvoke(
            {
                "question": question,
                "username": qq.user,
                "location": qq.location,
                "date": today,
            }
        )

        if qq.method == "refactor":
            pattern = r"```(.*?)```"
            code_blocks = re.findall(pattern, response, re.DOTALL)
            code = "".join(code_blocks)
            first_line = code.split("\n")[0]
            # get the language
            language = first_line.strip()
            # Remove the first line
            code = "\n".join(code.split("\n")[1:])
            text_without_code = re.sub(pattern, "", response, flags=re.DOTALL)
            response = text_without_code

            # Propose the answer to the user
            action1 = json.dumps(
                {
                    "type": "create_app",
                    "app": "Stickie",
                    "state": {
                        "text": text_without_code,
                        "fontSize": 16,
                        "color": "purple",
                    },
                    "data": {
                        "title": "Answer",
                        "position": {"x": qq.ctx.pos[0], "y": qq.ctx.pos[1], "z": 0},
                        "size": {"width": 600, "height": 720, "depth": 0},
                    },
                }
            )
            action2 = json.dumps(
                {
                    "type": "create_app",
                    "app": "CodeEditor",
                    "state": {
                        "content": code,
                        "language": language,
                        "fontSize": 18,
                        "readonly": False,
                    },
                    "data": {
                        "title": "Answer",
                        "position": {
                            "x": qq.ctx.pos[0] + 600 + 20,
                            "y": qq.ctx.pos[1],
                            "z": 0,
                        },
                        "size": {"width": 800, "height": 720, "depth": 0},
                    },
                }
            )

            # Build the answer object
            val = Answer(
                id=qq.id,
                r=response,
                actions=[action1, action2],
            )
            return val
        elif qq.method == "comment":
            pattern = r"```(.*?)```"
            code_blocks = re.findall(pattern, response, re.DOTALL)
            code = "".join(code_blocks)
            first_line = code.split("\n")[0]
            # get the language
            language = first_line.strip()
            # Remove the first line
            code = "\n".join(code.split("\n")[1:])
            text_without_code = re.sub(pattern, "", response, flags=re.DOTALL)
            response = text_without_code

            # Propose the answer to the user
            action1 = json.dumps(
                {
                    "type": "create_app",
                    "app": "CodeEditor",
                    "state": {
                        "content": code,
                        "language": language,
                        "fontSize": 18,
                        "readonly": False,
                    },
                    "data": {
                        "title": "Answer",
                        "position": {
                            "x": qq.ctx.pos[0],
                            "y": qq.ctx.pos[1],
                            "z": 0,
                        },
                        "size": {"width": 800, "height": 720, "depth": 0},
                    },
                }
            )
            # Build the answer object
            val = Answer(
                id=qq.id,
                r=response,
                actions=[action1],
            )
            return val
        else:
            # Propose the answer to the user
            action1 = json.dumps(
                {
                    "type": "create_app",
                    "app": "Stickie",
                    "state": {
                        "text": response,
                        "fontSize": 16,
                        "color": "purple",
                    },
                    "data": {
                        "title": "Answer",
                        "position": {"x": qq.ctx.pos[0], "y": qq.ctx.pos[1], "z": 0},
                        "size": {"width": 600, "height": 720, "depth": 0},
                    },
                }
            )
            # Build the answer object
            val = Answer(
                id=qq.id,
                r=response,
                actions=[action1],
            )
            return val
