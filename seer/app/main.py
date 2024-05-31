import os
from typing import Union
from fastapi import FastAPI
from pydantic import BaseModel

# AI
from langchain_huggingface import llms
from langchain_huggingface import HuggingFaceEndpoint
from langchain_core.prompts import PromptTemplate

# Llama3 server at EVL
server = "https://arcade.evl.uic.edu/llama/"

# LLM model using TGI interface
token = os.getenv("HF_TOKEN")
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
    q: str  # question


class Answer(BaseModel):
    q: str  # question
    a: str  # answer


# Web server
app = FastAPI()


# API routes
@app.get("/healthz")
def read_root():
    return {"Hello": "World"}


@app.post("/ask/")
async def ask_question(qq: Question):
    response = await session.ainvoke({"question": qq.q})
    text = response.strip()
    val = Answer(q=qq.q, a=text)
    return val
