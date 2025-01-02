# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

import asyncio
from urllib.parse import urlparse
from playwright.async_api import async_playwright

width = 2 * 1920
height = 2 * 1080
devicePixelRatio = 2

# board = "https://traoumad.evl.uic.edu/#/enter/c64bee86-1b0b-45aa-a65b-749109234c97/1e3d3cc1-7308-4e98-af4d-1dcff0fc21c6"
# board = "https://minim1.evl.uic.edu/#/enter/521f75cc-0a02-4ae2-8f3f-0b190bc2b1a0/ad1a0e7f-65e4-404b-b777-2740264bd674"
# board = "https://minim1.evl.uic.edu/#/enter/ea45732f-36ce-4cc8-8e07-f6536c4e8779/01dcd06a-0b94-4ba8-a883-0ae976e6e8bc"
board = "https://minim1.evl.uic.edu/#/enter/521f75cc-0a02-4ae2-8f3f-0b190bc2b1a0/aeeb4616-c76d-4ac5-aa36-28f940294713"


async def main():
    await boardScreenshot(board, width, height, devicePixelRatio)


async def boardScreenshot(board_link, ww, hh, dpr):
    """
    Automates a series of actions on a SAGE3 board using Playwright (as a guest user).

    Steps performed:
    1. Launches a headless Chromium browser.
    2. Sets up a browser context with a custom user agent and device scale factor.
    3. Opens a new page and sets the viewport size.
    4. Emulates print media.
    5. Navigates to a specified site and waits for the DOM content to load.
    6. Clicks a button with the text "Login as Guest" and waits for the network to be idle.
    7. Fills in the "username" input field with "Play Wright".
    8. Clicks a button with the text "Create Account".
    9. Waits for the URL to change to a specific pattern and the page to load.
    10. Closes any alert dialog by pressing "Escape".
    11. Waits for 1 second.
    12. Finds all input boxes on the page and fills the one with a specific placeholder with a board link.
    13. Finds all paragraph elements and clicks the one that starts with "Join board".
    14. Confirms the action in the dialog box.
    15. Waits for 2 seconds.
    16. Closes any toast message about using a browser.
    17. Waits for 2 seconds for the board to load.
    18. Prints the title of the page.
    19. Takes a screenshot of the page and saves it as "screenshot.png".
    20. Closes the browser.

    Args:
      site (str): The URL of the site to navigate to.
      ww (int): The width of the viewport.
      hh (int): The height of the viewport.
      board_link (str): The link to join a board.
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(
            user_agent="Playwright", device_scale_factor=dpr
        )
        page = await ctx.new_page()
        await page.set_viewport_size({"width": ww, "height": hh})
        await page.emulate_media(media="print")

        # Get the base URL of the site from the board link
        site = urlparse(board_link)._replace(fragment="").geturl()

        # Navigate to the site
        await page.goto(site, timeout=5 * 1000, wait_until="domcontentloaded")

        button_text = "Login as Guest"
        button = page.locator(f'button:has-text("{button_text}")')
        await button.click()
        await page.wait_for_load_state("networkidle")

        input = page.locator("id=first-name").first
        await input.fill("Play Wright")

        # Clicks a button with the text "Create Account".
        button_text = "Create Account"
        button = page.locator(f'button:has-text("{button_text}")')
        await button.click()

        # Waits for the network to be idle again.
        await page.wait_for_url("**/#/home", timeout=10000, wait_until="load")

        # Remove the dialog box: joyride
        diag = page.get_by_role("alertdialog").first
        if diag:
            await diag.press("Escape")

        # Wait for 2 seconds
        await page.wait_for_timeout(1000)

        # Find all input boxes on the page
        input_boxes = await page.locator("input").all()
        # Find the join board input box
        for input_box in input_boxes:
            placeholder = await input_box.get_attribute("placeholder")
            if placeholder == "Search your rooms, boards, or join board via URL":
                await input_box.fill(board_link)
                # Find all input boxes on the page
                texts = await page.locator("p").all()
                for t in texts:
                    text = await t.text_content()
                    if text and text.startswith("Join board"):
                        print("Join board")
                        await t.click()
                        # Press OK on the dialog box
                        diag = page.get_by_role("dialog").first
                        if diag:
                            await diag.locator("button:has-text('Confirm')").click()

        # Wait for 2 seconds
        await page.wait_for_timeout(2000)

        # Close the toast message about using a browser
        toast = page.locator(".chakra-toast").first
        if toast:
            bts = await toast.locator("button").all()
            for bt in bts:
                aria_label = await bt.get_attribute("aria-label")
                if aria_label == "Close":
                    await bt.click()
                    break

        # Wait for 2 seconds for board to load
        await page.wait_for_timeout(2000)

        # Get the title of the page
        print("title", await page.title())

        # Take a screenshot of the page
        # await page.screenshot(path="screenshot.jpg", type="jpeg", quality=70)
        await page.screenshot(path="screenshot.png", type="png", scale="device")

        # Close the browser
        await browser.close()


asyncio.run(main())
