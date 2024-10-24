# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

# SummaryAgent

import json, time
from logging import Logger

# SAGE3 API
from foresight.Sage3Sugar.pysage3 import PySage3

# AI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_nvidia_ai_endpoints import ChatNVIDIA

# Typing for RPC
from libs.localtypes import Question, Answer

# Templates
sys_template_str = "Today is {date}. You are a helpful and succinct assistant, providing informative answers to {username} (whose location is {location})."
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


class SummaryAgent:
    def __init__(
        self,
        logger: Logger,
        ps3: PySage3,
    ):
        logger.info("Initializing SummaryAgent")
        self.logger = logger
        self.ps3 = ps3
        # Long context model
        self.llm_llama = ChatNVIDIA(
            base_url="https://arcade.evl.uic.edu/llama31_8bf",
            model="meta/llama-3.1-8b-instruct",
            max_new_tokens=2048,
        )
        self.session = prompt | self.llm_llama | output_parser

    async def process(self, qq: Question):
        self.logger.info(
            "Got summary> from "
            + qq.user
            + " from:"
            + qq.location
            + " using: "
            + qq.model
        )
        # Get the current date and time
        today = time.asctime()

        # Collect all the stickies of the board
        room_id = qq.ctx.roomId
        board_id = qq.ctx.boardId
        applist = self.ps3.get_apps(room_id, board_id)
        whole_text = ""
        for app_id, app in applist.items():
            app_type = app.get("data", {}).get("type", None)
            if app_type == "Stickie":
                text = app.get("data", {}).get("state", {}).get("text")
                whole_text += text + "\n"
                self.logger.info("Stickie> " + text)

        # Build the question
        new_question = (
            "First, summarize the following text concisely and then, offer your opinion on the topics addressed in the text:\n"
            + whole_text
        )

        # Ask the question
        response = await self.session.ainvoke(
            {
                "question": new_question,
                "username": qq.user,
                "location": qq.location,
                "date": today,
            }
        )
        text = response
        # Propose the answer to the user
        action1 = json.dumps(
            {
                "type": "create_app",
                "app": "Stickie",
                "state": {"text": text, "fontSize": 24, "color": "purple"},
                "data": {
                    "title": "Answer",
                    "position": {"x": qq.ctx.pos[0], "y": qq.ctx.pos[1], "z": 0},
                    "size": {"width": 400, "height": 400, "depth": 0},
                },
            }
        )

        # Build the answer object
        val = Answer(
            id=qq.id,
            r=text,
            success=True,
            actions=[action1],
        )
        return val
