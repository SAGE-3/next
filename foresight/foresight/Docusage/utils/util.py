import sys
sys.path.append('../..')
from config import config as conf, prod_type
from Sage3Sugar.pysage3 import PySage3
import uuid

ps3 = PySage3(conf, prod_type)
b = ps3.rooms['11590f71-2738-4a9e-81e1-020cecbbdb4a'].boards['a64a6c82-6097-4f5e-9174-21069fc436a4']
sb = b.smartbits[uuid.UUID('93324634-3e3b-4f89-ad29-36c6e6403ef6')]