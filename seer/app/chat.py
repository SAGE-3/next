# Chat

from logging import Logger

# SAGE3 API
from foresight.Sage3Sugar.pysage3 import PySage3


class ChatAgent:
    def __init__(
        self,
        logger: Logger,
        ps3: PySage3,
    ):
        logger.info("Initializing ChatAgent")
        self.logger = logger
        self.ps3 = ps3

    def process(self):
        self.logger.info(f"Processing data in ChatAgent")
