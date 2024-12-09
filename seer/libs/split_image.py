# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from PIL import Image


def split_image_into_tiles(image_path, tile_height, output_path):
    # Open the tall image
    img = Image.open(image_path)

    # Calculate the number of tiles needed (horizontally and vertically)
    img_width, img_height = img.size
    tile_width = img_width
    columns = img_height // tile_height
    rows = img_width // tile_width

    # Create a new image to store the tiles in a grid
    tiled_image = Image.new(
        "RGB", (columns * (tile_width + 10), tile_height), (255, 255, 255)
    )

    for col in range(columns):
        # Calculate the coordinates of the tile
        left = 0
        top = col * tile_height
        right = tile_width
        bottom = top + tile_height

        # Crop the tile from the original image
        tile = img.crop((left, top, right, bottom))
        # tile.save(f"tile_{col}.jpg")

        # Paste the tile into the tiled image at the correct position
        tiled_image.paste(tile, (col * (tile_width + 10), 0))

    # Save the new tiled image
    tiled_image.save(output_path)
    return (columns * tile_width, tile_height)
