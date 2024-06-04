import os
import logging
from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv

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

# Llama3 server at EVL
server = "https://arcade.evl.uic.edu/llama/"

# Get the token from the environment (shouln't be needed but a bug in the library)
token = os.getenv("HF_TOKEN")
# LLM model using TGI interface
llm = HuggingFaceEndpoint(
    endpoint_url=server,
    max_new_tokens=2048,
    huggingfacehub_api_token=token,
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
sys_template_str = "You are a helpful and succinct assistant, providing informative answer to the user."
human_template_str = "Answer: {question}"
# Building the template
prompt = PromptTemplate.from_template(
    template.format(system_prompt=sys_template_str, user_prompt=human_template_str)
)

# Session : prompt building and then LLM
session = prompt | llm


# Pydantic models: Question and Answer
class Question(BaseModel):
    ctx: str  # context
    id: str  # question UUID v4
    user: str  # user ID
    q: str  # question


class Answer(BaseModel):
    id: str  # question UUID v4
    r: str  # answer


# Web server
app = FastAPI(title="Seer", description="A LangChain proxy for SAGE3.", version="0.1.0")


# API routes
@app.get("/health")
def read_root():
    logger.info("health check")
    return {"msg": "OK"}


@app.post("/ask")
async def ask_question(qq: Question):
    logger.info("Got question> from " + qq.user + " about:" + qq.q)
    try:
        response = await session.ainvoke({"question": qq.q})
        text = response.strip()
    except:
        text = "I am sorry, I could not answer your question."
    val = Answer(id=qq.id, r=text)
    return val
