# #-----------------------------------------------------------------------------
# #  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
# #  University of Hawaii, University of Illinois Chicago, Virginia Tech
# #
# #  Distributed under the terms of the SAGE3 License.  The full license is in
# #  the file LICENSE, distributed as part of this software.
# #-----------------------------------------------------------------------------
#
# import logging
# import os
#
#
# def get_console_logger(prod_type):
#     logger = logging.getLogger(__name__)
#     c_handler = logging.StreamHandler()
#     c_format = logging.Formatter(' %(asctime)s | %(module)s | %(levelname)s | %(message)s')
#     c_handler.setFormatter(c_format)
#     logger.addHandler(c_handler)
#     if os.getenv("LOG_LEVEL") is not None and os.getenv("LOG_LEVEL") == "debug":
#         print("DEBUG level logging")
#         logger.setLevel(logging.DEBUG)
#     else:
#         logger.setLevel(logging.INFO)
#     return logger
