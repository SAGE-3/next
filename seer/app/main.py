# python modules
import os, json, time
import logging
from dotenv import load_dotenv

# Models
from pydantic import BaseModel, Json
from typing import List, Any, NamedTuple

# Web API
from fastapi import FastAPI, HTTPException
import uvicorn

load_dotenv()  # take environment variables from .env.
logger = logging.getLogger("uvicorn.error")

# SAGE3 API
from foresight.config import config as conf, prod_type
from foresight.Sage3Sugar.pysage3 import PySage3

# SAGE3 handle
ps3 = PySage3(conf, prod_type)
sage3_config = ps3.s3_comm.web_config
logger.info("SAGE3 server configuration:")
openai = sage3_config["openai"]
logger.info(
    (
        "openai key: "
        + openai["apiKey"]
        + openai["apiKey"]
        + " - model: "
        + openai["model"]
    ),
)
chat = sage3_config["chat"]
logger.info(
    "chat server: url: " + chat["url"] + " - model: " + chat["model"],
)

# AI
from langchain_huggingface import llms
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain.globals import set_debug, set_verbose
from langchain_core.prompts import ChatPromptTemplate

# Models
from langchain_huggingface import HuggingFaceEndpoint
from langchain_openai import ChatOpenAI
from langchain_nvidia_ai_endpoints import ChatNVIDIA


# set to debug the queries into langchain
# set_debug(True)
# set_verbose(True)

# Llama3 server at EVL
#     "https://arcade.evl.uic.edu/llama/"
# Get the value from the SAGE3 server configuration
chat_server = chat["url"]
if chat_server[-1] != "/":
    # add the trailing slash
    chat_server += "/"

llm_llama = None
llm_openai = None

# LLM model using TGI interface
if chat["url"] and chat["model"]:
    # llm_llama = HuggingFaceEndpoint(
    #     endpoint_url=chat_server,
    #     max_new_tokens=2048,
    #     stop_sequences=[
    #         "<|start_header_id|>",
    #         "<|end_header_id|>",
    #         "<|eot_id|>",
    #         "<|reserved_special_token",
    #     ],
    # )

    # Long context model
    llm_llama = ChatNVIDIA(
        base_url="https://arcade.evl.uic.edu/llama31_8bf/v1",
        model="meta/llama-3.1-8b-instruct",
        max_new_tokens=2048,
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
# prompt = PromptTemplate.from_template(
#     template.format(system_prompt=sys_template_str, user_prompt=human_template_str)
# )

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

session_llama = None
session_openai = None

# Session : prompt building and then LLM
if llm_openai:
    session_openai = prompt | llm_openai | output_parser
if llm_llama:
    session_llama = prompt | llm_llama | output_parser

if not session_llama and not session_openai:
    raise HTTPException(status_code=500, detail="Langchain> Model unknown")

# Pydantic models: Question, Answer, Context


# Previous prompt and position
class Context(NamedTuple):
    prompt: str  # previous prompt
    pos: List[float]  # position in the board
    roomId: str  # room ID
    boardId: str  # board ID


class Question(BaseModel):
    ctx: Context  # context
    id: str  # question UUID v4
    q: str  # question
    user: str  # user name
    location: str  # location
    model: str  # AI model: chat, openai


class Answer(BaseModel):
    id: str  # question UUID v4
    r: str  # answer
    success: bool = True  # success flag
    actions: List[Json]  # actions to be performed


# Web server
app = FastAPI(title="Seer", description="A LangChain proxy for SAGE3.", version="0.1.0")


# API routes
@app.get("/status")
def read_root():
    logger.info("Status check")
    return {"success": True}


@app.post("/ask")
async def ask_question(qq: Question):
    logger.info(
        "Got question> from " + qq.user + " from:" + qq.location + " using: " + qq.model
    )
    try:
        # Get the current date and time
        today = time.asctime()
        session = None
        # Select the session
        if qq.model == "chat":
            session = session_llama
        elif qq.model == "openai":
            session = session_openai
        else:
            raise HTTPException(status_code=500, detail="Langchain> Model unknown")

        # Ask the question
        if session:
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

    except HTTPException as e:
        # Get the error message
        text = e.detail
        raise HTTPException(status_code=500, detail=text)


@app.post("/summary")
async def summary(qq: Question):
    logger.info(
        "Got summary> from " + qq.user + " from:" + qq.location + " using: " + qq.model
    )
    try:
        # Get the current date and time
        today = time.asctime()
        session = None
        # Select the session
        if qq.model == "chat":
            session = session_llama
        elif qq.model == "openai":
            session = session_openai
        else:
            raise HTTPException(status_code=500, detail="Langchain> Model unknown")

        if session:
            # Collect all the stickies of the board
            room_id = qq.ctx.roomId
            board_id = qq.ctx.boardId
            applist = ps3.get_apps(room_id, board_id)
            whole_text = ""
            for app_id, app in applist.items():
                app_type = app.get("data", {}).get("type", None)
                if app_type == "Stickie":
                    text = app.get("data", {}).get("state", {}).get("text")
                    whole_text += text + "\n"
                    logger.info("Stickie> " + text)

            # Build the question
            new_question = (
                "First, summarize the following text concisely and then, offer your opinion on the topics addressed in the text:\n"
                + whole_text
            )

            # Ask the question
            response = await session.ainvoke(
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

    except HTTPException as e:
        # Get the error message
        text = e.detail
        raise HTTPException(status_code=500, detail=text)


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=9999, log_level="info")
