# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

import os

prod_type = os.getenv("ENVIRONMENT")

if prod_type is None:
    raise Exception("Cannot find ENVIRONMENT env. variable. Exported?")


if prod_type == "backend":
    server = "host.docker.internal"
elif prod_type == "development" and not os.getenv("SAGE3_SERVER"):
    server = "localhost"
elif prod_type == "production" and not os.getenv("SAGE3_SERVER"):
    server = "host.docker.internal"
else:
    server = os.getenv("SAGE3_SERVER")


config = {
    "production": {
        "seer_server": None,
        "jupyter_server": f"http://{server}:8888",
        "jupyter_ws": f"ws://{server}:8888",
        "redis_server": "redis-server",
        "web_server": f"https://{server}",
        "files_server": f"http://files-server:3002",
        "ws_server": f"wss://{server}",
    },
    "backend": {
        "seer_server": None,
        "jupyter_server": "http://jupyter:8888",
        "jupyter_ws": "ws://jupyter:8888",
        "redis_server": "redis-server",
        "web_server": f"http://{server}:3000",
        "files_server": f"http://{server}:3002",
        "ws_server": f"ws://{server}:3000",
    },
    "development": {
        "seer_server": "http://127.0.0.1:5002",
        "jupyter_server": "http://localhost:8888",
        "jupyter_ws": "ws://localhost:8888",
        "redis_server": "localhost",
        "web_server": f"http://{server}:3000",
        "files_server": f"http://{server}:3002",
        "ws_server": f"ws://{server}:3000",
    },
    "local": {
        "seer_server": "http://127.0.0.1:5002",
        "jupyter_server": "http://localhost:8888",
        "redis_server": "localhost",
        "web_server": f"http://{server}:3000",
        "files_server": f"http://{server}:3002",
        "ws_server": f"ws://{server}:3000",
    },
}

