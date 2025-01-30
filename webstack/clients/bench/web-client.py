import argparse

from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

# width = 2 * 1920
# height = 2 * 1080
width = 1280
height = 800
headless = True

board = "http://localhost:4200/#/board/1596b8c1-cb87-4542-be6b-9dbb1ad952a1/bb0507e3-e6a4-40e5-98f9-a4febecc2725"


def main(id, runtime):
    boardScreenshot(id, runtime, board, width, height)


def boardScreenshot(id, runtime, board_link, ww, hh):
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

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        page = browser.new_page()

        page.set_viewport_size({"width": ww, "height": hh})
        page.emulate_media(media="print")

        # Get the base URL of the site from the board link
        site = urlparse(board_link)._replace(fragment="").geturl()
        print("site:", site)
        # Navigate to the site
        page.goto(site)

        # Find login
        button_text = "Login as Guest"
        button = page.locator(f'button:has-text("{button_text}")')
        button.click()
        page.wait_for_load_state("networkidle")

        input = page.locator("id=first-name").first
        account_name = "fake_" + str(id)
        input.fill(account_name)

        # Clicks a button with the text "Create Account".
        button_text = "Create Account"
        button = page.locator(f'button:has-text("{button_text}")')
        button.click()

        # Waits for the network to be idle again.
        page.wait_for_url("**/#/home", timeout=10000, wait_until="load")

        # Remove the dialog box: joyride
        diags = page.get_by_role("alertdialog")
        if diags:
            diag = diags.first
            diag.press("Escape")

        # Wait for 2 seconds
        page.wait_for_timeout(2000)

        # Find all input boxes on the page
        input_boxes = page.locator("input").all()
        # Find the join board input box
        for input_box in input_boxes:
            placeholder = input_box.get_attribute("placeholder")
            if placeholder == "Search your rooms, boards, or join board via URL":
                input_box.fill(board_link)
                # Find all input boxes on the page
                texts = page.locator("p").all()
                for t in texts:
                    text = t.text_content()
                    if text and text.startswith("Join board"):
                        print("Join board")
                        t.click()
                        # Press OK on the dialog box
                        diag = page.get_by_role("dialog").first
                        if diag:
                            diag.locator("button:has-text('Confirm')").click()

        # Wait for 2 seconds
        page.wait_for_timeout(2000)

        # Close the toast message about using a browser
        toast = page.locator(".chakra-toast").first
        if toast:
            bts = toast.locator("button").all()
            for bt in bts:
                aria_label = bt.get_attribute("aria-label")
                if aria_label == "Close":
                    bt.click()
                    break

        # Wait for 2 seconds for board to load
        page.wait_for_timeout(runtime * 1000)

        # page.locator("#board").press("Z")
        # page.wait_for_timeout(1000)

        # Take a screenshot of the page
        page.screenshot(path="screenshot.jpg", type="jpeg", quality=70)

        # Close the browser
        browser.close()


parser = argparse.ArgumentParser(description="SAGE3 Board client using Playwright")
parser.add_argument("--id", type=int, help="Your ID number", default=1)
parser.add_argument("--time", type=int, help="Runtime in seconds", default=120)

args = parser.parse_args()
parser.print_help()
print()
print()
print(args)

id = args.id
runtime = args.time

main(id, runtime)
