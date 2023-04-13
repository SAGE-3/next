from celery import Celery
import requests
import json

# Broker is the message queue, backend is the result store
app = Celery('smartbits', broker='redis://localhost:6379/0', backend='redis://localhost:6379/1')

# BentoML model server
service = "http://pods.evl.uic.edu/audiolizr/process_youtube_url"

@app.task
def process(url):
  r = requests.post(service, json={'url': url})
  result = r.json()
  return result

if __name__ == '__main__':
  app.start()
