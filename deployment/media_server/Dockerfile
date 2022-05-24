FROM python:latest

WORKDIR /app

RUN pip install redis
RUN pip install fluent-logger
RUN pip install rejson pytest fluent fluent-logger requests Pillow ipython namesgenerator \
  tuspy Flask python-magic rq dill opencv-python websockets

COPY media_server ./media_server

CMD ["python", "media_server/media_server.py"]
