#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------


from smartbits.smartbit import SmartBit
import datetime
import random

# decorator to export smartbit actions
from smartbits.utils.smartbits_utils import _action




# # TODO: Better way to do this?
# def _action(func):
#     func.action = True
#     return func

class PostitSmartBit(SmartBit):

    def __init__(self, text, labels= None, topics=None, wall_coordinates=None, redis_client=None):
        if wall_coordinates == None:
            wall_coordinates = (0, 0, 0, 0)
        super().__init__(wall_coordinates, redis_client)

        if labels == None:
             labels = []
        # if topics == None:
        #     topics = []

        self.text = text
        self.labels = labels
        self.topics = topics
        # self.created_date = datetime.datetime.now()
        # self.wall_coordinates = wall_coordinates

    @_action(enqueue=False)
    def update_text(self, new_text):
        self.text = new_text
        params = {"text": new_text}
        return {"channel": "execute:down", "action": "update", "action_results": params}


    @_action(enqueue=False)
    def uppercase(self):
        self.text = self.text.upper()
        params = {"attr_name": "text", "new_attr_value": self.text}
        return {"channel": "execute:up", "smartbit_id": self.smartbit_id, "action": "update_attribute", "action_params": params}

        # params = {"text": self.text}
        # return {"channel": "execute:down", "action": "update_attribute", "action_results": params}

    @_action(enqueue=True)
    def get_topics(self, client_id=None):
        random.seed
        topics = []
        if self.topics is None:
            random.seed(44);
            for i in range(random.randint(0, 3,)):
                topics.append(f"some topics {i}")
        self.topics = topics
        params = {"attr_name": "topics", "new_attr_value": topics}
        return {"channel": "execute:up", "smartbit_id": self.smartbit_id, "action": "update_attribute", "action_params": params}

