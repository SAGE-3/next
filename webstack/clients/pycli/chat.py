import httpx
import os

# Get the token from the environment
headers = {"Authorization": f"Bearer {os.getenv('TOKEN')}"}
httpx_client = httpx.Client(timeout=None)

server = "https://minim1.evl.uic.edu"
# server = "http://localhost:4200"

LLAMA3_SYSTEM_PROMPT = "You are a helpful assistant, providing informative, conscise and friendly answers to the user in Markdown format. You only return the content relevant to the question."

#### GET SOME ONLINE MODELS
route = "/api/ai/chat_status"
url = f"{server}{route}"
chat_model = None
r = httpx_client.get(url, headers=headers)
if r.status_code == 200:
    models = r.json()["onlineModels"]
    chat_model = models[0]
    if chat_model["model"] == "llama3":
        print(chat_model)
    else:
        print("No llama3 model available")

#### ASK A QUESTION
if chat_model:
    route = "/api/ai/chat"
    url = f"{server}{route}"
    request = "What is the capital of Illinois?"
    # LLAMA3 prompt format
    complete_request = f"<|begin_of_text|><|start_header_id|>system<|end_header_id|> {LLAMA3_SYSTEM_PROMPT} <|eot_id|>\
        <|start_header_id|>user<|end_header_id|> {request} <|eot_id|>\
        <|start_header_id|>assistant<|end_header_id|>"
    payload = {
        "model": chat_model["name"],
        "input": complete_request,
        "max_new_tokens": 300,
    }
    r = httpx_client.post(url, headers=headers, json=payload)
    if r.status_code == 200:
        data = r.json()
        if data["success"]:
            print(request)
            print("-->", data["output"].strip())
    else:
        print(r.status_code, r.text)
