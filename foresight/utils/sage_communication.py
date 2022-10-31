import httpx
import os

class Borg:
    _shared_state = {}
    def __init__(self):
        self.__dict__ = self._shared_state





class SageCommunication(Borg):
    # The borg pattern allows us to init the config in the proxy and not have to worry about
    # passing it in the smartbits, i.e. no need to pass it in the smartbis!

    def __init__(self, conf, prod_type):
        Borg.__init__(self)

        self.conf = conf
        self.prod_type = prod_type

        if conf is None:
            raise Exception("confifuration not found")
        self.__headers = {'Authorization': f"Bearer {os.getenv('TOKEN')}"}
        self.httpx_client = httpx.Client()

        # TODO: laod this from config file
        self.routes = {
            "get_rooms": "/api/rooms/",
            "get_apps": "/api/apps/",
            "get_boards": "/api/boards/",
            "send_update": "/api/apps/{}",
            "create_app": "/api/apps/",
            "get_assets": "/api/assets/"
        }

    def send_app_update(self, app_id, data):
        """
        :param app_id:
        :param data: data
        :return:
        """
        print("app update data is")
        print(data)
        print("------------")
        r = self.httpx_client.put(self.conf[self.prod_type]['web_server'] + self.routes["send_update"].format(app_id),
                                   headers=self.__headers,
                                   json=data)
        return r

    def create_app(self, data):
        """
        :param app_id:
        :param data: data
        :return:
        """
        r = self.httpx_client.post(self.conf[self.prod_type]['web_server'] + self.routes["create_app"],
                                   headers=self.__headers,
                                   json=data
                                   )
        return r

    def get_asset(self, asset_id, room_id=None, board_id=None):

        asset = self.get_assets(room_id, board_id, asset_id)
        if asset:
            return asset[0]

    def get_assets(self, room_id=None, board_id=None, asset_id=None):
        url = self.conf[self.prod_type]['web_server']+self.routes["get_assets"]
        if asset_id:
            url += asset_id
        r = self.httpx_client.get(url,headers=self.__headers)
        json_data = r.json()
        data = json_data['data']
        if r.is_success:
            if room_id is not None:
                data = [app for app in data if app["data"]["roomId"] == room_id]
            if board_id is not None:
                data = [app for app in data if app["data"]["boardId"] == board_id]

        return data

    def get_app(self, app_id=None, room_id=None, board_id=None):

        apps = self.get_apps(room_id, board_id, app_id)
        if apps:
            return apps[0]
        else:
            return None

    def get_apps(self, room_id=None, board_id=None, app_id= None):
        """
        list all the rerouces belonging to room_id
        :param room_id: the id of the room to list
        :param room_id:
        :param board_id:
        :return: dict representing the
        """
        url = self.conf[self.prod_type]['web_server'] + self.routes["get_apps"]
        if app_id:
            url += app_id
        r = self.httpx_client.get(url, headers=self.__headers)
        json_data = r.json()
        data = json_data['data']
        if r.is_success:
            if room_id is not None:
                data = [app for app in data if app["data"]["roomId"] == room_id]
            if board_id is not None:
                data = [app for app in data if app["data"]["boardId"] == board_id]

        return data


    def get_rooms(self):
        r = self.httpx_client.get(
            self.conf[self.prod_type]['web_server'] + self.routes["get_rooms"],
            headers=self.__headers
        )
        json_data = r.json()
        # print(json_data)
        data = {}
        if r.is_success:
            data = json_data['data']
        return data


    def get_boards(self, room_id=None):
        """
        list all the rerouces belonging to room_id
        :param room_id: the id of the room to list
        :param room_id:
        :param board_id:
        :return: dict representing the
        """
        r = self.httpx_client.get(self.conf[self.prod_type]['web_server'] + self.routes["get_boards"], headers=self.__headers)
        json_data = r.json()
        data = json_data['data']
        if r.is_success:
            if room_id is not None:
                data = [app for app in data if app["data"]["roomId"] == room_id]

        return data

