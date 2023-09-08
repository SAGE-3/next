from foresight.smartbits.smartbit import SmartBit
from typing import List


def get_app_geometry(smartbits: List[SmartBit] = None):
    """function to get the left_x, right_x, """
    left_x = min([smartbit.data.position.x for smartbit in smartbits])
    right_x = max([smartbit.data.position.x + smartbit.data.size.width for smartbit in smartbits])
    top_y = min([smartbit.data.position.y for smartbit in smartbits])
    bottom_y = max([smartbit.data.position.y + smartbit.data.size.height for smartbit in smartbits])
    return left_x, right_x, top_y, bottom_y

def align_to_left(smartbits: List[SmartBit]):
    left_x, _, _, _ = get_app_geometry(smartbits)
    for smartbit in smartbits:
        smartbit.data.position.x = left_x
        smartbit.send_updates()


def align_to_right(smartbits: List[SmartBit]):
    _, right_x, _, _ = get_app_geometry(smartbits)
    for smartbit in smartbits:
        smartbit.data.position.x = right_x - smartbit.data.size.width
        smartbit.send_updates()


def align_col_center(smartbits: List[SmartBit]):
    # Find the widest app
    left_x, right_x, _, _ = get_app_geometry(smartbits)
    center = (right_x - left_x) / 2

    # Center the apps in the column based on the widest app
    for smartbit in smartbits:
        smartbit.data.position.x -= (smartbit.data.position.x - center) + \
                                    ((smartbit.data.size.width / 2) - smartbit.data.position.x)
        smartbit.send_updates()


def align_row_center(smartbits: List[SmartBit]):
    _, _, top_y, bottom_y = get_app_geometry(smartbits)
    center = (bottom_y - top_y) / 2
    # Center the apps in the row based on the tallest app
    for smartbit in smartbits:
        smartbit.data.position.y -= (smartbit.data.position.y - center) + \
                                    ((smartbit.data.size.height / 2) - smartbit.data.position.y)
        smartbit.send_updates()

def align_stack(smartbits: List[SmartBit], gap: int = 20):
    left_x, _, top_y, _ = get_app_geometry(smartbits)
    for i, smartbit in enumerate(smartbits):
        smartbit.data.position.y = top_y + i * gap
        smartbit.data.position.x = left_x + i * gap
        smartbit.data.raised = True
    for i, smartbit in enumerate(smartbits):
        smartbit.data.raised = True
        smartbit.send_updates()
        smartbit.data.raised = False
        smartbit.send_updates()


def align_to_bottom(smartbits: List[SmartBit]):
    _, _, _, bottom_y = get_app_geometry(smartbits)
    for smartbit in smartbits:
        smartbit.data.position.y = bottom_y - smartbit.data.size.height
        smartbit.send_updates()


def align_by_row(smartbits: List[SmartBit], num_rows: int = 1, gap: int = 20) -> None:
    left_x, _, top_y, _ = get_app_geometry(smartbits)
    for i, smartbit in enumerate(smartbits):
        row = i % num_rows
        col = i // num_rows
        # The first app is aligned to the top left corner
        if i == 0:
            smartbit.data.position.y = top_y
            smartbit.data.position.x = left_x
        else:
            smartbit.data.position.y = top_y + row * (smartbit.data.size.height + gap)
            smartbit.data.position.x = left_x + col * (smartbit.data.size.width + gap)
    for smartbit in smartbits:
        smartbit.send_updates()

def align_by_col(smartbits: List[SmartBit], num_cols: int = 1, gap: int = 20) -> None:
    sorted_smartbits = sorted(smartbits, key=lambda sb: (sb.data.size.height), reverse=True)

    # Calculate the width of each column
    column_width = max(sb.data.size.width for sb in smartbits) + gap

    # Starting position for the first column
    x = smartbits[0].data.position.x + smartbits[0].data.size.width / 2
    y = smartbits[0].data.position.y

    # Iterate over the sorted smartbits
    for smartbit in sorted_smartbits:
        # Set the position of the current smartbit in the current column
        smartbit.data.position.x = x
        smartbit.data.position.y = y

        # Update the starting position for the next column
        x += column_width

        # If the number of columns exceeds the number of smartbits, wrap to the next row
        if x >= smartbits[0].data.position.x + num_cols * column_width:
            x = smartbits[0].data.position.x
            y += smartbit.data.size.height + gap

    # Adjust the positions of the smartbits to align to the left within each column
    print("Getting ready to adjust positions")
    for smartbit in smartbits:
        smartbit.data.position.x -= smartbit.data.size.width / 2
        smartbit.send_updates()


def align_to_top(smartbits: List[SmartBit]):
    _, _, top_y, _ = get_app_geometry(smartbits)
    for smartbit in smartbits:
        smartbit.data.position.y = top_y
        smartbit.send_updates()



