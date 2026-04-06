# pysage3

Python SDK for [SAGE3](https://sage3.sagecommons.org/) — create and control apps on a SAGE3 board programmatically.

## Installation

```bash
pip install pysage3
```

Or from source:

```bash
git clone https://github.com/SAGE-3/next.git
cd next/pysage3
pip install -e .
```

## Configuration

pysage3 reads connection settings from environment variables:

| Variable | Description |
|---|---|
| `ENVIRONMENT` | `development`, `production`, or `backend` |
| `TOKEN` | JWT bearer token from your SAGE3 server |
| `SAGE3_SERVER` | Hostname of the SAGE3 server (optional, defaults to `localhost`) |

```bash
export ENVIRONMENT=development
export SAGE3_SERVER=localhost
export TOKEN=<your-jwt-token>
```

## Usage

### PySage3 — imperative client API

Connect, query, and control apps directly:

```python
from pysage3 import PySage3
from pysage3.config import config as conf, prod_type

ps3 = PySage3(conf, prod_type)

# List rooms and boards
rooms = ps3.s3_comm.get_rooms()
boards = ps3.s3_comm.get_boards(room_id="<room-id>")

# Get apps on a board
apps = ps3.get_apps(room_id="<room-id>", board_id="<board-id>")

# Create a Stickie note
ps3.create_app(
    room_id="<room-id>",
    board_id="<board-id>",
    app_type="Stickie",
    state={"text": "Hello from pysage3!", "color": "yellow"},
)

# Move an app
smartbits = ps3.get_smartbits(room_id="<room-id>", board_id="<board-id>")
app = smartbits["<app-id>"]
ps3.update_position(app, x=100, y=200)

# Upload a file
with open("data.pdf", "rb") as f:
    ps3.upload_file(room_id="<room-id>", filename="data.pdf", filedata=f)
```

### AsyncSageCommunication — async HTTP client

For use inside FastAPI, Jupyter, or any async context:

```python
import asyncio
from pysage3 import AsyncSageCommunication
from pysage3.config import config as conf, prod_type

async def main():
    async with AsyncSageCommunication(conf, prod_type) as s3:
        rooms = await s3.get_rooms()
        apps = await s3.get_apps(room_id="<room-id>", board_id="<board-id>")
        await s3.create_app({"type": "Stickie", ...})

asyncio.run(main())
```

### SAGEProxy — event-driven daemon

React to real-time changes on a board. Define methods on your SmartBit subclass and the proxy calls them when `executeInfo.executeFunc` is set from the frontend:

```python
from pysage3 import SAGEProxy
from pysage3.config import config as conf, prod_type
import time

proxy = SAGEProxy(conf, prod_type)

# Keep alive — proxy processes WebSocket messages in background thread
while True:
    try:
        time.sleep(10)
    except KeyboardInterrupt:
        proxy.clean_up()
        break
```

### SageCommunication — direct HTTP client

Low-level access to the SAGE3 REST API:

```python
from pysage3 import SageCommunication
from pysage3.config import config as conf, prod_type

s3 = SageCommunication(conf, prod_type)

rooms = s3.get_rooms()
apps = s3.get_apps(room_id="<room-id>")
s3.send_app_update("<app-id>", {"state.text": "updated"})
s3.delete_app("<app-id>")
```

## Supported App Types

SmartBit models exist for the following SAGE3 app types:

| App Type | SmartBit class |
|---|---|
| `Chat` | `ChatSmartBit` |
| `CodeEditor` | `CodeEditorSmartBit` |
| `CSVViewer` | `CSVViewerSmartBit` |
| `ImageViewer` | `ImageViewerSmartBit` |
| `Map` | `MapSmartBit` |
| `PDFViewer` | `PDFViewerSmartBit` |
| `SageCell` | `SageCellSmartBit` |
| `Stickie` | `StickieSmartBit` |
| `VideoViewer` | `VideoViewerSmartBit` |
| `Webview` | `WebviewSmartBit` |

Unknown app types are handled by `GenericSmartBit`.

## Project Structure

```
pysage3/
├── pyproject.toml          # build config, version, dependencies
├── README.md
├── scripts/                # helper scripts for running SAGEProxy as a daemon
└── src/
    └── pysage3/
        ├── __init__.py     # public API exports
        ├── client.py       # PySage3 imperative client
        ├── proxy.py        # SAGEProxy event-driven daemon
        ├── board.py        # Board model
        ├── room.py         # Room model
        ├── config/         # environment-based server config
        ├── smartbits/      # Pydantic models for each app type
        └── utils/          # HTTP client, WebSocket, layout utilities
```
