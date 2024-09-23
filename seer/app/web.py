# Summary

import json, time
from logging import Logger

# Typing for RPC
from libs.localtypes import WebQuery, WebAnswer

from libs.split_image import split_image_into_tiles

# Playwright
from playwright.async_api import async_playwright

# SAGE3 API
from foresight.Sage3Sugar.pysage3 import PySage3


ww = 1080
hh = 1920


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

        if self.browser is None:
            return WebAnswer(r="Browser not initialized", success=False, actions=[])

        page = await self.browser.new_page(
            viewport={"width": ww, "height": hh}, device_scale_factor=1, is_mobile=True
        )
        site = qq.url  # "https://www.nytimes.com"
        await page.goto(url=site, timeout=5 * 1000)  # wait_until="networkidle")
        title = await page.title()
        self.logger.info("web page title> " + title)
        text = title

        page_text = await page.inner_text("body")
        text += "\n" + page_text
        # await page.screenshot(path="screenshot.jpg", type="jpeg", quality=70)
        await page.close()

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
        val = WebAnswer(
            r=text,
            success=True,
            actions=[action1],
        )
        return val
