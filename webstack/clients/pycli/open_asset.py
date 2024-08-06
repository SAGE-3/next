import asyncio
from urllib import response
import websockets
import requests
import json
import uuid

# pretty print for dictionaries
import pprint

printer = pprint.PrettyPrinter(indent=1, depth=5, width=120, compact=True)

# server info
server = "localhost:3333"
web_server = "http://" + server
socket_server = "ws://" + server
socket_path = "/api"

myID = ""

token = ""
with open("token1.json") as f:
    data = json.load(f)
    token = data["token"]
print("Token:", token)


def jwtLogin():
    """Post to login, return user UUID"""
    head = {"Authorization": "Bearer {}".format(token)}
    r = requests.post(web_server + "/auth/jwt", headers=head)
    return r


def createUser(payload):
    """Create a user"""
    head = {"Authorization": "Bearer {}".format(token)}
    r = requests.post(web_server + "/api/users", headers=head, json=payload)
    return r


def connect():
    """Connect to the web server"""
    # JWT login
    r = jwtLogin()
    response = r.json()
    if response["success"]:
        user = response["user"]
        print("Login> user", user)
        # Create a new user for that token
        u = createUser({"name": user["providerId"], "email": user["providerId"]})
        print("User>", u.json())


def processMessage(msg):
    """Process an update about a board"""
    type = msg["type"]
    collection = msg["col"]
    data = msg["doc"]
    if type == "CREATE":
        print("New> ", collection, data)
    if type == "DEL":
        print("Delete> ", collection, data)
    if type == "UPDATE":
        print("Update> ", collection, data)


async def listAssets():
    """Get the list of assets"""
    head = {"Authorization": "Bearer {}".format(token)}
    r = requests.get(web_server + "/api/assets", headers=head)
    return r.json()


async def createApp(data):
    """Create an app"""
    head = {"Authorization": "Bearer {}".format(token)}
    r = requests.post(web_server + "/api/apps", headers=head, json=data)
    return r.json()


async def main():
    connect()

    room0 = "09d0bfca-8bed-46db-ada0-ef51db62d4d0"
    board0 = "b2a3ab85-7272-4342-9289-08adae026425"

    print("room0", room0)
    print("board0", board0)

    # listBoards: send the message and wait for the response with the same id
    r = await listAssets()
    if r["success"]:
        assets = r["data"]
        # print("Assets>", assets)

        for asset in assets:
            # open the PDFs
            if asset["data"]["mimetype"] == "application/pdf":
                filename = asset["data"]["originalfilename"]
                print("Asset:", asset["data"]["file"], filename)
                state = {
                    "assetid": asset["_id"],
                    "currentPage": 0,
                    "numPages": -1,
                    "displayPages": 1,
                }
                app = await createApp(
                    {
                        "title": filename,
                        "roomId": room0,
                        "boardId": board0,
                        "position": {"x": 1500000, "y": 1500000, "z": 0},
                        "size": {
                            "width": 1280,
                            "height": 720,
                        },
                        "rotation": {"x": 0, "y": 0, "z": 0},
                        "type": "PDFViewer",
                        "state": state,
                        "raised": True,
                    }
                )
                print("App> result", app)


if __name__ == "__main__":
    asyncio.run(main())
