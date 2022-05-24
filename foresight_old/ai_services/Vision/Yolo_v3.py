#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

import cv2
import numpy as np
import os
import urllib

# TODO: should download ./models/yolov3.weights upon deployment

PATH_MODEL = "/Users/mahdi/Documents/GitHub/smartbits/AI_services/Vision/"


def load_classes(file_path):
    # classes = []
    with open(file_path) as f:
        classes = [line.strip() for line in f.readlines()]
    classes = np.array(classes)
    return classes


def get_resize_img(file_url):
    req = urllib.request.urlopen(file_url)
    arr = np.asarray(bytearray(req.read()), dtype=np.uint8)
    img = cv2.imdecode(arr, -1)
    # img = cv2.imread(file_url)
    img = cv2.resize(img, None, fx=0.4, fy=0.3)
    return img


def compute_cls_ids_boxes_confidences(outs, height, width):
    # Showing info on screen/ get confidence score of algorithm in detecting an object in blob
    class_ids = []
    boxes = []
    confidences = []

    for out in outs:
        for detection in out:
            scores = detection[5:]
            class_id = np.argmax(scores)
            confidence = scores[class_id]
            if confidence > 0.5:
                # object detected
                center_x = int(detection[0] * width)
                center_y = int(detection[1] * height)
                w = int(detection[2] * width)
                h = int(detection[3] * height)

                # cv2.circle(img,(center_x,center_y),10,(0,255,0),2)
                # rectangle co-ordinaters
                x = int(center_x - w / 2)
                y = int(center_y - h / 2)
                # cv2.rectangle(img,(x,y),(x+w,y+h),(0,255,0),2)

                boxes.append([x, y, w, h])  # put all rectangle areas
                confidences.append(
                    float(confidence))  # how confidence was that object detected and show that percentage
                class_ids.append(class_id)  # name of the object tha was detected

    return class_ids, boxes, confidences


def load_model():
    path_weights = os.path.join(PATH_MODEL, "models/yolov3.weights")
    path_cfg = os.path.join(PATH_MODEL, "models/yolov3.cfg")
    path_class_names = os.path.join(PATH_MODEL, "data/coco.names")
    classes = load_classes(path_class_names)
    net = cv2.dnn.readNet(path_weights, path_cfg)
    return net, classes


def get_objects(file_url):
    net, classes = load_model()

    layer_names = net.getLayerNames()
    outputlayers = [layer_names[i[0] - 1] for i in net.getUnconnectedOutLayers()]
    colors = np.random.uniform(0, 255, size=(len(classes), 3))
    img = get_resize_img(file_url)
    height, width, _ = img.shape
    blob = cv2.dnn.blobFromImage(img, 0.00392, (416, 416), (0, 0, 0), True, crop=False)

    net.setInput(blob)
    outs = net.forward(outputlayers)
    class_ids, boxes, confidences = compute_cls_ids_boxes_confidences(outs, height, width)
    indexes = cv2.dnn.NMSBoxes(boxes, confidences, 0.4, 0.6)
    found_objects=[]
    for idx in indexes.reshape(-1):
        found_objects.append({
            "object": classes[np.array(class_ids)[idx]],
            "prob": np.array(confidences)[idx],
            "boundaries": np.array(boxes)[idx].tolist()
        })
    return found_objects

# get_objects("data/giraffe.jpg")
