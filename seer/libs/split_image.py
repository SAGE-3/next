from PIL import Image


def split_image_into_tiles(image_path, tile_height, output_path):
    # Open the tall image
    img = Image.open(image_path)

    # Calculate the number of tiles needed (horizontally and vertically)
    img_width, img_height = img.size
    tile_width = img_width
    columns = img_height // tile_height
    rows = img_width // tile_width
    print("🚀 ~ rows:", columns, rows)

    # Create a new image to store the tiles in a grid
    tiled_image = Image.new("RGB", (columns * tile_width, tile_height))

    for col in range(columns):
        print("col:", col)
        # Calculate the coordinates of the tile
        left = 0
        top = col * tile_height
        right = tile_width
        bottom = top + tile_height

        # Crop the tile from the original image
        tile = img.crop((left, top, right, bottom))
        # tile.save(f"tile_{col}.jpg")

        # Paste the tile into the tiled image at the correct position
        tiled_image.paste(tile, (col * tile_width, 0))

    # Save the new tiled image
    tiled_image.save(output_path)
