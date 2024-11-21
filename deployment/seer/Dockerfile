FROM python:3.9

WORKDIR /code

COPY ./seer/requirements.txt /code/requirements.txt

RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt
RUN playwright install chromium
RUN playwright install-deps

COPY ./seer/app /code/app
COPY ./seer/libs/ /code/libs
COPY ./seer/main.py /code

CMD ["fastapi", "run", "main.py", "--proxy-headers", "--port", "9999", "--workers", "4"]
