# python module
import os, json
import logging
from dotenv import load_dotenv

# Models
from pydantic import BaseModel, Json
from typing import List, Any, NamedTuple

# Web API
from fastapi import FastAPI
import uvicorn

load_dotenv()  # take environment variables from .env.
logger = logging.getLogger("uvicorn.error")

# SAGE3 API
from foresight.config import config as conf, prod_type
from foresight.Sage3Sugar.pysage3 import PySage3

# SAGE3 handle
ps3 = PySage3(conf, prod_type)


# AI
from langchain_huggingface import llms
from langchain_huggingface import HuggingFaceEndpoint
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain.globals import set_debug, set_verbose

# set to debug the queries into langchain
# set_debug(True)
# set_verbose(True)

# Llama3 server at EVL
server = "https://arcade.evl.uic.edu/llama/"

# Get the token from the environment (shouln't be needed but a bug in the library)
# token = os.getenv("HF_TOKEN")
# LLM model using TGI interface
llm = HuggingFaceEndpoint(
    endpoint_url=server,
    max_new_tokens=2048,
    # huggingfacehub_api_token=token,
)

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
sys_template_str = "You are a helpful and succinct assistant, providing informative answers to {username} (whose location is {location})."
human_template_str = "Answer: {question}"
# Building the template
prompt = PromptTemplate.from_template(
    template.format(system_prompt=sys_template_str, user_prompt=human_template_str)
)

# OutputParser that parses LLMResult into the top likely string.
# Create a new model by parsing and validating input data from keyword arguments.
# Raises ValidationError if the input data cannot be parsed to form a valid model.
output_parser = StrOutputParser()

# Session : prompt building and then LLM
session = prompt | llm | output_parser

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


class Answer(BaseModel):
    id: str  # question UUID v4
    r: str  # answer
    actions: List[Json]  # actions to be performed


# Web server
app = FastAPI(title="Seer", description="A LangChain proxy for SAGE3.", version="0.1.0")


# API routes
@app.get("/health")
def read_root():
    logger.info("health check")
    return {"msg": "OK"}


@app.post("/ask")
async def ask_question(qq: Question):
    logger.debug("Got question> from " + qq.user + " from:" + qq.location)
    try:
        response = await session.ainvoke(
            {"question": qq.q, "username": qq.user, "location": qq.location}
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
    except:
        text = "I am sorry, I could not answer your question."

    val = Answer(
        id=qq.id,
        r=text,
        actions=[action1],
    )

    return val


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=9999, log_level="info")
