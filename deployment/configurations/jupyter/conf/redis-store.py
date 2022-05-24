import os, sys, redis

if __name__ == "__main__":
    r = redis.Redis(
        host=os.getenv("REDIS_URL"),
        port=os.getenv("REDIS_PORT"))
    # Store the token
    r.set("config:jupyter:token", sys.argv[1]);
    # Store a local host URL
    r.set("config:jupyter:localurl",    'http://127.0.0.1:8888/?token=' + sys.argv[1]);
    # Store a external or docker URL
    r.set("config:jupyter:externalurl", 'http://jupyter-server:8888/?token=' + sys.argv[1]);
