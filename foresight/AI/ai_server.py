from flask import Flask, jsonify, request

from funcx import FuncXClient


import json

app = Flask(__name__)
app.config.update(json.load(open("config.json")))

# fxc = FuncXClient()

def temp_funcx_exec(data, URL):
    import httpx
    import json

    c= httpx.Client()

    url = "http://0.0.0.0:3000/detection"

    payload = json.dumps({
        "urls": [
            "http://aishelf.org/wp-content/uploads/2021/05/yolo_2.jpg",
            "http://farm4.staticflickr.com/3320/4616410522_373f91ea68_z.jpg"
        ]
    })
    headers = {
        'Content-Type': 'application/json'
    }

    response = c.post(url, headers=headers, data=payload, timeout=None)
    return response.json()


@app.route('/ai', methods=['POST'])
def ai():
    # make sure function above is registered
    # run fucntion on endpoint and grb res_uuid
    # Start co-routing that check whether it completed.
    # when it completed return send the result to the proxy (or exec some call back)
    #fxc.

    # return json.dumps({"status": "SUCCESS"})
