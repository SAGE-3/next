# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from smartbits.imageviewer import ImageViewer
import pytest
from smartbits.tests.sample_sb_docs import imageviewer_doc


@pytest.fixture()
def imageviewer_instance():
    c = ImageViewer(**imageviewer_doc)
    yield c


def test_create_imageviewer(imageviewer_instance):
    assert isinstance(imageviewer_instance, ImageViewer)
    assert imageviewer_instance.state.boxes == {}
    assert imageviewer_instance.state.annotations == False


def test_set_bboxes(imageviewer_instance):
    bboxes = {
        '0': {'score': 0.9997177720069884,
              'label': 'dog',
              'box': {'xmin': 109, 'ymin': 186, 'xmax': 260, 'ymax': 454}},
        '1': {'score': 0.9994695782661438,
              'label': 'bicycle',
              'box': {'xmin': 104, 'ymin': 107, 'xmax': 477, 'ymax': 356}},
        '2': {'score': 0.976113736629486,
              'label': 'truck',
              'box': {'xmin': 398, 'ymin': 62, 'xmax': 574, 'ymax': 140}},
        '3': {'score': 0.9076327681541444,
              'label': 'car',
              'box': {'xmin': 398, 'ymin': 63, 'xmax': 573, 'ymax': 139}}
    }
    imageviewer_instance.set_bboxes(bboxes)
    assert imageviewer_instance.state.boxes == bboxes