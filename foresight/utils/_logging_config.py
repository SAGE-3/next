# import logging
# import os
#
#
# def get_console_logger():
#     logger = logging.getLogger(__name__)
#     c_handler = logging.StreamHandler()
#     c_format = logging.Formatter(' %(asctime)s | %(module)s | %(levelname)s | %(message)s')
#     c_handler.setFormatter(c_format)
#     logger.addHandler(c_handler)
#     if os.getenv("LOG_LEVEL") == "debug":
#         print("Generating DEBUG level logger")
#         logger.setLevel(logging.DEBUG)
#     else:
#         logger.setLevel(logging.INFO)
#     return logger
#
#
#
