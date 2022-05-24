#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

from smartbits.smartbit import SmartBit
import requests
from io import BytesIO
from PIL import Image
from media_server.media_server_utils import upload_file
from smartbits.utils.smartbits_utils import get_temp_file_name, _action

from ai_services.Vision.Yolo_v3 import get_objects





class ImageSmartBit(SmartBit):

    def __init__(self, fileurl, labels=None, objects=None, wall_coordinates=None, redis_client=False):
        if wall_coordinates == None:
            wall_coordinates = (0, 0, 0, 0)
        super().__init__(wall_coordinates, redis_client)

        if labels == None:
            labels = []
        if objects == None:
            objects = []

        self.fileurl = fileurl
        self.labels = labels
        self.objects = objects
        # self.created_date = datetime.datetime.now()
        self.wall_coordinates = wall_coordinates
        # TODO: validate that the URL is valid
        # try loading image in try, except
        response = requests.get(fileurl)
        self._image = Image.open(BytesIO(response.content))

    def jsonify(self):
        """
        :return:
        """
        # we don't need the image field, in the json version of the object
        # we cannot jsonify the object anyway.
        return SmartBit.jsonify(self, ignore=['_image'])

    @_action(enqueue=True)
    def get_objects(self):
        found_objects = get_objects(self.fileurl)
        params = {"attr_name": "objects", "new_attr_value": found_objects}
        return {"channel": "execute:up", "smartbit_id": self.smartbit_id, "action": "update_attribute",
                "action_params": params}

    @_action(enqueue=False)
    def convert_bw(self, wall_smartbit_id):
        bw_image = self._image.convert("L")

        f_name = get_temp_file_name(self._image.format)
        bw_image.save(f_name)
        # upload the file to the media server
        file_url = upload_file(f_name)
        # send a request to inform the the server that this image should become its own new smartbit
        params = {
            'smartbit_type': 'ImageSmartBit',
            'smartbit_params':
                {
                    'fileurl': f"{file_url}",
                    'wall_coordinates': [0, 0, 200, 200]
                }
        }
        return {"channel": "execute:up",  "smartbit_id": wall_smartbit_id, "action": "create_new_smartbit", "action_params": params}
