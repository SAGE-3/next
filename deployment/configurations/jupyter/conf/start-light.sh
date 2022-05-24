#!/bin/sh

# folder shared from the host
cd code

# dependencies
python3 -m pip install -r requirements2.txt

echo "Starting Pyton Code"
# run the code (-u means 'force the stdout and stderr streams to be unbuffered' )
python -u console.py
