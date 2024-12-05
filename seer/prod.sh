#!/bin/sh

fastapi run main.py --proxy-headers --port 9999 --workers 1
