# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

import uuid
from typing import List

import httpx
import os

# from utils.sage_websocket import SageWebsocket

import logging

logger = logging.getLogger(__name__)


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
        self.__headers = {"Authorization": f"Bearer {os.getenv('TOKEN')}"}
        self.httpx_client = httpx.Client(timeout=None)

        # TODO: laod this from config file
        self.routes = {
            "get_rooms": "/api/rooms/",
            "get_apps": "/api/apps/",
            "get_boards": "/api/boards/",
            "get_tags": "/api/insight/",
            "get_tag": "/api/insight/{}",
            "send_update": "/api/apps/{}",
            "delete_app": "/api/apps/{}",
            "send_batch_update": "/api/apps/",
            "create_app": "/api/apps/",
            "get_assets": "/api/assets/",
            "get_static_content": "/api/assets/static/",
            "upload_file": "/api/assets/upload",
            "get_time": "/api/time",
            "get_configuration": "/api/configuration",
        }
        self.web_config = self.get_configuration()

    def send_app_update(self, app_id, data):
        """
        :param app_id:
        :param data: data
        :return:
        """
        # print(logging.getLogger().handlers)
        logger.debug(f"sending following update: {data}")
        r = self.httpx_client.put(
            self.conf[self.prod_type]["web_server"]
            + self.routes["send_update"].format(app_id),
            headers=self.__headers,
            json=data,
        )
        # TODO temp fix for this: https://github.com/ipython/ipython/issues/13904
        #  I assume it's an issue with the logging library since we're logging from a thread
        #  will need to replace the print with a better solution
        return r

    def send_app_batch_update(self, data):
        """
        :param app_id:
        :param data: data
        :return:
        """
        # print(logging.getLogger().handlers)
        logger.debug(f"sending following update: {data}")
        route = (
            self.conf[self.prod_type]["web_server"] + self.routes["send_batch_update"]
        )
        r = self.httpx_client.put(route, headers=self.__headers, json=data)
        # TODO temp fix for this: https://github.com/ipython/ipython/issues/13904
        #  I assume it's an issue with the logging library since we're logging from a thread
        #  will need to replace the print with a better solution
        return r

    def create_app(self, data):
        """
        :return:
        """
        r = self.httpx_client.post(
            self.conf[self.prod_type]["web_server"] + self.routes["create_app"],
            headers=self.__headers,
            json=data,
        )
        return r

    def upload_file(self, files, payload):
        """
        :return:
        """
        r = self.httpx_client.post(
            self.conf[self.prod_type]["web_server"] + self.routes["upload_file"],
            headers=self.__headers,
            files=files,
            data=payload,
        )
        return r

    def get_all_smartbits_with_tags(self):
        all_tags = self.get_alltags()
        all_apps = self.get_apps()
        for app in all_apps:
            if app['app_id'] in all_tags:
                app['tags'] = all_tags[app['app_id']]['labels']
            else:
                app['tags'] = []
        all_apps = {x['app_id']: x for x in all_apps}
        return all_apps

    def get_alltags(self):
        """
        :return:
        """
        r = self.httpx_client.get(
            self.conf[self.prod_type]["web_server"] + self.routes["get_tags"],
            headers=self.__headers,
        )
        return r

    def get_tags(self, app_id):
        """
        :return:
        """
        r = self.httpx_client.get(
            self.conf[self.prod_type]["web_server"]
            + self.routes["get_tag"].format(app_id),
            headers=self.__headers,
        )
        return r

    def update_tags(self, app_id, data):
        """
        :return:
        """
        r = self.httpx_client.put(
            self.conf[self.prod_type]["web_server"]
            + self.routes["get_tag"].format(app_id),
            headers=self.__headers,
            json=data,
        )
        return r

    def delete_app(self, app_id):
        r = self.httpx_client.delete(
            self.conf[self.prod_type]["web_server"]
            + self.routes["delete_app"].format(app_id),
            headers=self.__headers,
        )
        return r

    def get_asset(self, asset_id, room_id=None, board_id=None):
        asset = self.get_assets(room_id, board_id, asset_id)
        if asset:
            return asset[0]

    def get_configuration(self):
        r = self.httpx_client.get(
            self.conf[self.prod_type]["web_server"] + self.routes["get_configuration"],
            headers=self.__headers,
        )
        json_data = r.json()
        return json_data

    def format_public_url(self, asset_id):
        web_server = self.conf[self.prod_type]["web_server"]
        sage3_namespace = uuid.UUID(self.web_config["namespace"])
        token = uuid.uuid5(sage3_namespace, asset_id)
        public_url = f"{web_server}/api/files/{asset_id}/{token}"
        return public_url

    def get_pdf_text(self, asset_url, pages: List =None):

        """Get one page for now"""
        file_name = asset_url.split("/")[-1].split(".")[0] + "-text.json"
        url = self.conf[self.prod_type]["web_server"] + self.routes['get_static_content']
        file_url = url + file_name
        res = self.httpx_client.get(file_url, headers=self.__headers)
        if res.is_success:
            if pages is None:
                return res.json()['pages']
            else:
                return [res.json()['pages'][p] for p in pages]
        return None


    def get_assets(self, room_id=None, board_id=None, asset_id=None):
        url = self.conf[self.prod_type]["web_server"] + self.routes["get_assets"]
        if asset_id:
            url += asset_id
        r = self.httpx_client.get(url, headers=self.__headers)
        json_data = r.json()
        data = json_data["data"]
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

    def get_apps(self, room_id=None, board_id=None, app_id=None):
        """
        list all the rerouces belonging to room_id
        :param room_id: the id of the room to list
        :param room_id:
        :param board_id:
        :return: dict representing the
        """
        url = self.conf[self.prod_type]["web_server"] + self.routes["get_apps"]
        if app_id is not None:
            url += app_id
        r = self.httpx_client.get(url, headers=self.__headers)
        json_data = r.json()
        logger.debug(f"received apps info: {json_data}")
        data = json_data["data"]
        if r.is_success:
            if room_id is not None:
                data = [app for app in data if app["data"]["roomId"] == room_id]
            if board_id is not None:
                data = [app for app in data if app["data"]["boardId"] == board_id]

        return data

    def get_rooms(self):
        r = self.httpx_client.get(
            self.conf[self.prod_type]["web_server"] + self.routes["get_rooms"],
            headers=self.__headers,
        )
        json_data = r.json()
        # print(json_data)
        data = {}
        if r.is_success:
            data = json_data["data"]
        return data

    def get_time(self):
        r = self.httpx_client.get(
            self.conf[self.prod_type]["web_server"] + self.routes["get_time"],
            headers=self.__headers,
        )
        json_data = r.json()
        return json_data

    def get_boards(self, room_id=None):
        """
        list all the resources belonging to room_id
        :param room_id: the id of the room to list
        :param room_id:
        :param board_id:
        :return: dict representing the
        """
        r = self.httpx_client.get(
            self.conf[self.prod_type]["web_server"] + self.routes["get_boards"],
            headers=self.__headers,
        )
        json_data = r.json()
        data = json_data["data"]
        if r.is_success:
            if room_id is not None:
                data = [app for app in data if app["data"]["roomId"] == room_id]

        return data

