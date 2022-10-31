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

if prod_type == 'backend':
    server = "host.docker.internal"

config = {
    "production": {
        "jupyter_server": f"https://{server}:4443",
        "jupyter_ws": f"wss://{server}:4443",
        "redis_server": "redis-server",
        "web_server": f"https://{server}",
        "ws_server": f"wss://{server}",
    },
    "backend": {
        "jupyter_server": "http://jupyter:8888",
        "jupyter_ws": "ws://jupyter:8888",
        "redis_server": "redis-server",
        "web_server": f"http://{server}:3333",
        "ws_server": f"ws://{server}:3333",
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

    # Token should not be stored in code and github
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0MUBnbWFpbC5jb20iLCJuYW1lIjoidGVzdDEiLCJhZG1pbiI6dHJ1ZSwiaWF0IjoxNjU0NTc2MTM5LCJleHAiOjE2ODYxMzM3MzksImF1ZCI6InNhZ2UzLmFwcCIsImlzcyI6InNhZ2UzYXBwQGdtYWlsLmNvbSJ9.kwQM\
DtdKXqGG9DZU8e4Mq_pC_GKCH-sMEalRcbIth3BeTsQ7apdZUPvZ4kTmgipJSoIUvyr72Z-2qDi3tKNdJB2OCnm8FMSRFWCt9KK6kxT2X8EiFh5f3T6q1cd1tRy-Nla9cF1zvRn1ALAetJRpVLIsH-XV-l4deWhrGfHNexwFLEJbvHb4E4UQtiB1bQZ5HwutztQvJtVOZ80HJxJccn7bjpVo-OdAjNjQjMLbJEGR\
gpJRAhyZaEVDojsiaJOrFtCUC65qvkC0gym-0HDd89Lmc2i54yf6h0Feb96OadeKT2TFjH3Jvi7_r7sTdE7N88oIaN_mQZhKKTUrI7EYTQ"
}

ai_settings = {
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
    "endpoint_uuid": "7bd65241-0049-4c0f-b69c-c21f3ef6efe3",
    "funcx_endpoint_lani": "7bd65241-0049-4c0f-b69c-c21f3ef6efe3",
    "test_hello_world_uuid": 'd06d3bb0-a453-4b7c-a3c9-a0285ac1b67d',
    "ai_func_uuid": 'bd725c27-8034-44a8-a761-6a73741f0308',
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
        "facebook/detr-resnet-50": "http://compaasportal.evl.uic.edu/object_detector/detection",
        "lai_lab/fertilized_egg_detect": "SOME-OTHER-URL",
        "facebook/bart-large-cnn": "",
        "sshleifer/distilbart-cnn-12-6": ""
    }
}

# ai_settings = {
#     "vision": {
#         "supported_apps": ['ImageViewer'],
#         "tasks": {
#             "Object Detection": ["image_od_model_1", "image_od_model_2"],
#             "Classification": ["image_c_model_1", "image_c_model_2"]
#         }
#     },
#     "nlp": {
#         "supported_apps": ['PDFViewer', 'Notepad'],
#         "tasks": {
#             "Summarization": ["text_s_model_1", "text_s_model_2", ],
#         }
#     }
# }
