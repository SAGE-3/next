# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

# Chat Agent

import time, json, uuid
from logging import Logger

# Web API
from fastapi import HTTPException

# SAGE3 API
from foresight.Sage3Sugar.pysage3 import PySage3

# AI Models
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_openai import ChatOpenAI, AzureChatOpenAI

# Typing for RPC
from libs.localtypes import Context, Question, Answer
from libs.utils import getModelsInfo

# AI logging
from libs.ai_logging import ai_logger

from langchain.callbacks.base import AsyncCallbackHandler
from typing import Any, Dict, List, Union


class LoggingHandler(AsyncCallbackHandler):
    def __init__(self):
        super().__init__()
        # Save the human prompt
        self.human = ""

    async def on_chain_start(
        self,
        serialized: Dict[str, Any],
        inputs: Dict[str, Any],
        *,
        run_id: uuid.UUID,
        parent_run_id: Union[uuid.UUID, None] = None,
        tags: Union[List[str], None] = None,
        metadata: Union[Dict[str, Any], None] = None,
        **kwargs: Any,
    ) -> Any:
        if type(inputs) is dict:
            self.human = inputs["question"].strip()
        else:
            if inputs.usage_metadata:
                in_tokens = inputs.usage_metadata.get("input_tokens")
                out_tokens = inputs.usage_metadata.get("output_tokens")
                total_tokens = inputs.usage_metadata.get("total_tokens")
                model = inputs.response_metadata.get("model_name")
                print(
                    f"[AZURE] Prompt: {self.human} - Model: {model} - Input tokens: {in_tokens} - Output tokens: {out_tokens} - Total tokens: {total_tokens}"
                )
                ai_logger.emit(
                    "azure_prompt",
                    {
                        "prompt": self.human,
                        "model": model,
                        "input_tokens": in_tokens,
                        "output_tokens": out_tokens,
                        "total_tokens": total_tokens,
                    },
                )


handler_azure = LoggingHandler()


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
        models = getModelsInfo(ps3)
        openai = models["openai"]
        llama = models["llama"]
        azure = models["azure"]
        self.logger.info(
            ("openai key: " + openai["apiKey"] + " - model: " + openai["model"]),
        )
        self.logger.info(
            "chat server: url: " + llama["url"] + " - model: " + llama["model"],
        )
        self.logger.info(
            "chat server: url: "
            + azure["text"]["url"]
            + " - model: "
            + azure["text"]["model"],
        )

        llm_llama = None
        llm_openai = None
        llm_azure = None

        # Llama model
        if llama["url"] and llama["model"]:
            llm_llama = ChatNVIDIA(
                base_url=llama["url"] + "/v1",
                model=llama["model"],
                stream=False,
                max_tokens=2000,
            )

        # OpenAI model
        if openai["apiKey"] and openai["model"]:
            llm_openai = ChatOpenAI(api_key=openai["apiKey"], model=openai["model"])

        # Azure OpenAI model
        if azure["text"]["apiKey"] and azure["text"]["model"]:
            model = azure["text"]["model"]
            endpoint = azure["text"]["url"]
            credential = azure["text"]["apiKey"]
            api_version = azure["text"]["api_version"]

            llm_azure = AzureChatOpenAI(
                azure_deployment=model,
                api_version=api_version,
                azure_endpoint=endpoint,
                azure_ad_token=credential,
                model=model,
            )

        ai_logger.emit(
            "init",
            {
                "agent": "chat",
                "openai": openai["apiKey"] is not None,
                "llama": llama["url"] is not None,
                "azure": azure["text"]["apiKey"] is not None,
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
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", sys_template_str),
                MessagesPlaceholder("history"),
                ("user", human_template_str),
            ]
        )

        # OutputParser that parses LLMResult into the top likely string.
        # Create a new model by parsing and validating input data from keyword arguments.
        # Raises ValidationError if the input data cannot be parsed to form a valid model.
        output_parser = StrOutputParser()

        self.session_llama = None
        self.session_openai = None
        self.session_azure = None

        # Session : prompt building and then LLM
        if llm_openai:
            self.session_openai = prompt | llm_openai | output_parser
        if llm_llama:
            self.session_llama = prompt | llm_llama | output_parser
        if llm_azure:
            self.session_azure = prompt | llm_azure | output_parser

        if not self.session_llama and not self.session_openai:
            raise HTTPException(status_code=500, detail="Langchain> Model unknown")

    async def process(self, qq: Question):
        self.logger.info(
            "Got Chat> from " + qq.user + " from:" + qq.location + " using: " + qq.model
        )

        # Get the current date and time
        today = time.asctime()

        # Ask the question
        if qq.model == "llama" and self.session_llama:
            response = await self.session_llama.ainvoke(
                {
                    "history": [("human", qq.ctx.previousQ), ("ai", qq.ctx.previousA)],
                    "question": qq.q,
                    "username": qq.user,
                    "location": qq.location,
                    "date": today,
                }
            )
        elif qq.model == "openai" and self.session_openai:
            response = await self.session_openai.ainvoke(
                {
                    "history": [("human", qq.ctx.previousQ), ("ai", qq.ctx.previousA)],
                    "question": qq.q,
                    "username": qq.user,
                    "location": qq.location,
                    "date": today,
                }
            )
        elif qq.model == "azure" and self.session_azure:
            response = await self.session_azure.ainvoke(
                {
                    "history": [("human", qq.ctx.previousQ), ("ai", qq.ctx.previousA)],
                    "question": qq.q,
                    "username": qq.user,
                    "location": qq.location,
                    "date": today,
                },
                config={"callbacks": [handler_azure]},
            )
        else:
            raise HTTPException(status_code=500, detail="Langchain> Model unknown")

        # Annotate the answer
        response = response.strip() + "\n\n---\n"
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

        # Build the answer object
        val = Answer(
            id=qq.id,
            r=response,
            actions=[action1],
        )
        return val
