from python_on_whales import DockerClient

docker = DockerClient(host="unix:///var/run/docker.sock", compose_files=["./docker-compose-proxy.yml"], compose_project_name="abc")
 
docker.compose.up()

# ekeep track of room
active_room = {}

# Possibly
while True:
    # check for room is created of deleted by comparing against active_room
    # if room is created, then start a new docker instance
    # to handle it
    
    grab room_id = "some room id" from api
    
    write the .env file with ROOM_ID = room_id
    add active room to active_room


    # if room deleted, then kill docker room associated with it
    delete room_id from active_rooms

    # sleep and be nice to the system
    time.sleep(10)
