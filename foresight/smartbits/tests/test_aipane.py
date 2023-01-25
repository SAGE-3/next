# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from smartbits.aipane import AIPane
from smartbits.imageviewer import ImageViewer
import pytest
from smartbits.tests.sample_sb_docs import aipane_doc, imageviewer_doc

import uuid
import requests


@pytest.fixture()
def aipane_instance():
    ap = AIPane(**aipane_doc)
    yield ap
    ap._ai_client.clean_up()


@pytest.fixture()
def imageviewer_instance():
    iv = ImageViewer(**imageviewer_doc)
    yield iv
    iv.clean_up()


def test_create_aipane(aipane_instance):
    assert isinstance(aipane_instance, AIPane)
    assert aipane_instance.state.hostedApps == {}
    assert aipane_instance.state.runStatus == 0
    assert aipane_instance.state.supportedTasks == {}
    assert aipane_instance.state.messages == {}


def test_new_app_added(aipane_instance):
    """
    Tests that we can:
    Set supportedApps that correspond to images
    """
    pass
    # imageviewer_instance
    aipane_instance.state.hostedApps = {'3b4aa5ad-e175-47ff-bfb3-f4ffe3a42bcb': 'yolo_2.jpeg'}
    aipane_instance.new_app_added('ImageViewer')
    assert len(set(aipane_instance.state.hostedApps.values())) == 1
    # assert aipane_instance.state.supportedTasks == {'vision': {'Object Detection': ['facebook/detr-resnet-50',
    #                                                                                 'lai_lab/fertilized_egg_detect'],
    #                                                            'Classification': ['image_c_model_1',
    #                                                                               'image_c_model_2']}}


#
def test_get_sharing_url(aipane_instance):
    """
    Tests that we can:
    Generate the public url of assets sent to DropBox

    Don't know how to test function residing outside of AIPane class
    """
    pass
    # public_url = 'http://localhost:3333/api/files/b5c8eeae-f5f5-4365-b025-8503bda6ac9c/84578765-116d-5ccf-8e82-a3ba7a84ad5d'
    # _ = aipane_instance.get_sharing_url(public_url)
    # response = requests.get(_)
    # assert response.status_code == 200




def test_execute_model(aipane_instance):
    """
    Tests that we can:

    """
    pass
    # exec_uuid = str(uuid.uuid4())
    # model = 'facebook/detr-resnet-50'
    # aipane_instance.execute_model(exec_uuid, model)

def test_handle_image_exec_result(aipane_instance):
    """
    Tests that we can:

    """
    pass


    # TODO add test that uplod the the yolo image to a server and test it.
