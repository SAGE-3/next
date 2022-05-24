import os
import json
import asyncio
import aioredis
import uuid, time

# create a UUID for this client
client_id = uuid.uuid4()

env_url = os.environ.get('REDIS_URL')
if env_url:
    redis_url = 'redis://' + env_url
else:
    redis_url = 'redis://localhost'
print("Redis URL:", redis_url)

# Global variable to store the REDIS handle
redis = None

# Get application updates for a board
async def app_updates(channel):
    global redis
    async for ch, message in channel.iter():
        app = ch.decode()
        print("App", app)
        msg = message.decode()
        print("Got application update:", app, ":", msg)
        if msg == "update":
            buf = await redis.execute('JSON.GET', app)
            if buf:
                values = json.loads(buf)
                print(f"-------------------> {values}")
                print("  app update", app, values['id'], values['appName'],
                    'x/y', values['position']['x'], values['position']['y'],
                    'width/height', values['position']['width'], values['position']['height'])
                # send ACK
                redis.publish('client-{}'.format(client_id), 'got it: time {}'.format(time.time()))

# Get the boards updates
async def board_updates(channel):
    global redis
    async for ch, message in channel.iter():
        boardname = message.decode()
        print("Got new board:", ch.decode(), ":", boardname)
        # send ACK
        redis.publish('client-{}'.format(client_id), 'got it: time {}'.format(time.time()))
        # List to app updates for this board
        ch, = await redis.psubscribe('%s:*' % boardname)
        # Task for the new board
        asyncio.get_running_loop().create_task(app_updates(ch))

# Main entry point
async def main():
    global redis
    redis = await aioredis.create_redis_pool(redis_url)

    # Listen to board creations and deletions
    buf = await redis.execute('JSON.GET', 'configuration')
    if buf:
        values = json.loads(buf)
        print("Server configuration", values)
    else:
        print("NO Server configuration")

    # Listen to board creations and deletions
    ch, = await redis.psubscribe('boards:*')

    # Task for board updates
    asyncio.get_running_loop().create_task(board_updates(ch))

    # Get list of current boards
    boards = await redis.smembers('boards')
    print('Existing boards')
    i = 0
    for b in boards:
        boardname = b.decode()
        print('  ', i, boardname)
        # List to app updates for this board
        ch, = await redis.psubscribe('%s:*' % boardname)
        # Task for app updates
        asyncio.get_running_loop().create_task(app_updates(ch))
        i += 1

    # block till the end
    await redis.wait_closed()

# Starting code...
asyncio.run(main())

# app update board0: app-2 {'id': 'app-2', 'appName': 'imageViewer', 
# 'position': {'width': 400, 'height': 400, 'x': 92.9501953125, 'y': 97.087890625}, 
# 'layout': {'type': 'scroll-y', 'state': None}, 
# 'data': {..}
