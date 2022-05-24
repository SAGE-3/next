FROM python:latest

WORKDIR /app

# RUN pip install redis
# RUN pip install fluent-logger
# RUN pip install rejson pytest fluent fluent-logger requests Pillow ipython namesgenerator \
#   tuspy Flask python-magic rq dill opencv-python websockets

COPY setup.py setup.py
COPY requirements.txt requirements.txt
RUN pip install -e .
RUN pip install -r requirements.txt

COPY task_queue task_queue
COPY message_broker message_broker

CMD ["python", "task_queue/taskscheduler.py"]
