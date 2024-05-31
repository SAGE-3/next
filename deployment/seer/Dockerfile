FROM python:3.9

WORKDIR /code

COPY ./seer/requirements.txt /code/requirements.txt

RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY ./seer/app /code/app

CMD ["fastapi", "run", "app/main.py", "--proxy-headers", "--port", "9999"]
