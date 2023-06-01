from celery import Celery
import requests
import json

# Broker is the message queue, backend is the result store
app = Celery(
    "smartbits", broker="redis://localhost:6379/0", backend="redis://localhost:6379/1"
)


@app.task
def process(url):
    result = {"result": "success", "data": 42}
    return result


if __name__ == "__main__":
    app.start()
