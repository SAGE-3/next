def run_ai_model_test(model_id, data):
    return {"output": f"Completed running {model_id} with data {data}"}


def handle_ai_calls(model_id, model_url, data):
    import requests
    import json
    headers = {
        'Content-Type': 'application/json'
    }
    payload = json.dumps(data)
    if model_id != "":
        response = requests.request("POST", model_url, headers=headers, data=payload)
        if response.status_code == 200:
            return {"output": response.text}
        else:
            return {"output": ""}
    else:
        raise Exception("model_id not valid")


from funcx.sdk.client import FuncXClient

fxc = FuncXClient()
func_uuid_ai = fxc.register_function(handle_ai_calls, description="Hanlde a SAGE3 app call")

print(func_uuid_ai)