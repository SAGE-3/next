#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

import json
import requests
# import os


class Sage3Communication:
    _instance = None

    @classmethod
    def instance(cls, config_dict=None):
        if cls._instance is None:
            if config_dict is None:
                raise Exception("No valid Sage3Communication config passed")
            cls._instance = cls.__new__(cls)
            cls.__config = config_dict
            cls.board_uuid = cls.__config["board_uuid"]
            cls.__head = {'Authorization': 'Bearer {}'.format(os.getenv('TOKEN'))}

            cls.url = cls.__config["server"] + '/api/boards/act/' + cls.board_uuid
            cls.upload_url = cls.__config["server"] + '/api/boards/upload'
        return cls._instance

    def get_app_data(self, data_uuid):
        response = requests.get(
            self.__config["server"] + f"/api/data/{data_uuid}", headers=self.__head).json()
        return response

    def set_app_state(self, state_uuid, new_attr_vals, state_type):
        # payload = None
        if state_type == 'reducer':
            payload = {'type': 'dispatch-action', 'reference': state_uuid,
                       'action': {'type': "update", **new_attr_vals}}
        elif state_type == 'atom':
            payload = {'type': 'update-data', 'reference': state_uuid,
                       'update': {'data': new_attr_vals}}
        else:
            raise Exception("State not known")
        response = requests.post(
            self.url, headers=self.__head, json=payload)
        return response

    def set_app_attrs_state(self, state_uuid, action_type, new_attr_vals):
        payload = {'type': 'dispatch-action', 'reference': state_uuid,
                   'action': {'type': action_type, **new_attr_vals}}

        response = requests.post(
            self.url, headers=self.__head, json=payload)
        return response

    def send_payload(self, payload):
        response = requests.post(
            self.url, headers=self.__head, json=payload)
        return response

    def updoad_files(self, files, payload):
        payload["boardId"] = self.board_uuid
        # print(f"payload is {payload}")
        # print(f"files is {files}")
        # print(f"self.upload_url is {self.upload_url}")

        response = requests.post(
            self.upload_url, headers=self.__head, files=files, json=payload)
        return response
