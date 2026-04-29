# python modules
import logging, asyncio
from dotenv import load_dotenv
from contextlib import asynccontextmanager

# logging AI prompts
from fluent import sender
from libs.ai_logging import initFluent


from libs.localtypes import (
    ImageQuery,
    Question,
    WebQuery,
    PDFQuery,
    CodeRequest,
    WebScreenshot,
    MesonetQuery,
)

# Web API
from fastapi import FastAPI, HTTPException
import uvicorn

load_dotenv()  # take environment variables from .env.
logger = logging.getLogger("uvicorn.error")

# SAGE3 API
from pysage3.config import config as conf, prod_type
from pysage3.client import PySage3
# Utils
from libs.utils import getModelsInfo

# SAGE3 handle
ps3 = PySage3(conf, prod_type)

# Fluentd logging
initFluent(ps3)

# AI
from langchain.globals import set_debug, set_verbose

# Modules
from app.chat import ChatAgent

# from app.summary import SummaryAgent
from app.web import WebAgent
from app.image import ImageAgent
from app.pdf import PDFAgent
from app.code import CodeAgent
from app.mesonet import MesonetAgent


# Instantiate module handles during FastAPI startup after refreshing server config
chatAG = None
codeAG = None
imageAG = None
mesonetAG = None
pdfAG = None
webAG = None

# Set to debug the queries into langchain
# set_debug(True)
# set_verbose(True)


# Tasks


# Function to be run periodically
# async def my_periodic_task():
#     while True:
#         print("Task is running: number of assets ->", len(ps3.assets))
#         await asyncio.sleep(3)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global chatAG, codeAG, imageAG, mesonetAG, pdfAG, webAG

    logger.info("FastAPI App started")
    web_config = getModelsInfo(ps3)
    logger.info("Fetched API keys and model configuration from SAGE3 server")
    print(web_config)


    chatAG = ChatAgent(logger, ps3)
    codeAG = CodeAgent(logger, ps3)
    imageAG = ImageAgent(logger, ps3)
    mesonetAG = MesonetAgent(logger, ps3)
    pdfAG = PDFAgent(logger, ps3)
    webAG = WebAgent(logger, ps3)

    await webAG.init()
    yield


# Web server
app = FastAPI(
    lifespan=lifespan,
    title="Seer",
    description="A LangChain proxy for SAGE3.",
    version="0.1.0",
)



#
# API routes
#


# STATUS
@app.get("/status")
def read_root():
    logger.info("Status check")
    return {"success": True}


# CHAT QUESTION
@app.post("/ask")
async def ask_question(qq: Question):
    try:
        # do the work
        val = await chatAG.process(qq)
        return val

    except HTTPException as e:
        # Get the error message
        text = e.detail
        raise HTTPException(status_code=500, detail=text)


# CODE QUESTION
@app.post("/code")
async def code_question(qq: CodeRequest):
    try:
        # do the work
        val = await codeAG.process(qq)
        return val

    except HTTPException as e:
        # Get the error message
        text = e.detail
        raise HTTPException(status_code=500, detail=text)


# SUMMARY FUNCTION
# @app.post("/summary")
# async def summary(qq: Question):
#     try:
#         # do the work
#         val = await summaryAG.process(qq)
#         return val
#     except HTTPException as e:
#         # Get the error message
#         text = e.detail
#         raise HTTPException(status_code=500, detail=text)


@app.post("/image")
async def image(qq: ImageQuery):
    try:
        # do the work
        # val = await imageAG.process(qq)
        val = await asyncio.wait_for(imageAG.process(qq), timeout=30)
        return val
    except asyncio.TimeoutError as e:
        print("Timeout error")
        # Get the error message
        text = str(e)
        raise HTTPException(status_code=408, detail=text)
    except HTTPException as e:
        # Get the error message
        text = e.detail
        raise HTTPException(status_code=500, detail=text)


@app.post("/mesonet")
async def mesonet(qq: MesonetQuery):
    print(qq)
    print("Received mesonet ")
    try:
        # do the work
        val = await mesonetAG.process(qq)
        # val = await asyncio.wait_for(processAG.process(qq), timeout=30)
        return val
    except asyncio.TimeoutError as e:
        print("Timeout error")
        # Get the error message
        text = str(e)
        raise HTTPException(status_code=408, detail=text)
    except HTTPException as e:
        # Get the error message
        text = e.detail
        raise HTTPException(status_code=500, detail=text)


@app.post("/pdf")
async def pdf(qq: PDFQuery):
    try:
        # do the work
        val = await pdfAG.process(qq)
        return val
    except HTTPException as e:
        # Get the error message
        text = e.detail
        raise HTTPException(status_code=500, detail=text)


# WEB1 FUNCTION
@app.post("/web")
async def webquery(qq: WebQuery):
    try:
        # do the work
        val = await webAG.process(qq)
        return val
    except HTTPException as e:
        # Get the error message
        text = e.detail
        raise HTTPException(status_code=500, detail=text)


# WEB2 FUNCTION
@app.post("/webshot")
async def webshot(qq: WebScreenshot):
    try:
        # do the work
        val = await webAG.process_screenshot(qq)
        return val
    except HTTPException as e:
        # Get the error message
        text = e.detail
        raise HTTPException(status_code=500, detail=text)


if __name__ == "__main__":
    uvicorn.run(
        app, host="127.0.0.1", port=9999, log_level="info", timeout_keep_alive=120
    )
