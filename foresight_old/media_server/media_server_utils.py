#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

# TODO: this function should not

from tusclient import client


def upload_file(local_file_url):
    # http://0.0.0.0:1080/files/
    # TODO: The media sever's url is hardcoded, change to include in config file
    my_client = client.TusClient('http://0.0.0.0:1080/files/',
                                 headers={})
    uploader = my_client.uploader(local_file_url)
    uploader.upload()
    return uploader.url
