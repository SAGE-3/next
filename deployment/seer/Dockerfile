FROM python:3.9-slim AS builder

WORKDIR /code

RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

COPY ./seer/requirements.txt /code/requirements.txt

RUN pip install --no-cache-dir --upgrade --prefix=/install -r /code/requirements.txt

# Stage 2: Final Image
FROM python:3.9-slim

WORKDIR /code

# Debian package
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy only necessary files from the builder
COPY --from=builder /install /usr/local
RUN pip install --no-cache-dir --upgrade --prefix=/install playwright

RUN playwright install chromium
RUN playwright install-deps

COPY ./seer/app /code/app
COPY ./seer/libs/ /code/libs
COPY ./seer/main.py /code

CMD ["fastapi", "run", "main.py", "--proxy-headers", "--port", "9999", "--workers", "4"]
