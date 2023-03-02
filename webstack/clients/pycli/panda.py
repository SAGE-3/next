import requests, os
import pandas as pd

# server info
web_server = 'https://minim1.evl.uic.edu'
# Auth token
token = os.getenv('TOKEN')


def jwtLogin():
    """Post to login, return user UUID
    """
    head = {'Authorization': 'Bearer {}'.format(token)}
    r = requests.post(web_server + '/auth/jwt', headers=head)
    return r

def listAssets():
    """List boards
    """
    head = {'Authorization': 'Bearer {}'.format(token)}
    r = requests.get(web_server + '/api/assets', headers=head)
    return r.json()

def connect():
    """Connect to the web server
    """
    # JWT login
    r = jwtLogin()
    response = r.json()
    if response['success']:
        user = response['user']
        print('Login> user', user)

def main():
    # connect to the server
    connect()

    # Assets
    jsondata = listAssets()
    if jsondata['success']:
        assets = jsondata['data']
        for item in assets:
            assset_data = item['data']
            if assset_data['originalfilename'] == 'airtravel.csv':
                print('Asset:', assset_data['originalfilename'], assset_data['file'], assset_data['size'], assset_data['mimetype'])
                # the asset I want to retrieve
                asset_id = item['_id']
                # filename
                file = assset_data['file']
                # file url
                url = web_server + "/api/assets/static/" + file
                # auth token
                auth = {'Authorization': 'Bearer {}'.format(token)}
                # panda read the csv file
                frame = pd.read_csv(url, storage_options=auth)
                print('Frame> ', frame)

main()
