# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

# Image
import re
from PIL import Image
from io import BytesIO
import base64


def getModelsInfo(ps3):
    """
    Retrieves LLM models information from SAGE3 server.

    Args:
      ps3: SAGE3 API handle.

    Returns:
      dict: A dictionary containing the "llama" and "openai" model information.
    """
    sage3_config = ps3.s3_comm.web_config
    openai = sage3_config["openai"]
    llama = sage3_config["llama"]
    return {"llama": llama, "openai": openai}


def getPDFFile(ps3, assetid):
    """
    Retrieve a PDF file from the SAGE3 basset manager based on the provided asset ID.

    Args:
      ps3 (object): SAGE3 API handle.
      assetid (str): The unique identifier of the asset to retrieve.

    Returns:
      bytes: The content of the PDF file if found and successfully downloaded.
      None: If the asset is not found or the download fails.
    """
    # Get all the assets
    assets = ps3.s3_comm.get_assets()
    # Find the asset in question
    for f in assets:
        if f["_id"] == assetid:
            asset = f["data"]
            # Build the URL
            url = (
                ps3.s3_comm.conf[ps3.s3_comm.prod_type]["web_server"]
                + ps3.s3_comm.routes["get_static_content"]
                + asset["file"]
            )
            # Get the authorization headers
            headers = ps3.s3_comm._SageCommunication__headers
            # Download the PDF
            r = ps3.s3_comm.httpx_client.get(url, headers=headers)
            if r.is_success:
                return r.content
    return None


def getImageFile(ps3, assetid):
    """
    Retrieve the image file content from the SAGE3 server based on the provided asset ID.

    Args:
      ps3 (object): SAGE3 API handle.
      assetid (str): The unique identifier of the asset to retrieve.

    Returns:
      bytes: The content of the image file if found and successfully downloaded.
      None: If the asset is not found or the download fails.
    """
    # Get all the assets
    assets = ps3.s3_comm.get_assets()
    # Find the asset in question
    for f in assets:
        if f["_id"] == assetid:
            asset = f["data"]
            url = (
                ps3.s3_comm.conf[ps3.s3_comm.prod_type]["web_server"]
                + ps3.s3_comm.routes["get_static_content"]
                + asset["file"]
            )
            headers = ps3.s3_comm._SageCommunication__headers
            r = ps3.s3_comm.httpx_client.get(url, headers=headers)
            if r.is_success:
                return r.content
    return None


def scaleImage(imageContent, imageSize):
    """
    Scale the image content to the desired size.

    Args:
      imageContent (bytes): The content of the image file.
      ImageSize (int): The desired size of the image.

    Returns:
      bytes: The scaled image content in JPEG format.
    """
    img = Image.open(BytesIO(imageContent))
    width, height = img.size
    img = img.resize((imageSize, int(imageSize / (width / height))))
    buffered = BytesIO()
    img.save(buffered, format="JPEG")
    return buffered.getvalue()
