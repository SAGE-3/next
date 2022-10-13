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
    "endpoint_uuid": "4b116d3c-1703-4f8f-9f6f-39921e5864df",
    "test_hello_world_uuid": '3c53e91f-e812-4ec6-97d0-18ce059b3391',
    "ai_func_uuid": '06b3398a-d5e0-43aa-94db-ddecd3b0451b'
}

ai_models = {
    "tasks": {
        "object_detection": {
            "default": "facebook/detr-resnet-50",
            "available_models": [
                "facebook/detr-resnet-50",
                "lai_lab/fertilized_egg_detect"
            ]
        },
        "text_summarization": {
            "default": "facebook/bart-large-cnn",
            "available_models": [
                "facebook/bart-large-cnn",
                "sshleifer/distilbart-cnn-12-6"
            ]
        }
    },

    "urls": {
        "facebook/detr-resnet-50": "https://c54d-2607-f278-410e-5-a098-e976-1200-e118.jp.ngrok.io/detection",
        "lai_lab/fertilized_egg_detect": "SOME-OTHER-URL",
        "facebook/bart-large-cnn": "",
        "sshleifer/distilbart-cnn-12-6": ""
    }
}
