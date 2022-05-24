import subprocess
import sys
import secrets
import tempfile
import requests
import time
import json
import os

import redis

import namesgenerator


# TODO: move config information to a config file or changeable on the command line
REDIS_URL= "localhost"
REDIS_PORT= 6379



def get_base_url_port(token):
    """ 
    runs `jupyter notebook list` and captures the token from the command line
    """
    process = subprocess.Popen(["jupyter", "notebook", "list"],
                           stdout=subprocess.PIPE, 
                           stderr=subprocess.PIPE)

    # wait for the process to terminate
    out, err = process.communicate()
    for server in out.decode("utf-8").split("\n")[1:-1]:
        server_base_url, server_token =  server.split()[0].split("?token=")
        if server_token == token:
            return server_base_url
    return None

def create_startup_script(wall_name):
    """
    create the script that will be automatically executed when the wall starts
    TODO: Such a script could be part of the code base so that it's references directly when we start the server
    """

    temp_startup_file =  tempfile.NamedTemporaryFile("w", delete=False)
    print("temp startup script file name is: {}".format(temp_startup_file.name))
    temp_startup_file.write("from smartbits.proxy import Proxy\n")
    temp_startup_file.write("Proxy()\n")
    temp_startup_file.write(f"wall_name = Proxy.instantiate_new_wall({wall_name})\n")
    temp_startup_file.close()
    return temp_startup_file.name



def start_server():

    wall_name = namesgenerator.get_random_name()
    temp_output_file =  tempfile.NamedTemporaryFile("w", delete=False)
    token = secrets.token_hex(6)
    out_file = open("/tmp/jupyter.out","w")

    # Setup env var of path of file to read at startup of any kernel
    startup_file_name = create_startup_script(wall_name)
    os.environ['PYTHONSTARTUP'] = startup_file_name
    
    process = subprocess.Popen([sys.executable,
                                "-c",
                                'import os; os.execvp("jupyter-notebook", ["notebook", "--no-browser", "--NotebookApp.token=\'{}\'"])'.format(token)],
                               stdout=temp_output_file,
                               stderr=temp_output_file)

    
    # get url base and port (we dont' have control over running port)
    # Server can be slow, so try a few times and give it some time too bootup
    base_url= None
    nb_trial =3
    print("starting", end=" ")
    while not base_url:
        base_url = get_base_url_port(token)
        nb_trial -=1
        time.sleep(1)
        print(".", end="")
        if nb_trial == 0:
            break
    print("." * nb_trial)
    if base_url:
        # raise error
        pass 

    # start kernel using jupyter API
    response = requests.post(url = '{}api/kernels?token={}'.format(base_url, token))
    kernel_id = response.json()['id']
    print("jupyter output file (sdtout & stderr logs) is: ", temp_output_file.name)
    # # TODO: move this stuff as part of the instantiate_new
    return json.dumps({"pid": process.pid, "base_url": base_url, "token":token, "kernel_id": kernel_id, "wall_name": wall_name})



def stop_server():
    pass

def display_running_server(redis_instance):
    r = redis.Redis(
        host=REDIS_URL,
        port=REDIS_PORT)
    wall_info = r.get("wall_info")
    # TODO: print information nicely
    print(wall_info)


def check_redis_running(REDIS_URL, REDIS_PORT):
    pass
        



if __name__ == "__main__":
    r = redis.Redis(
        host=REDIS_URL,
        port=REDIS_PORT)
    wall_info = start_server()
    r.set("wall_info", wall_info)
    print(wall_info)
    
    


