#!/bin/sh

#fastapi dev main.py --proxy-headers --port 9999
uvicorn main:app --reload --proxy-headers --port 9999
