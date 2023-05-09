import os
import websocket
import time
import threading
import json
import uuid

def on_message(ws, message):
    # print('Got> message')
    res = json.loads(message)
    if res['success']:
        numrooms = len(res['data'])
        print('    rooms:', numrooms)
        for room in res['data']:
            print('    room:', room['_id'], room['data']['name'])

def on_error(ws, error):
    print(error)

def on_close(ws):
    print("### closed ###")

def on_open(ws):
    def run(*args):
        for i in range(30000):
            time.sleep(1)
        time.sleep(1)
        ws.close()
        print("thread terminating...")

    # get rooms
    messageId = str(uuid.uuid4())
    msg_sub = { 'route': '/api/rooms', 'method': 'GET', 'id': messageId}
    ws.send(json.dumps(msg_sub))

    t= threading.Thread(target=run)
    t.start()


if __name__ == "__main__":
    # websocket.enableTrace(True)
    ws = websocket.WebSocketApp("ws://localhost:3333/api",  header={"Authorization": "Bearer " + os.getenv('TOKEN')},
                                on_message = on_message,
                                on_error = on_error,
                                on_close = on_close)
    ws.on_open = on_open

    ws.run_forever()
