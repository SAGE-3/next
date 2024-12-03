# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

# Image
from PIL import Image
from io import BytesIO
import base64
import time, os
from datetime import datetime
from zoneinfo import ZoneInfo

# PDF
import pymupdf4llm
import pymupdf
from io import BytesIO


class DotDict(dict):
    """
    A dictionary subclass that allows for attribute-style access to dictionary keys.

    This class extends the built-in dictionary to enable accessing dictionary keys
    as if they were attributes of an object. It also recursively converts nested
    dictionaries and lists into DotDict instances.

    Example:
      dot_dict = DotDict({'key': 'value'})
      print(dot_dict.key)  # Output: value
    """

    def __getattr__(self, key):
        value = self[key]
        return self._convert(value)

    def __setattr__(self, key, value):
        self[key] = value

    def __setitem__(self, key, value):
        super().__setitem__(key, self._convert(value))

    def __getitem__(self, key):
        value = super().__getitem__(key)
        return self._convert(value)

    def __delattr__(self, key):
        del self[key]

    @staticmethod
    def _convert(value):
        if isinstance(value, dict):
            return DotDict(value)
        elif isinstance(value, list):
            return [DotDict._convert(item) for item in value]
        return value


def convertTimestamp(adate):
    """
    Convert a timestamp in milliseconds to a datetime object.

    Args:
      adate (int): The timestamp in milliseconds.

    Returns:
      datetime: The corresponding datetime object.
    """
    date = datetime.fromtimestamp(adate / 1000)
    return date


def convertDate(adate):
    """
    Convert an ISO 8601 formatted date string to a datetime object.

    Args:
      adate (str): The ISO 8601 formatted date string.

    Returns:
      datetime: The corresponding datetime object.
    """
    dt = datetime.fromisoformat(adate.replace("Z", "+00:00"))
    tz = time.tzname[0]
    if tz == "CDT" or tz == "CST":
        tz = "America/Chicago"
    result = dt.astimezone(ZoneInfo(tz))
    return result


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


def getRoomInfo(ps3, room_id):
    """
    Retrieve room information from the SAGE3 server based on the provided room ID.

    Args:
      ps3 (object): SAGE3 API handle.
      room_id (str): The unique identifier of the room to retrieve.

    Returns:
      DotDict: A DotDict containing the room information if found and successfully retrieved.
      None: If the board is not found or the request fails.
    """
    url = (
        ps3.s3_comm.conf[ps3.s3_comm.prod_type]["web_server"] + "/api/rooms/" + room_id
    )
    headers = ps3.s3_comm._SageCommunication__headers
    r = ps3.s3_comm.httpx_client.get(url, headers=headers)
    if r.is_success:
        res = r.json()
        return DotDict(res).data[0]
    return None


def getBoardInfo(ps3, board_id):
    """
    Retrieve board information from the SAGE3 server based on the provided board ID.

    Args:
      ps3 (object): SAGE3 API handle.
      board_id (str): The unique identifier of the board to retrieve.

    Returns:
      DotDict: A DotDict containing the board information if found and successfully retrieved.
      None: If the board is not found or the request fails.
    """
    url = (
        ps3.s3_comm.conf[ps3.s3_comm.prod_type]["web_server"]
        + "/api/boards/"
        + board_id
    )
    headers = ps3.s3_comm._SageCommunication__headers
    r = ps3.s3_comm.httpx_client.get(url, headers=headers)
    if r.is_success:
        res = r.json()
        return DotDict(res).data[0]
    return None


def getRooms(ps3):
    """
    Retrieve list of rooms information from the SAGE3 server.

    Args:
      ps3 (object): SAGE3 API handle.

    Returns:
      DotDict: A DotDict containing the rooms information if found and successfully retrieved.
    """
    url = ps3.s3_comm.conf[ps3.s3_comm.prod_type]["web_server"] + "/api/rooms"
    headers = ps3.s3_comm._SageCommunication__headers
    r = ps3.s3_comm.httpx_client.get(url, headers=headers)
    if r.is_success:
        res = r.json()
        return DotDict(res).data
    return None


def getBoards(ps3, room_id=None):
    """
    Retrieve list of boards information from the SAGE3 server based on the provided room ID.

    Args:
      ps3 (object): SAGE3 API handle.
      room_id (str): The unique identifier of the room to retrieve.

    Returns:
      DotDict: A DotDict containing the board information if found and successfully retrieved.
      None: If the board is not found or the request fails.
    """
    url = ps3.s3_comm.conf[ps3.s3_comm.prod_type]["web_server"] + "/api/boards"
    headers = ps3.s3_comm._SageCommunication__headers
    r = ps3.s3_comm.httpx_client.get(url, headers=headers)
    if r.is_success:
        res = r.json()
        rooms = []
        data = DotDict(res).data
        if room_id is not None:
            rooms = [x for x in data if x.data.roomId == room_id]
        else:
            rooms = data
        return rooms
    return None


