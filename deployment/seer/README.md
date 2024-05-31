# SageConnect

Connecting AI workflows using LangChain, FastAPI and SAGE3.

## Run

- docker run -d --name connect -p 9999:9999 seer 

## Test

- http://localhost:9999/healthz
- http://localhost:9999/ask/
    {q: "hello!"}
    --> {q: "hello!", a: "something"}



