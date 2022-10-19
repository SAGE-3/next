from smartbits.counter import Counter
import pytest

@pytest.fixture()
def counter_instance():
    doc = {'_id': '524c2a78-392c-43cd-936b-2aba6385822f',
     '_createdAt': 1666059326093,
     '_createdBy': 'f10400c1-c048-46ea-ae50-6e1ea039fc36',
     '_updatedAt': 1666059326093,
     '_updatedBy': 'f10400c1-c048-46ea-ae50-6e1ea039fc36',
     'data': {'name': 'Counter',
              'description': 'Counter',
              'roomId': 'b34cf54e-2f9e-4b9a-a458-27f4b6c658a7',
              'boardId': 'ad18901e-e128-4997-9c77-99aa6a6ab313',
              'position': {'x': 2500773, 'y': 2500385, 'z': 0},
              'size': {'width': 400, 'height': 400, 'depth': 0},
              'rotation': {'x': 0, 'y': 0, 'z': 0},
              'type': 'Counter',
              'ownerId': 'f10400c1-c048-46ea-ae50-6e1ea039fc36',
              'minimized': False,
              'raised': True},
     'state': {'count': 42, 'executeInfo': {'executeFunc': '', 'params': {}}}}
    c = Counter(**doc)
    yield c
    print("cleaning up")
    c._ai_client.stop_thread = True
    c._jupyter_client.stop_thread = True


def test_create_counter(counter_instance):
    assert isinstance(counter_instance, Counter)
    assert counter_instance.state.count == 42

def test_reset_to_zero(counter_instance):
    _ = counter_instance.reset_to_zero()
    assert counter_instance.state.count == 0


