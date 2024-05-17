import httpx
import os

# Get the token from the environment
headers = {"Authorization": f"Bearer {os.getenv('TOKEN')}"}
httpx_client = httpx.Client(timeout=None)

server = "https://minim1.evl.uic.edu"
# server = "http://localhost:4200"

CODE_LLAMA_SYSTEM_PROMPT = "\nYou are an expert programmer that helps to write python code based on the user request. Don't be too verbose. Return only commented code.\n"

#### GET SOME ONLINE MODELS
route = "/api/ai/code_status"
url = f"{server}{route}"
code_model = None
r = httpx_client.get(url, headers=headers)
if r.status_code == 200:
    models = r.json()["onlineModels"]
    code_model = models[0]
    if code_model:
        print("Model", code_model)
    else:
        print("No code model available")

#### ASK A QUESTION
if code_model:
    route = "/api/ai/code_query"
    url = f"{server}{route}"
    request = "Write a Fibonacci function"
    # CODE_LLAMA prompt format (llama2)
    complete_request = (
        f"[INST] <<SYS>> {CODE_LLAMA_SYSTEM_PROMPT} <</SYS>> {request} [/INST]"
    )

    payload = {
        "model": code_model,
        "input": complete_request,
        "max_new_tokens": 400,
    }
    r = httpx_client.post(url, headers=headers, json=payload)
    if r.status_code == 200:
        data = r.json()
        if data["success"]:
            print(request)
            print("-->", data["output"].strip())
    else:
        print(r.status_code, r.text)
