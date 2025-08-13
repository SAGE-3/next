# python modules
import logging
import asyncio
from typing import Dict, Any
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
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

load_dotenv()  # take environment variables from .env.
logger = logging.getLogger("uvicorn.error")

# SAGE3 API
from foresight.config import config as conf, prod_type
from foresight.Sage3Sugar.pysage3 import PySage3

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

# New multimodal components
from core import MultimodalAgent, MultimodalQuery, LLMResponse

# Global agent instances
agents: Dict[str, Any] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown"""
    # Initialize agents
    logger.info("Initializing agents...")
    agents["chat"] = ChatAgent(logger, ps3)
    agents["code"] = CodeAgent(logger, ps3)
    agents["image"] = ImageAgent(logger, ps3)
    agents["mesonet"] = MesonetAgent(logger, ps3)
    agents["pdf"] = PDFAgent(logger, ps3)
    agents["web"] = WebAgent(logger, ps3)

    # Initialize multimodal agent
    agents["multimodal"] = MultimodalAgent(logger, ps3)

    # Initialize web agent
    await asyncio.ensure_future(agents["web"].init())
    logger.info("All agents initialized successfully")

    yield  # Application runs here

    # Cleanup on shutdown
    logger.info("Shutting down application...")
    # Add any cleanup logic here if needed


# Web server
app = FastAPI(
    lifespan=lifespan,
    title="Seer",
    description="A LangChain proxy for SAGE3.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled exceptions"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error", "success": False},
    )


# Common error handler for agent processing
async def handle_agent_error(agent_name: str, exc: Exception) -> Dict[str, Any]:
    """Common error handler for agent processing errors"""
    if isinstance(exc, HTTPException):
        logger.error(f"{agent_name} agent HTTP error: {exc.detail}")
        raise exc
    else:
        logger.error(f"{agent_name} agent error: {str(exc)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing {agent_name} request: {str(exc)}",
        )


# API routes


@app.get("/status")
async def read_root():
    """Health check endpoint"""
    logger.info("Status check requested")
    return {
        "success": True,
        "status": "healthy",
        "agents": list(agents.keys()),
        "sage3_connected": ps3 is not None,
    }


@app.get("/health")
async def health_check():
    """Detailed health check endpoint"""
    health_status = {
        "success": True,
        "status": "healthy",
        "agents": {},
        "sage3_connection": ps3 is not None,
        "timestamp": asyncio.get_event_loop().time(),
    }

    # Check each agent's health
    for name, agent in agents.items():
        try:
            # Add agent-specific health checks here if available
            health_status["agents"][name] = "healthy"
        except Exception as e:
            health_status["agents"][name] = f"unhealthy: {str(e)}"
            health_status["success"] = False

    return health_status


@app.post("/ask")
async def ask_question(qq: Question):
    """Process chat questions"""
    try:
        val = await agents["chat"].process(qq)
        return val
    except Exception as e:
        await handle_agent_error("chat", e)


@app.post("/code")
async def code_question(qq: CodeRequest):
    """Process code generation requests"""
    try:
        val = await agents["code"].process(qq)
        return val
    except Exception as e:
        await handle_agent_error("code", e)


@app.post("/image")
async def image(qq: ImageQuery):
    """Process image analysis requests"""
    try:
        val = await asyncio.wait_for(agents["image"].process(qq), timeout=30)
        return val
    except asyncio.TimeoutError:
        logger.error("Image processing timeout")
        raise HTTPException(
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            detail="Image processing request timed out",
        )
    except Exception as e:
        await handle_agent_error("image", e)


@app.post("/mesonet")
async def mesonet(qq: MesonetQuery):
    """Process mesonet data requests"""
    logger.info(f"Received mesonet request: {qq.q}")
    try:
        val = await agents["mesonet"].process(qq)
        return val
    except asyncio.TimeoutError:
        logger.error("Mesonet processing timeout")
        raise HTTPException(
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            detail="Mesonet processing request timed out",
        )
    except Exception as e:
        await handle_agent_error("mesonet", e)


@app.post("/pdf")
async def pdf(qq: PDFQuery):
    """Process PDF analysis requests"""
    try:
        val = await agents["pdf"].process(qq)
        return val
    except Exception as e:
        await handle_agent_error("pdf", e)


@app.post("/web")
async def webquery(qq: WebQuery):
    """Process web scraping requests"""
    try:
        val = await agents["web"].process(qq)
        return val
    except Exception as e:
        await handle_agent_error("web", e)


@app.post("/webshot")
async def webshot(qq: WebScreenshot):
    """Process web screenshot requests"""
    try:
        val = await agents["web"].process_screenshot(qq)
        return val
    except Exception as e:
        await handle_agent_error("web", e)


@app.post("/multimodal")
async def multimodal_query(qq: MultimodalQuery):
    """Process multimodal queries combining text, images, PDFs, and code"""
    try:
        response = await agents["multimodal"].process_query(qq)
        return response
    except Exception as e:
        await handle_agent_error("multimodal", e)


@app.get("/multimodal/stats")
async def get_multimodal_stats():
    """Get multimodal system statistics"""
    try:
        stats = await agents["multimodal"].get_stats()
        return {"success": True, "stats": stats}
    except Exception as e:
        logger.error(f"Failed to get multimodal stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get multimodal stats: {str(e)}",
        )


if __name__ == "__main__":
    uvicorn.run(
        app, host="127.0.0.1", port=9999, log_level="info", timeout_keep_alive=120
    )
