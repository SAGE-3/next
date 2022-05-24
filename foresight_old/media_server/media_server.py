#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

#app.py
import flask
from post_finsh_processes import *

from flask import Flask, request #import main Flask class and request object

# used to guess the file type
import magic

app = Flask(__name__) #create the Flask app

SUPPORTED_FORMATS = ["empty", 'ASCII', "PNG", "JPEG"]

# File tyepes for which we do some post_finish work
# Eventually, we need to dig deeper to figure out whether ASCII is know format
# like DNA (Fasta, FASTQ), CSV, TSV, ETC...

post_finish_types = {"PNG": "image", "JPEG": "image"}




class Hooks:

    @classmethod
    def get_handle_function(cls, func_name):
        # import the class that contains the hooks
        func = getattr(cls, func_name, None)
        return func

    def pre_create(params):
        print("function not implemented")

    def post_create(params):
        print("function not implemented")

    def receive(params):
        print("function not implemented")

    def post_terminate(params):
        print("function not implemented")

    def post_finish(params):
        print(params)
        # TODO: 1. params somewhere if you need them again
        # TODO: 2. guess the file type
        file_path = params["Upload"]["Storage"]["Path"]
        print(f"{file_path}")
        file_format = magic.from_file(file_path)[0]
        print(f"{file_format}")
        is_supported_format = file_format in SUPPORTED_FORMATS
        print(f"{is_supported_format}")
        # TODO: 3. Do post-finish work, which depends on file type (ex. generate thumbnail or select
        #  subset of rows, cols for table)
        post_finish_type = post_finish_types.get(file_format, None)

        # we do the work related to any file
        post_finish_work()

        # do additional work that is specific to a smartbit (ex. handle things that are specific to images, etc..)
        if post_finish_types is not None:
            post_finish_function = eval(f"post_finsh_{post_finish_type}")
            post_finish_function()




@app.route('/hook', methods=['POST'])
def handle_tus_hook():
    # Receiving hooks for pre-create, post-create, post-receive (for each chunk), post-finish, post-terminate (cancel)
    # request.headers['Hook-Name']
    # TODO: For now, we are only handling post-finish. Do something with the rest
    """
    This function handles the hooks received from the tus server indicating file upload activity
    :return:
    """

    hook_name = request.headers['Hook-Name']
    func_name = hook_name.replace("-", "_")
    hook_handle = Hooks.get_handle_function(func_name)

    try:
        if hook_handle is None:
            raise Exception(f"Function {func_name} not available in list of possible hooks")
        hook_handle(request.json)
        status_code = flask.Response(status=201)
    except:
        "******************************* I am in except"
        status_code = flask.Response(status=404)

    return status_code







if __name__ == '__main__':
    print("starting media 127.0.0.1:8080")
    app.run(host='127.0.0.1', port=8080, debug=True)
