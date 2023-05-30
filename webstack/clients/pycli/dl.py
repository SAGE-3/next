import asyncio
from urllib import response
import requests
import uuid


# server info
server = "localhost:3333"
web_server = "http://" + server
socket_server = "ws://" + server
socket_path = "/api"

# Server namespace (get it from your admin)
sage3_namespace = uuid.UUID("150e32f0-62b8-11ed-974d-1b79350be347")

# the asset I want to retrieve (_id, not the filename)
asset_id = "55c5b64e-bdaa-4489-8459-c8f1bf561a1b"

# generate the token
token = uuid.uuid5(sage3_namespace, asset_id)

# public url
url = web_server + "/api/files/" + asset_id + "/" + str(token)
print(url)

r = requests.get(url)

# Default filename
filename = "out.jpg"
# when getting a 'download' from Express, we get the filename in headers
if "Content-Disposition" in r.headers:
    header = r.headers["Content-Disposition"]
    # extract filename from header
    fn = header.split("=")[1]
    # remove quotes
    fn = fn.strip('"')
    if fn:
        filename = fn

with open(filename, "wb") as f:
    f.write(r.content)
    print("saved:", filename)
