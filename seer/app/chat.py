# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

# Chat Agent

import time, json
from logging import Logger

# Web API
from fastapi import HTTPException

# SAGE3 API
from pysage3.client import PySage3

# AI Models
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

# Typing for RPC
from libs.localtypes import Question, Answer
from libs.utils import getModelsInfo, extract_code_blocks, parse_openai_error
from libs.llm_manager import LLMManager

# AI logging
from libs.ai_logging import ai_logger, LoggingChainHandler

# Handler in Langchain to log the AI prompt
ai_handler = LoggingChainHandler("chat")


class ChatAgent:
    def __init__(
        self,
        logger: Logger,
        ps3: PySage3,
    ):
        logger.info("Initializing ChatAgent")
        self.logger = logger
        self.ps3 = ps3
        self.logger.info("SAGE3 server configuration:")
        # Capability-driven model registry (providers/tasks/settings)
        self.manager = LLMManager(getModelsInfo(ps3), logger)
        self.logger.info("Chat providers: " + ", ".join(self.manager.list_providers()))

        ai_logger.emit(
            "init",
            {
                "agent": "chat",
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
                MessagesPlaceholder("history"),
                ("user", human_template_str),
            ]
        )

        # OutputParser that parses LLMResult into the top likely string.
        # Create a new model by parsing and validating input data from keyword arguments.
        # Raises ValidationError if the input data cannot be parsed to form a valid model.
        self.output_parser = StrOutputParser()

        # Per-provider chat chains, built lazily on first use
        self._sessions = {}

        if not self.manager.list_providers():
            raise HTTPException(status_code=500, detail="Langchain> No model configured")

    def _get_session(self, provider: str):
        """Build (and cache) a prompt|llm|parser chain for a provider's
        chat-capable model. Returns None if the provider can't chat."""
        if provider in self._sessions:
            return self._sessions[provider]
        # 'chat' task needs a chat-capable model
        llm = self.manager.build_chat_model(provider, ["chat"])
        session = (self.prompt | llm | self.output_parser) if llm else None
        self._sessions[provider] = session
        return session

    async def process(self, qq: Question):
        self.logger.info(
            "Got Chat> from " + qq.user + " from:" + qq.location + " using: " + qq.model
        )
        success = True

        # Get the current date and time
        today = time.asctime()

        # Save the ai name for the logs
        ai_handler.setAI(qq.model)

        # Resolve a chat session for the requested provider
        session = self._get_session(qq.model)
        if session is None:
            # Defense in depth: the frontend gates this, but reject clearly here
            raise HTTPException(
                status_code=400,
                detail=f"Provider '{qq.model}' has no model capable of chat",
            )

        # Convert previousQ and previousA arrays to message tuples
        history = []
        for q, a in zip(qq.ctx.previousQ, qq.ctx.previousA):
            history.append(("human", q))
            history.append(("ai", a))
        try:
            response = await session.ainvoke(
                {
                    "history": history,
                    "question": qq.q,
                    "username": qq.user,
                    "location": qq.location,
                    "date": today,
                },
                config={"callbacks": [ai_handler]},
            )
        except Exception as e:
            success = False
            code, message = parse_openai_error(e)
            if code:
                description = f"Error from AI [{qq.model}]: {code}, {message}"
            else:
                description = f"Error from AI [{qq.model}]: {message}"

        if not success:
            return Answer(id=qq.id, r=description, actions=[])
        else:
            # Annotate the answer
            text = response.strip()
            response = text + "\n\n---\n"
            response += "Text generated using an AI model [" + qq.model + "]\n"

            # Propose the answer to the user
            action1 = json.dumps(
                {
                    "type": "create_app",
                    "app": "Stickie",
                    "state": {"text": response, "fontSize": 24, "color": "purple"},
                    "data": {
                        "title": "Answer",
                        "position": {"x": qq.ctx.pos[0], "y": qq.ctx.pos[1], "z": 0},
                        "size": {"width": 400, "height": 720, "depth": 0},
                    },
                }
            )
            actions = [action1]

            # Extract code blocks
            blocks = extract_code_blocks(text)
            for bl in blocks:
                code = bl.get("code")
                lang = bl.get("language")
                if lang == "python":
                    act = json.dumps(
                        {
                            "type": "create_app",
                            "app": "SageCell",
                            "state": {
                                "code": code,
                                "language": "python",
                            },
                            "data": {
                                "title": "Answer",
                                "position": {
                                    "x": qq.ctx.pos[0],
                                    "y": qq.ctx.pos[1],
                                    "z": 0,
                                },
                                "size": {"width": 600, "height": 420, "depth": 0},
                            },
                        }
                    )
                else:
                    act = json.dumps(
                        {
                            "type": "create_app",
                            "app": "CodeEditor",
                            "state": {
                                "content": code,
                                "language": lang if lang else "markdown",
                            },
                            "data": {
                                "title": "Answer",
                                "position": {
                                    "x": qq.ctx.pos[0],
                                    "y": qq.ctx.pos[1],
                                    "z": 0,
                                },
                                "size": {"width": 600, "height": 420, "depth": 0},
                            },
                        }
                    )
                actions.append(act)

            # Build the answer object
            return Answer(
                id=qq.id,
                r=response,
                actions=actions,
            )
