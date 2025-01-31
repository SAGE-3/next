# Benchmarking users and clients

## User behavior

- Program: 
  - `pointer.js`
  - written in Node.js
- Running
  - `yarn install`

```bash
node pointer.js -b <board_id> -m <room_id> -t <runtime> -r <framerate> -s <server_url> -e <sensitivity> -n

node pointer.js -n -r 10 -s localhost:4200 -b 1596b8c1-cb87-4542-be6b-9dbb1ad952a1 -m bb0507e3-e6a4-40e5-98f9-a4febecc2725 -t 120 -e 10
```



```bash
Usage: pointer [options]

Options:
  -V, --version          output the version number
  -b, --board <s>        board id (string)
  -n, --no-secure        do not use secure connection
  -m, --room <s>         room id (string)
  -t, --timeout <n>      runtime in sec (number) (default: 10)
  -r, --rate <n>         framerate (number) (default: 20)
  -s, --server <s>       Server URL (string) (default: "localhost:3333")
  -e, --sensitivity <n>  sensitivity (number) (default: 5)
  -h, --help             display help for command
```

## Client load

- To simulate multiple clients, we use `Playwright` to run multiple instances of a web client, using an offscreen Chromium browser.
- Program:
  - `web-client.py`
  - written in Python, using Playwright and Chromium browser
  - create a `guest` client (called `fake_###`) and join the board
- Running
  - `pip install pytest-playwright`
  - `playwright install chromium`

```bash
usage: web-client.py [-h] [--link LINK] [--id ID] [--time TIME]

SAGE3 Board client using Playwright

optional arguments:
  -h, --help   show this help message and exit
  --link LINK  Board link
  --id ID      Your ID number
  --time TIME  Runtime in seconds

board=""

python3 web-client.py --id 1 --time 120 --link http://localhost:4200/#/board/1596b8c1-cb87-4542-be6b-9dbb1ad952a1/bb0507e3-e6a4-40e5-98f9-a4febecc2725
```

## Scripts

Launching many instances...

- pointer-dev
- clients-go