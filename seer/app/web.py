# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------


# WebAgent

import json, time, random
from datetime import datetime
from logging import Logger
import urllib.request

# Web API
from fastapi import HTTPException

# Typing for RPC
from libs.localtypes import WebScreenshot, WebScreenshotAnswer
from libs.localtypes import Context, WebQuery, WebAnswer

# Utils
from libs.split_image import split_image_into_tiles
from libs.utils import getModelsInfo

# Playwright
from playwright.async_api import async_playwright

# SAGE3 API
from foresight.Sage3Sugar.pysage3 import PySage3

# AI
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_openai import ChatOpenAI, AzureChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

# AI logging
from libs.ai_logging import ai_logger, LoggingChainHandler

# Handler in Langchain to log the AI prompt
ai_handler = LoggingChainHandler("web")


ww = 1080
hh = 1920

sys_template_str = """Today is {date}. You are a helpful and succinct assistant, providing informative answers to {username}.
  Always format your responses using valid Markdown syntax. Use appropriate elements like:
  •	# for headings
  •	**bold** or _italic_ for emphasis
  •	`inline code` and code blocks (...) for code
  •	Bullet lists, numbered lists, and links as needed
  If you include code, always wrap it in fenced code blocks with the correct language tag (e.g., ```python). Default to Python if no language is specified. If asked to create plots, please use Matplotlib. .
  If you don't know the answer, say "I don't know" and suggest to search the web."""


