import requests, os

# server info
web_server = 'http://localhost:3333'
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

def createApp(data):
    """List boards
    """
    head = {'Authorization': 'Bearer {}'.format(token)}
    r = requests.post(web_server + '/api/apps', headers=head, json=data)
    return r.json()
    
def main():
    # connect to the server
    connect()

    # Assets
    createApp( {
        'title': 'A title',
        'roomId': '2106d567-586a-42a7-84d7-45b620153e06',
        'boardId': 'a09d2928-8c1e-4a14-90ed-c96b38c53bcb',
        'position': { 'x': 0, 'y': 0 },
        'size': { 'width': 400, 'height': 200,  },
        'type': 'Stickie',
        'state': { 'text': 'Hello World again', 'color': 'yellow' }
    })

main()
