# pysage3 — package internals

This is the `pysage3` Python package. For usage documentation see the [top-level README](../../README.md).

## Structure

| File / Folder | Purpose |
|---|---|
| `__init__.py` | Public API — exports `PySage3`, `SAGEProxy`, `SageCommunication`, `AsyncSageCommunication`, `SmartBit` |
| `client.py` | `PySage3` — imperative client for scripts and notebooks |
| `proxy.py` | `SAGEProxy` — event-driven daemon, dispatches `executeInfo.executeFunc` calls |
| `board.py` | `Board` model — holds SmartBit collection for a board |
| `room.py` | `Room` model — holds Board collection for a room |
| `smartbitfactory.py` | Creates the right SmartBit subclass from a raw app doc |
| `config/` | Environment-based server config (reads `ENVIRONMENT`, `SAGE3_SERVER`, `TOKEN`) |
| `smartbits/` | Pydantic models for each app type |
| `utils/` | HTTP client, async HTTP client, WebSocket, layout algorithms |

## SmartBits

Each file in `smartbits/` is a Pydantic model for one SAGE3 app type. The base class is `SmartBit` in `smartbits/smartbit.py` — it tracks which fields have been modified (`touched` set) so `send_updates()` only sends diffs.

`SageCommunication` is initialized **lazily** via `SmartBit._get_comm()` — it does not connect at import time.

### Adding a new SmartBit

1. Create `smartbits/<apptype_lowercase>.py` with a `<AppType>State` and `<AppType>` class
2. Add the entry to `SmartBitFactory.class_names` in `smartbitfactory.py`

## Async Support

`AsyncSageCommunication` in `utils/sage_communication.py` provides an `httpx.AsyncClient`-based async API covering the most common operations (get rooms/boards/apps/assets, create/update/delete apps). Use it as an async context manager.

## Key Design Decisions

- **Borg pattern** in `SageCommunication` — all instances share state so config is set once by `SAGEProxy` and available to all SmartBits
- **Dirty tracking** in `TrackedBaseModel.__setattr__` — modified fields are added to `touched`; `send_updates()` flushes only those fields
- **`executeInfo` dispatch** in `SAGEProxy.__handle_update` — when the frontend sets `state.executeInfo.executeFunc`, the proxy calls that method by name on the SmartBit instance