class WebAgent:
    def __init__(
        self,
        logger: Logger,
        ps3: PySage3,
    ):
        logger.info("Initializing WebAgent")
        self.logger = logger
        self.ps3 = ps3
        self.browser = None
        models = getModelsInfo(ps3)
        openai = models["openai"]
        llama = models["llama"]
        azure = models["azure"]

        llm_llama = None
        llm_openai = None
        llm_azure = None

        # Llama model
        if llama["url"] and llama["model"]:
            llm_llama = ChatNVIDIA(
                base_url=llama["url"] + "/v1",
                model=llama["model"],
                stream=False,
                max_tokens=2000,
            )

        # OpenAI model
        if openai["apiKey"] and openai["model"]:
            llm_openai = ChatOpenAI(api_key=openai["apiKey"], model=openai["model"])

        # Azure OpenAI model
        if azure["text"]["apiKey"] and azure["text"]["model"]:
            model = azure["text"]["model"]
            endpoint = azure["text"]["url"]
            credential = azure["text"]["apiKey"]
            api_version = azure["text"]["api_version"]

            llm_azure = AzureChatOpenAI(
                azure_deployment=model,
                api_version=api_version,
                azure_endpoint=endpoint,
                azure_ad_token=credential,
                model=model,
            )

        ai_logger.emit(
            "init",
            {
                "agent": "web",
                "openai": openai["apiKey"] is not None,
                "llama": llama["url"] is not None,
                "azure": azure["text"]["apiKey"] is not None,
            },
        )

        # Templates
        human_template_str = "{question}"

        # For OpenAI / Message API compatible models
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", sys_template_str),
                MessagesPlaceholder("history"),
                ("user", "{page}"),
                ("user", human_template_str),
            ]
        )

        # OutputParser that parses LLMResult into the top likely string.
        # Create a new model by parsing and validating input data from keyword arguments.
        # Raises ValidationError if the input data cannot be parsed to form a valid model.
        output_parser = StrOutputParser()

        self.session_llama = None
        self.session_openai = None
        self.session_azure = None

        # Session : prompt building and then LLM
        if llm_openai:
            self.session_openai = prompt | llm_openai | output_parser
        if llm_llama:
            self.session_llama = prompt | llm_llama | output_parser
        if llm_azure:
            self.session_azure = prompt | llm_azure | output_parser

        if not self.session_llama and not self.session_openai:
            raise HTTPException(status_code=500, detail="Langchain> Model unknown")

    async def init(self):
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(headless=True)
        self.logger.info("WebAgent initialized")

    async def shutdown(self):
        self.logger.info("Deleting WebAgent")
        if self.browser:
            await self.browser.close()

    async def process(self, qq: WebQuery):
        self.logger.info("Got web> from " + qq.user + " url: " + qq.url)

        # Get the current date and time
        today = time.asctime()

        if self.browser is None:
            return WebAnswer(r="Browser not initialized", success=False, actions=[])

        # An array of user agent strings for different versions of Chrome on Windows and Mac
        userAgentStrings = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
        ]

        context = await self.browser.new_context(
            user_agent=userAgentStrings[random.randint(0, len(userAgentStrings) - 1)],
            viewport={"width": ww, "height": hh},
            device_scale_factor=1,
            is_mobile=True,
        )
        page = await context.new_page()

        # URL to visit
        site = qq.url
        await page.goto(url=site, timeout=5 * 1000)  # wait_until="networkidle")

        # Get the title of the webpage
        title = await page.title()
        self.logger.info("web page title> " + title)
        # Get the whole text of the webpage
        page_text = await page.inner_text("body")

        # extras: Optional[str]  # extra request data: 'links' | 'text' | 'images' | 'pdfs'
        links = None
        pdfs = None
        if qq.extras == "links":
            # Extract all the links (href attributes) from the page
            links = await page.eval_on_selector_all(
                "a", "elements => elements.map(el => el.href)"
            )
            links = sort_and_remove_duplicate_strings(links)
            self.logger.info("Getting links: " + str(len(links)))
        elif qq.extras == "images":
            self.logger.info("Getting images")
        elif qq.extras == "pdfs":
            # Extract all the links (href attributes) from the page
            pdfs = await page.eval_on_selector_all(
                "a", "elements => elements.map(el => el.href)"
            )
            pdfs = sort_and_remove_duplicate_strings(pdfs)
            pdfs = filter_strings(pdfs, "pdf")
            if len(pdfs) > 0:
                self.logger.info("Getting pdf:" + " ".join(pdfs))

        # Done with the page
        await page.close()
        await context.close()

        # Save the ai name for the logs
        ai_handler.setAI(qq.model)

        # Ask the question
        if qq.model == "llama" and self.session_llama:
            response = await self.session_llama.ainvoke(
                {
                    "history": [("human", qq.ctx.previousQ), ("ai", qq.ctx.previousA)],
                    "page": page_text,
                    "question": qq.q,
                    "username": qq.user,
                    "date": today,
                },
                config={"callbacks": [ai_handler]},
            )
        elif qq.model == "openai" and self.session_openai:
            response = await self.session_openai.ainvoke(
                {
                    "history": [("human", qq.ctx.previousQ), ("ai", qq.ctx.previousA)],
                    "page": page_text,
                    "question": qq.q,
                    "username": qq.user,
                    "date": today,
                },
                config={"callbacks": [ai_handler]},
            )
        elif qq.model == "azure" and self.session_azure:
            response = await self.session_azure.ainvoke(
                {
                    "history": [("human", qq.ctx.previousQ), ("ai", qq.ctx.previousA)],
                    "page": page_text,
                    "question": qq.q,
                    "username": qq.user,
                    "date": today,
                },
                config={"callbacks": [ai_handler]},
            )
        else:
            raise HTTPException(status_code=500, detail="Langchain> Model unknown")

        # Propose the answer to the user
        action1 = json.dumps(
            {
                "type": "create_app",
                "app": "Stickie",
                "state": {"text": response, "fontSize": 24, "color": "purple"},
                "data": {
                    "title": "Answer",
                    "position": {"x": qq.ctx.pos[0], "y": qq.ctx.pos[1], "z": 0},
                    "size": {"width": 400, "height": 400, "depth": 0},
                },
            }
        )
        action2 = None
        if pdfs:
            asset = pdfs[0]
            if asset:
                with urllib.request.urlopen(asset) as f:
                    pdf_data = f.read()
                    # Get the current date and time
                    now = datetime.now()
                    # Format the date and time for the filename
                    filename = now.strftime("_%Y-%m-%d_%H-%M-%S.pdf")
                    # add username to the filename
                    filename = qq.user + filename
                    resp = self.ps3.upload_file(qq.ctx.roomId, filename, pdf_data)
                    if resp and resp.status_code == 200:
                        asset = resp.json()[0]

                        # Propose the answer to the user
                        action2 = json.dumps(
                            {
                                "type": "create_app",
                                "app": "PDFViewer",
                                "state": {"assetid": asset["id"]},
                                "data": {
                                    "title": "Screenshot",
                                    "position": {
                                        "x": qq.ctx.pos[0],
                                        "y": qq.ctx.pos[1],
                                        "z": 0,
                                    },
                                    "size": {
                                        "width": 800,
                                        "height": 1035,
                                        "depth": 0,
                                    },
                                },
                            }
                        )
        elif links:
            action2 = json.dumps(
                {
                    "type": "create_app",
                    "app": "Stickie",
                    "state": {
                        "text": "\n".join(links),
                        "fontSize": 24,
                        "color": "purple",
                    },
                    "data": {
                        "title": "Answer",
                        "position": {
                            "x": qq.ctx.pos[0],
                            "y": qq.ctx.pos[1],
                            "z": 0,
                        },
                        "size": {"width": 400, "height": 400, "depth": 0},
                    },
                }
            )
        # Build the answer object
        if action2:
            val = WebAnswer(
                r=response,
                success=True,
                actions=[action1, action2],
            )
        else:
            val = WebAnswer(
                r=response,
                success=True,
                actions=[action1],
            )
        return val

    async def process_screenshot(self, qq: WebScreenshot):
        self.logger.info("Got webshot> from " + qq.user + " url: " + qq.url)

        if self.browser is None:
            return WebAnswer(r="Browser not initialized", success=False, actions=[])

        page = await self.browser.new_page(
            viewport={"width": ww, "height": hh}, device_scale_factor=1, is_mobile=True
        )
        site = qq.url
        await page.goto(url=site, timeout=10 * 1000, wait_until="networkidle")
        title = await page.title()
        self.logger.info("web page title> " + title)
        text = title

        scroll_height = await page.evaluate("document.documentElement.scrollHeight")
        page_height = min(1920 * 10, scroll_height)
        aspect_ratio = ww / page_height
        filename = "screenshot.jpg"
        await page.screenshot(
            path=filename,
            type="jpeg",
            full_page=True,
            quality=70,
            clip={"x": 0, "y": 0, "width": ww, "height": page_height},
        )
        await page.close()

        # Upload the file to the room
        action1 = None
        if page_height > 1920:
            size = split_image_into_tiles(
                filename,
                tile_height=hh,
                output_path="tiled_image.jpg",
            )
            filename = "tiled_image.jpg"
            aspect_ratio = size[0] / size[1]
        with open(filename, "rb") as f:
            filedata = f.read()
            r = self.ps3.upload_file(qq.ctx.roomId, "screenshot.jpg", filedata)
            if r and r.status_code == 200:
                # Get the asset id from the response
                asset = r.json()[0]
                # Propose the answer to the user
                action1 = json.dumps(
                    {
                        "type": "create_app",
                        "app": "ImageViewer",
                        "state": {"assetid": asset},
                        "data": {
                            "title": "Screenshot",
                            "position": {
                                "x": qq.ctx.pos[0],
                                "y": qq.ctx.pos[1],
                                "z": 0,
                            },
                            "size": {
                                "width": 600 * aspect_ratio,
                                "height": 600,
                                "depth": 0,
                            },
                        },
                    }
                )

        # Build the answer object
        val = WebScreenshotAnswer(
            r=text,
            success=True,
            actions=[action1],
        )
        return val


#
# Utility functions
#


def sort_and_remove_duplicate_strings(arr):
    """
    Removes duplicates from the input list and sorts the resulting list.

    Args:
      arr (list): The list of elements to be processed.

    Returns:
      list: A sorted list with duplicates removed.
    """
    # Remove duplicates by converting to a set and back to list
    arr = list(set(arr))
    # Sort the list
    arr.sort()
    return arr


def filter_strings(arr, keyword):
    """
    Filters strings from the input list that contain the specified keyword.

    Args:
      arr (list of str): The list of strings to be filtered.
      keyword (str): The keyword to filter the list.

    Returns:
      list of str: A list of strings that contain the keyword.
    """
    filtered_arr = [string for string in arr if keyword in string]
    return filtered_arr
