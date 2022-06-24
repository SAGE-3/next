import json
import httpx

class SageCommunication:

    def __init__(self, config_file):
        self.__config = json.load(open(config_file))
        self.__headers = {'Authorization': f"Bearer {self.__config['token']}"}
        self.httpx_client = httpx.Client()

        # TODO: laod this from config file
        self.routes = {
            "get_apps": "/api/apps",
            "get_boards": "/api/boards",
            "send_update": "/api/apps/{}"
        }

    def send_update(self, app_id, vals):
        """

        :param app_id:
        :param vals: {"field.name.val": value} ex. {"doc.state.count": 23, doc.position.x = 0}
        :return:
        """
        r =  self.httpx_client.put(self.__config['server'] + self.routes["send_update"].format(app_id),
                                   headers=self.__headers,
                                   json={'state': {'count': new_count}}
                                   )
        return r
    def get_apps(self, room_id=None, board_id=None):
        """
        list all the rerouces belonging to room_id
        :param room_id: the id of the room to list
        :param room_id:
        :param board_id:
        :return: dict representing the
        """

        r = self.httpx_client.get(self.__config['server']+ self.routes["get_apps"], headers=self.__headers)
        json_data = r.json()
        data = json_data['data']
        if r.is_success:
            if room_id is not None:
                data = [app for app in data if app["data"]["roomId"] == room_id]
            if board_id is not None:
                data = [app for app in data if app["data"]["boardId"] == board_id]

        return data


    def get_boards(self, room_id=None):
        """
        list all the rerouces belonging to room_id
        :param room_id: the id of the room to list
        :param room_id:
        :param board_id:
        :return: dict representing the
        """
        r = self.httpx_client.get(self.__config['server']+ self.routes["get_boards"], headers=self.__headers)
        json_data = r.json()
        data = json_data['data']
        if r.is_success:
            if room_id is not None:
                data = [app for app in data if app["data"]["roomId"] == room_id]

        return data
