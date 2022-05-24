#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

from PIL import Image
import os

def post_finsh_image(file_path, file_ext=None, thumbnait_size=None):

    """Post Process Image Files
    creates a thumnail
    TODO: add logging here
    """

    print(f"print post processing the uploaded image: {file_path}")


    # file_name incudes prefix _ refer to
    path , file_name =  os.path.split(file_path)
    file_name_prefix, inferred_ext  = os.path.splitext(file_name)

    if thumbnait_size is None:
        thumbnait_size = 128, 128

    if file_ext is None:
        if not inferred_ext:
            raise Exception(f"cannot infer file extension for {file_path}")
        else:
            file_ext = inferred_ext

    im = Image.open(file_path)

    # Create a thumbnail
    im.thumbnail(thumbnait_size)
    thumbnail_path = os.path.join(path , file_name_prefix)
    im.save( f"{thumbnail_path}.thumbnail.{file_ext}", file_ext)

    # Run Yolo on image for object tection






def post_finish_work():
    """"
    Does all the work that is common to all the files
    Ex. cleanup, add data to database, etc.
    """
    pass
