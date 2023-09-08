#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

import pytest
from foresight.proxy import SAGEProxy
from foresight.utils.sage_communication import SageCommunication
from foresight.config import config as conf, prod_type
from foresight.smartbits.tests.sample_sb_docs import counter_doc, stickie_doc
from foresight.smartbits.counter import Counter
from foresight.smartbits.stickie import Stickie


@ pytest.fixture()
def sage_proxy():
    sc = SageCommunication(conf, prod_type)
    rooms = sc.get_rooms()
    if not rooms:
        assert False
    sp = SAGEProxy(rooms[0]["_id"], conf, prod_type)
    sp.populate_existing()
    if not sp.room.boards:
        assert False

    board_id = list(sp.room.boards.keys())[0]
    counter = Counter(**counter_doc)
    stickie = Stickie(**stickie_doc)
    sp.room.boards[board_id].smartbits[counter.app_id] = counter
    sp.room.boards[board_id].smartbits[stickie.app_id] = stickie
    yield sp



def test_linked_app_default(sage_proxy):
    # tests default function (update_dest_from_src) to
    # update src filed with dest field
    pass



# sage_proxy.register_linked_app(
#         board_id="ad18901e-e128-4997-9c77-99aa6a6ab313",
#         src_app="f1f37163-39ac-47ee-a76f-4fc668c1bb5d",
#         dest_app="26201a49-f87a-4aee-b20e-51f395a867fd",
#         src_field="count",
#         dest_field="text",
#         callback=update_dest_from_src
#         )
