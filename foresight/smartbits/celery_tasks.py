from celery import Celery
import requests

# Broker is the message queue, backend is the result store
app = Celery('tasks', broker='redis://localhost:6379/0', backend='redis://localhost:6379/1')

service = "http://pods.evl.uic.edu/audiolizr/process_youtube_url"

@app.task
def process(youtube_link):
  r = requests.post(service, json={'url': youtube_link})
  return r.json()

