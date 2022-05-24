# SAGE3 CLI

## Install

1. yarn
1. goto to step 1

### Dependencies

- "commander": version "^8"
  - command line arguments
- "form-data": "version ^4"
  - build a web form to login as a user
- "socket.io": version "^2"
  - websockets

## Run
 
- node client.js -s http://localhost:3333
- node client.js -s http://localhost:3333 -r /api/boards/
- For JWT, token is loaded from a file, default 'token.json':
  - '{ "token": "xxxxxx" }'

## Usage

node jwt.js -h

Usage: jwt [options]

Options:
  -V, --version     output the version number
  -s, --server <s>  Server URL (string) (default: "http://localhost:3333")
  -f, --file <s>    json token file (string)) (default: "token.json")
  -h, --help        display help for command


# JSON Token - JWT

http://localhost:3333/auth/jwt
Autorization with bearer token with each request
i.e. > headers['Authorization'] = `Bearer ${token}`;


{
    "success": true,
    "message": "logged in!",
    "user": {
        "sub": "renambot@gmail.com",
        "name": "Luc Renambot",
        "admin": true,
        "iat": 1626755069,
        "exp": 1658312669,
        "aud": "sage3.app",
        "iss": "sage3app@gmail.com"
    }
}

