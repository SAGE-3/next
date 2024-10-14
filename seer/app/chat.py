# Chat

import time, json
from logging import Logger

# Web API
from fastapi import HTTPException

# SAGE3 API
from foresight.Sage3Sugar.pysage3 import PySage3

# AI Models
from langchain_huggingface import llms
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from langchain_huggingface import HuggingFaceEndpoint
from langchain_openai import ChatOpenAI

# Typing for RPC
from libs.localtypes import Context, Question, Answer


def getModelsInfo(ps3):
    sage3_config = ps3.s3_comm.web_config
    openai = sage3_config["openai"]
    llama = sage3_config["llama"]
    # Get the value from the SAGE3 server configuration
    chat_server = llama["url"]
    if chat_server[-1] != "/":
        # add the trailing slash
        chat_server += "/"
        llama["url"] = chat_server
    return {"llama": llama, "openai": openai}


class ChatAgent:
    def __init__(
        self,
        logger: Logger,
        ps3: PySage3,
    ):
        logger.info("Initializing ChatAgent")
        self.logger = logger
        self.ps3 = ps3
        sage3_config = self.ps3.s3_comm.web_config
        self.logger.info("SAGE3 server configuration:")
        models = getModelsInfo(ps3)
        openai = models["openai"]
        llama = models["llama"]
        self.logger.info(
            (
                "openai key: "
                + openai["apiKey"]
                + openai["apiKey"]
                + " - model: "
                + openai["model"]
            ),
        )
        self.logger.info(
            "chat server: url: " + llama["url"] + " - model: " + llama["model"],
        )
        # Get the value from the SAGE3 server configuration
        llama_server = llama["url"]

        llm_llama = None
        llm_openai = None

        # LLM model using TGI interface
        if llama["url"] and llama["model"]:
            llm_llama = HuggingFaceEndpoint(
                endpoint_url=llama_server,
                model="",
                # async_client=None,
                # client=None,
                max_new_tokens=2048,
                stop_sequences=[
                    "<|start_header_id|>",
                    "<|end_header_id|>",
                    "<|eot_id|>",
                    "<|reserved_special_token",
                ],
            )

        if openai["apiKey"] and openai["model"]:
            llm_openai = ChatOpenAI(api_key=openai["apiKey"], model=openai["model"])

        # Templates
        sys_template_str = "Today is {date}. You are a helpful and succinct assistant, providing informative answers to {username} (whose location is {location})."
        human_template_str = "Answer: {question}"

        # Prompt template for Llama3
        template = """
          <|begin_of_text|>
          <|start_header_id|>system<|end_header_id|>
          {system_prompt}
          <|eot_id|>
          <|start_header_id|>user<|end_header_id|>
          {user_prompt}
          <|eot_id|>
          <|start_header_id|>assistant<|end_header_id|>
        """
        # Building the template with Llama3 HuggingFace
        llama_prompt = PromptTemplate.from_template(
            template.format(
                system_prompt=sys_template_str, user_prompt=human_template_str
            )
        )

        # For OpenAI / Message API compatible models
        openai_prompt = ChatPromptTemplate.from_messages(
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
            self.session_openai = openai_prompt | llm_openai | output_parser
        if llm_llama:
            self.session_llama = llama_prompt | llm_llama | output_parser

        if not self.session_llama and not self.session_openai:
            raise HTTPException(status_code=500, detail="Langchain> Model unknown")

    async def process(self, qq: Question):
        self.logger.info(
            "Got Chat> from " + qq.user + " from:" + qq.location + " using: " + qq.model
        )

        # Get the current date and time
        today = time.asctime()
        session = None
        # Select the session
        if qq.model == "llama":
            session = self.session_llama
        elif qq.model == "openai":
            session = self.session_openai
        else:
            raise HTTPException(status_code=500, detail="Langchain> Model unknown")

        # Ask the question
        response = await session.ainvoke(
            {
                "question": qq.q,
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
            actions=[action1],
        )
        return val