def getAssets(ps3, room_id=None):
    """
    Retrieve a list of assets from the given ps3 object, optionally filtered by room_id.

    Args:
      ps3 (object): An object that contains the s3_comm attribute with a method get_assets().
      room_id (str, optional): The ID of the room to filter assets by. Defaults to None.

    Returns:
      list: A list of assets. If room_id is provided, only assets belonging to the specified room are returned.
        '_id', '_createdAt', '_createdBy', '_updatedAt', '_updatedBy', 'data'
        data:
        {
            "file": "126bf2b1-24b5-477a-82a0-e36b82574ef7.jpg",
            "owner": "3d38ee10-b0f8-4bce-acef-6c9a3ea37785",
            "room": "1596b8c1-cb87-4542-be6b-9dbb1ad952a1",
            "originalfilename": "000000521601.jpg",
            "path": "dist/apps/homebase/assets/126bf2b1-24b5-477a-82a0-e36b82574ef7.jpg",
            "destination": "dist/apps/homebase/assets",
            "size": 41958,
            "mimetype": "image/jpeg",
            "dateAdded": "2024-11-13T01:30:33.607Z",
            "derived": {
                "filename": "dist/apps/homebase/assets/126bf2b1-24b5-477a-82a0-e36b82574ef7.jpg",
                "url": "api/assets/static/126bf2b1-24b5-477a-82a0-e36b82574ef7-80.webp",
                "fullSize": "api/assets/static/126bf2b1-24b5-477a-82a0-e36b82574ef7-full.jpg",
                "width": 640,
                "height": 480,
                "aspectRatio": 1.3333333333333333,
                "sizes": [
                    {
                        "url": "api/assets/static/126bf2b1-24b5-477a-82a0-e36b82574ef7-80.webp",
                        "format": "webp",
                        "width": 80,
                        "height": 60,
                        "channels": 3,
                        "premultiplied": False,
                        "size": 464,
                    },
                    ...
                ],
            },
            "dateCreated": "2024-11-13T01:30:31.000Z",
            "metadata": "126bf2b1-24b5-477a-82a0-e36b82574ef7.jpg.json",
        }
    """
    assets = ps3.s3_comm.get_assets()
    if room_id is not None:
        assets = [x for x in assets if x["data"]["room"] == room_id]
    assets_info = []
    for asset in assets:
        assets_info.append(DotDict(asset))
    return assets_info


def getUsers(ps3):
    """
    Retrieve users information from the SAGE3 server.

    Args:
      ps3 (object): SAGE3 API handle.
      user_id (str): The unique identifier of the user to retrieve.

    Returns:
      array: array of dict if found: {name, email, color, userRole, userType, profilePicture, savedBoards, recentBoards}.
      None: If the user is not found or the request fails.
    """
    # Build the URL
    url = ps3.s3_comm.conf[ps3.s3_comm.prod_type]["web_server"] + "/api/users"
    # Get the authorization headers
    headers = ps3.s3_comm._SageCommunication__headers
    # Download the users
    r = ps3.s3_comm.httpx_client.get(url, headers=headers)
    if r.is_success:
        res = r.json()
        users = DotDict(res).data
        return users
    return None


def getMDfromPDF(id, content):
    """
    Converts a PDF content to Markdown format and caches the result in a temporary file.

    Args:
      id (str): A unique identifier for the PDF content.
      content (bytes): The binary content of the PDF file.

    Returns:
      str: The Markdown representation of the PDF content.

    If the Markdown file already exists in the temporary directory, it reads and returns the content from the file.
    Otherwise, it converts the PDF content to Markdown, writes it to a temporary file, and returns the Markdown content.
    """
    file_path = f"/tmp/{id}.md"
    if os.path.exists(file_path):
        with open(file_path, "r") as file:
            return file.read()
    else:
        md = pymupdf4llm.to_markdown(
            pymupdf.open(stream=BytesIO(content), filetype="pdf")
        )
        with open(file_path, "w") as file:
            file.write(md)
        return md


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
    # Find the asset
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
  
def getCSVFile(ps3, assetid):
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
    # Find the asset
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
      imageSize (int): The desired size of the image.

    Returns:
      bytes: The scaled image content in JPEG format.
    """
    # Open the image from the provided byte content
    img = Image.open(BytesIO(imageContent))
    width, height = img.size

    # Convert the image to RGB format
    img = img.convert("RGB")

    # Check if the width is zero to avoid division by zero error
    if width == 0:
        raise ValueError("Image width cannot be zero.")

    # Resize the image while maintaining the aspect ratio
    img = img.resize((imageSize, int(imageSize / (width / height))))

    # Save the resized image to a bytes buffer in JPEG format
    buffered = BytesIO()
    img.save(buffered, format="JPEG")

    # Return the byte content of the scaled image
    return buffered.getvalue()
