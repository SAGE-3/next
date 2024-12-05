# python modules
import json
import logging, asyncio
from math import e
from dotenv import load_dotenv
from contextlib import asynccontextmanager

from libs.localtypes import (
    ImageQuery,
    Question,
    WebQuery,
    PDFQuery,
    CodeRequest,
    WebScreenshot,
)

# Web API
from fastapi import FastAPI, HTTPException
import uvicorn

load_dotenv()  # take environment variables from .env.
logger = logging.getLogger("uvicorn.error")

# SAGE3 API
from foresight.config import config as conf, prod_type
from foresight.Sage3Sugar.pysage3 import PySage3
from foresight.utils.sage_websocket import SageWebsocket

# AI
from langchain.globals import set_debug, set_verbose

# Modules
from app.chat import ChatAgent
from app.summary import SummaryAgent
from app.web import WebAgent
from app.image import ImageAgent
from app.pdf import PDFAgent
from app.code import CodeAgent

ps3 = None
chatAG = None
codeAG = None
summaryAG = None
imageAG = None
pdfAG = None
webAG = None

# set to debug the queries into langchain
# set_debug(True)
# set_verbose(True)


def process_messages(ws, msg):
    pass
    # message = json.loads(msg)
    # for doc in message["event"]["doc"]:
    #     msg = message.copy()
    #     msg["event"]["doc"] = doc
    #     # End of duplicating messages so old code can work
    #     collection = msg["event"]["col"]
    #     doc = msg["event"]["doc"]
    #     msg_type = msg["event"]["type"]
    #     app_id = doc["_id"]

    #     # It's a create message
    #     if msg_type == "CREATE":
    #         print("CREATE", doc["data"])
    #     # It's a delete message
    #     elif msg_type == "DELETE":
    #         print("DELETE", doc["_id"])
    #     else:
    #         pass


# Initialize the app
# This function is called when the app is started using FastAPI's lifespan context manager
async def applicationInit():
    global ps3, chatAG, codeAG, summaryAG, imageAG, pdfAG, webAG
    # SAGE3 handle
    ps3 = PySage3(conf, prod_type)
    # Instantiate each module's class
    chatAG = ChatAgent(logger, ps3)
    codeAG = CodeAgent(logger, ps3)
    summaryAG = SummaryAgent(logger, ps3)
    imageAG = ImageAgent(logger, ps3)
    pdfAG = PDFAgent(logger, ps3)
    webAG = WebAgent(logger, ps3)
    # asyncio.ensure_future(webAG.init())
    await webAG.init()

    s3 = SageWebsocket(on_message_fn=process_messages)
    s3.subscribe(["/api/assets"])


# Function to be run periodically
async def my_periodic_task():
    while True:
        if ps3:
            logger.info(f"Task is running")
        await asyncio.sleep(30)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Init
    await applicationInit()
    # Start the periodic task
    task = asyncio.create_task(my_periodic_task())
    # Application runs here
    yield
    # Cleanup on shutdown
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        logger.warning("Periodic task cancelled")


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
        if chatAG:
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
        if codeAG:
            val = await codeAG.process(qq)
            return val

    except HTTPException as e:
        # Get the error message
        text = e.detail
        raise HTTPException(status_code=500, detail=text)


# SUMMARY FUNCTION
@app.post("/summary")
async def summary(qq: Question):
    try:
        # do the work
        if summaryAG:
            val = await summaryAG.process(qq)
            return val
    except HTTPException as e:
        # Get the error message
        text = e.detail
        raise HTTPException(status_code=500, detail=text)


@app.post("/image")
async def image(qq: ImageQuery):
    try:
        # do the work
        if imageAG:
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


@app.post("/pdf")
async def pdf(qq: PDFQuery):
    try:
        # do the work
        if pdfAG:
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
        if webAG:
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
        if webAG:
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
