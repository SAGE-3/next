from dotenv import load_dotenv

# Load the environment variables
load_dotenv()

from foresight.config import config as conf, prod_type
from foresight.Sage3Sugar.pysage3 import PySage3

ps3 = PySage3(conf, prod_type)

appid = "e3fff35f-7045-4252-8869-64fa2131a0c7"
room_id = "15c3379c-93f6-43c8-8810-126a10e70a2f"
board_id = "edb6c280-7d9f-4d03-ad20-e08b53d62bb5"

smartbits = ps3.get_smartbits_by_type("Stickie", room_id, board_id)

for sm in smartbits:
    if sm.app_id == appid:
        print(sm.app_id, sm.data.type, sm.state)
        sm.state.text = "I'm green now"
        sm.state.color = "green"
        sm.send_updates()