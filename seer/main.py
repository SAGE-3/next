# python modules
import json, time
import logging
from dotenv import load_dotenv

from localtypes import Context, Question, Answer

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

# Modules
from app.chat import ChatAgent
from app.summary import SummaryAgent


# Instantiate each module's class
chatAG = ChatAgent(logger, ps3)
summaryAG = SummaryAgent(logger, ps3)

# set to debug the queries into langchain
set_debug(True)
set_verbose(True)

# Get the value from the SAGE3 server configuration
chat_server = chat["url"]
if chat_server[-1] != "/":
    # add the trailing slash
    chat_server += "/"

llm_llama = None
llm_openai = None

# LLM model using TGI interface
if chat["url"] and chat["model"]:
    llm_llama = HuggingFaceEndpoint(
        endpoint_url=chat_server,
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
    try:
        # do the work
        val = await summaryAG.process(qq)
        return val
    except HTTPException as e:
        # Get the error message
        text = e.detail
        raise HTTPException(status_code=500, detail=text)


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=9999, log_level="info")
