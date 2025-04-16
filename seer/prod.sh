#!/bin/sh

#fastapi run main.py --proxy-headers --port 9999 --workers 4
uvicorn main:app --proxy-headers --port 9999 --workers 4
