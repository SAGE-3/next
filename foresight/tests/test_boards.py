# import pytest

import sys
sys.path.append('..')

from board import  Board

msg_data = {
    "id": "135de93b-ac21-4c64-9662-70aa26e22884", "name": "BOARD 7", "description": "BOARD 7", "color": "blue",
    "roomId": "97e7f28b-17c4-4380-a4fd-53e8cb854fda", "ownerId": "e08b05fe-f7b4-4fdc-9b3f-869b6147d18d",
    "isPrivate": False
}

def test_create_board():
    b = Board(msg_data)
    assert type(b) == Board
    assert b.id == "135de93b-ac21-4c64-9662-70aa26e22884"
    assert  len(b.smartbits) == 0
