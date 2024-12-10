# python modules
import logging, asyncio
from dotenv import load_dotenv

from libs.localtypes import (
    ImageQuery,
    Question,
    WebQuery,
    PDFQuery,
    CodeRequest,
    WebScreenshot,
    ExportQueryType,
    ExportReturnType
)

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

# AI
from langchain.globals import set_debug, set_verbose

# Modules
from app.chat import ChatAgent
from app.summary import SummaryAgent
from app.web import WebAgent
from app.image import ImageAgent
from app.pdf import PDFAgent
from app.code import CodeAgent
from app.exportAgent import ExportAgent

# Instantiate each module's class
chatAG = ChatAgent(logger, ps3)
codeAG = CodeAgent(logger, ps3)
summaryAG = SummaryAgent(logger, ps3)
imageAG = ImageAgent(logger, ps3)
pdfAG = PDFAgent(logger, ps3)
webAG = WebAgent(logger, ps3)
export_agent = ExportAgent(logger, ps3)
asyncio.ensure_future(webAG.init())

# set to debug the queries into langchain
# set_debug(True)
# set_verbose(True)

# Web server
app = FastAPI(title="Seer", description="A LangChain proxy for SAGE3.", version="0.1.0")

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
    

@app.post("/export/room")
async def export_room(qq: ExportQueryType):
    try:
        data = await export_agent.export_room_data(qq)
        return data
    except HTTPException as e:
        # Get the error message
        text = e.detail
        raise HTTPException(status_code=500, detail=text)

@app.post("/export/board")
async def export_room(qq: ExportQueryType):
    try:
        data = await export_agent.export_board_data(qq)
        return data
    except HTTPException as e:
        # Get the error message
        text = e.detail
        raise HTTPException(status_code=500, detail=text)


if __name__ == "__main__":
    uvicorn.run(
        app, host="127.0.0.1", port=9999, log_level="info", timeout_keep_alive=120
    )
