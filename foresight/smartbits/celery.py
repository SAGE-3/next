from celery import Celery
import os

# import requests, json

prod_type = os.getenv("ENVIRONMENT")
if prod_type is None:
    prod_type = "production"

# Broker is the message queue, backend is the result store

if prod_type == "development":
    app = Celery(
        "smartbits",
        broker="redis://localhost:6379/0",
        backend="redis://localhost:6379/1",
    )
else:
    app = Celery(
        "smartbits",
        broker="redis://redis-server:6379/0",
        backend="redis://redis-server:6379/1",
    )


@app.task
def process(url):
    result = {"result": "success", "data": 42}
    return result


if __name__ == "__main__":
    app.start()
