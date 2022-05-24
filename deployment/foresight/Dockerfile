FROM python:3.8-buster

# Install in that directory
WORKDIR /usr/src/app

# Debian package
RUN apt-get update && apt-get install -y exiftool libheif1 && rm -rf /var/lib/apt/lists/*

COPY foresight/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY foresight foresight

ENV INSIDE_DOCKER=1
ENV PYTHONHTTPSVERIFY=0
ENV CURL_CA_BUNDLE=""

WORKDIR /usr/src/app/foresight

CMD [ "ipython", "./proxy.py" ]