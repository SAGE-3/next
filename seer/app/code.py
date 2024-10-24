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
from foresight.Sage3Sugar.pysage3 import PySage3

# AI Models
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_openai import ChatOpenAI

# Typing for RPC
from libs.localtypes import CodeRequest, Context, Question, Answer
from libs.utils import getModelsInfo


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
        models = getModelsInfo(ps3)
        openai = models["openai"]
        llama = models["llama"]
        self.logger.info(
            ("openai key: " + openai["apiKey"] + " - model: " + openai["model"]),
        )
        self.logger.info(
            "chat server: url: " + llama["url"] + " - model: " + llama["model"],
        )

        llm_llama = None
        llm_openai = None

        # Llama model
        if llama["url"] and llama["model"]:
            llm_llama = ChatNVIDIA(
                base_url=llama["url"],
                model=llama["model"],
                stream=False,
                max_tokens=2000,
            )

        # OpenAI model
        if openai["apiKey"] and openai["model"]:
            llm_openai = ChatOpenAI(api_key=openai["apiKey"], model=openai["model"])

        # Templates
        sys_template_str = "Today is {date}. You are a helpful coding assistant, providing informative answers to {username}. When answering code, place the code in a code block."
        human_template_str = "Answer: {question}"

        # For OpenAI / Message API compatible models
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", sys_template_str),
                ("user", human_template_str),
            ]
        )

        # OutputParser that parses LLMResult into the top likely string.
        # Create a new model by parsing and validating input data from keyword arguments.
        # Raises ValidationError if the input data cannot be parsed to form a valid model.
        output_parser = StrOutputParser()

        self.session_llama = None
        self.session_openai = None

        # Session : prompt building and then LLM
        if llm_openai:
            self.session_openai = prompt | llm_openai | output_parser
        if llm_llama:
            self.session_llama = prompt | llm_llama | output_parser

        if not self.session_llama and not self.session_openai:
            raise HTTPException(status_code=500, detail="Langchain> Model unknown")

    async def process(self, qq: CodeRequest):
        self.logger.info(
            "Got Code> from " + qq.user + " using: " + qq.model + " : " + qq.method
        )

        # Get the current date and time
        today = time.asctime()

        # Ask the question
        if qq.model == "llama" and self.session_llama:
            response = await self.session_llama.ainvoke(
                {
                    "question": qq.q,
                    "username": qq.user,
                    "location": qq.location,
                    "date": today,
                }
            )
        elif qq.model == "openai" and self.session_openai:
            response = await self.session_openai.ainvoke(
                {
                    "question": qq.q,
                    "username": qq.user,
                    "location": qq.location,
                    "date": today,
                }
            )
        else:
            raise HTTPException(status_code=500, detail="Langchain> Model unknown")

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
