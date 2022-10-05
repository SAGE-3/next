import os

prod_type = os.getenv('ENVIRONMENT')
if prod_type is None:
    raise Exception("Cannot find ENVIRONMENT env. variable. Exported?")

if prod_type == 'development' and not os.getenv('SAGE3_SERVER'):
    server = "localhost"
elif prod_type == 'production' and not os.getenv('SAGE3_SERVER'):
    server = "host.docker.internal"
else:
    server = os.getenv('SAGE3_SERVER')


config = {
    "production": {
        "jupyter_server": f"https://{server}:4443",
        "jupyter_ws": f"ws://{server}:4443",
        "redis_server": "redis-server",
        "web_server": f"https://{server}",
        "ws_server": f"wss://{server}",
    },
    "development": {
        "jupyter_server": "http://localhost",
        "jupyter_ws": "ws://localhost",
        "redis_server": "localhost",
        "web_server": f"http://{server}:3333",
        "ws_server": f"ws://{server}:3333",
        "flask_server": "http://127.0.0.1:5000/exec"
    },
    "local": {
        "jupyter_server": 'http://localhost:8888',
        "redis_server": "localhost",
        "web_server": f"http://{server}:3333",
        "ws_server": f"ws://{server}:3333",
    },
    
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0MUBnbWFpbC5jb20iLCJuYW1lIjoidGVzdDEiLCJhZG1pbiI6dHJ1ZSwiaWF0IjoxNjU0NTc2MTM5LCJleHAiOjE2ODYxMzM3MzksImF1ZCI6InNhZ2UzLmFwcCIsImlzcyI6InNhZ2UzYXBwQGdtYWlsLmNvbSJ9.kwQM\
DtdKXqGG9DZU8e4Mq_pC_GKCH-sMEalRcbIth3BeTsQ7apdZUPvZ4kTmgipJSoIUvyr72Z-2qDi3tKNdJB2OCnm8FMSRFWCt9KK6kxT2X8EiFh5f3T6q1cd1tRy-Nla9cF1zvRn1ALAetJRpVLIsH-XV-l4deWhrGfHNexwFLEJbvHb4E4UQtiB1bQZ5HwutztQvJtVOZ80HJxJccn7bjpVo-OdAjNjQjMLbJEGR\
gpJRAhyZaEVDojsiaJOrFtCUC65qvkC0gym-0HDd89Lmc2i54yf6h0Feb96OadeKT2TFjH3Jvi7_r7sTdE7N88oIaN_mQZhKKTUrI7EYTQ"
}

ai_settings = {
    "funcx_endpoint": "503aabe7-223e-4679-bb01-0b0da37c0ae6",
    "tasks": {
        "vision": {
            "supported_apps": ['ImageViewer'],
            "tasks": {
                "Object Detection": {"detr-resnet-50": {"path": "detection",
                                                        "default": True}},
                "Classification": {}
            }
        }
    }
}

funcx = {
    "endpoint_id": "503aabe7-223e-4679-bb01-0b0da37c0ae6",
    "test_ai_func_uuid": "0e7c5056-74cd-402c-80fd-375d2bfe48b0",
    "ai_func_uuid": "ABCD"

}

