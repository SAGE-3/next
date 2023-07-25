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


def listRooms():
    """List rooms"""
    head = {"Authorization": "Bearer {}".format(token)}
    r = requests.get(web_server + "/api/rooms", headers=head)
    return r


def listBoards():
    """List boards"""
    head = {"Authorization": "Bearer {}".format(token)}
    r = requests.get(web_server + "/api/boards", headers=head)
    return r


def getAppInfo(appId):
    """Get info about an app"""
    head = {"Authorization": "Bearer {}".format(token)}
    r = requests.get(web_server + "/api/apps/" + appId, headers=head)
    return r


def moveApp(appId, x, y):
    """Move an app - change the app values"""
    head = {"Authorization": "Bearer {}".format(token)}
    r = requests.put(
        web_server + "/api/apps/" + appId,
        headers=head,
        json={"position": {"x": x, "y": y, "z": 0}},
    )
    return r


def changeStateCounter(appId, val):
    """Change an app state values"""
    head = {"Authorization": "Bearer {}".format(token)}
    r = requests.put(
        web_server + "/api/apps/" + appId, headers=head, json={"state.count": val}
    )
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


def uploadFile(roomId, filename, fullname, posx, posy, w=400, h=400):
    """Upload a file and open
    boardId: uuid of the board
    filename: name after upload
    fullname: path to the file to read
    posx, posy: position on the board
    openAfterUpload: open app or just do the upload
    """
    # Auth
    headers = {"Authorization": "Bearer {}".format(token)}
    # Extra parameters as data
    payload = {
        # specify target position will open the file, otherwise not
        "room": roomId,
    }
    # Important part
    # building the multi-part upload
    # dict containing 'files' with filename and data
    files = {"files": (filename, open(fullname, "rb"))}
    # POST
    r = requests.post(
        web_server + "/api/assets/upload", headers=headers, files=files, data=payload
    )
    print("Upload>", r)
    return r


async def main():
    connect()

    # Rooms
    result = listRooms()
    jsondata = result.json()
    if jsondata["success"]:
        rooms = jsondata["data"]
        print("Rooms:", rooms)
        room0 = rooms[0]
        print("Going to sub to room", room0["data"]["name"])

    # Boards
    result = listBoards()
    jsondata = result.json()
    if jsondata["success"]:
        boards = jsondata["data"]
        print("Boards:", boards)
        board0 = boards[0]

    print("room0", room0)
    print("board0", board0)
    uploadFile(room0["_id"], "test.jpg", "test.jpg", 200, 200, 400, 400)


if __name__ == "__main__":
    asyncio.run(main())
