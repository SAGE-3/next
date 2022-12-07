# -----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
# -----------------------------------------------------------------------------

from smartbits.smartbit import SmartBit, ExecuteInfo
from smartbits.smartbit import TrackedBaseModel

# JSON lib
import json
# Downloading a file from a URL
import requests
import os
# Starting a process
import subprocess
# Get the URL to thew webserver
from config import config as conf, prod_type

class PDFViewerState(TrackedBaseModel):
    assetid: str
    currentPage: int
    numPages: int
    displayPages: int
    analyzed: str
    executeInfo: ExecuteInfo

class PDFViewer(SmartBit):
    # the key that is assigned to this in state is
    state: PDFViewerState

    # _some_private_info: dict = PrivateAttr()
    def __init__(self, **kwargs):
        # THIS ALWAYS NEEDS TO HAPPEN FIRST!!
        super(PDFViewer, self).__init__(**kwargs)

    def returnError(self, msg):
        print('PDF> error', msg)
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        self.send_updates()

    def returnData(self, pdf_data):
        self.state.executeInfo.executeFunc = ""
        self.state.executeInfo.params = {}
        # Send the data as a string
        self.state.analyzed = json.dumps(pdf_data)
        self.send_updates()

    def analyze_pdf(self, asset):
        print('PDF> Analyzing', asset)
        pdf_dir = "smartbits/pdf/"
        token = os.getenv("TOKEN")
        web_server = conf[prod_type]['web_server']
        url = web_server + '/api/assets/static/' + asset
        response = requests.get(url, headers={'Authorization': 'Bearer ' + token})
        if response.status_code != 200:
            self.returnError('Error downloading file')
            return

        with open(pdf_dir + 'input/' + asset, "wb") as handle:
          for data in response.iter_content():
              handle.write(data)

        # Call the processing script (will intergrate into this later)
        code = subprocess.run(["python3", "process.py", "--pdf=" + 'input/' + asset], cwd=pdf_dir)
        print('PDF> return code', code.returncode)
        if code.returncode != 0:
            self.returnError('Error processing file')
            return

        try:
            basename = os.path.splitext(asset)[0]
            f_output = open(pdf_dir + 'output/' + basename + '.json')
            pdf_data = json.load(f_output)
            print('PDF> data', pdf_data)
            self.returnData(pdf_data)
        except:
            self.returnError('Error processing JSON data')
            return

    def clean_up(self):
        pass