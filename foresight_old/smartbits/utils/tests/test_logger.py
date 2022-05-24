#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

# from Python_code.utils.logger import Logger
#
# import pytest
# import os
#
# def test_log():
#
#     # assumes that logger is configured locally and that there is a rule to write messages from
#     # sage3.smartbits to the file /var/log/td-agent/td-agent.log
#     l = Logger.get_instance(system="sage3.smartbits", host="localhost", port=24224)
#
#     # We would like to add logging functionality to the function `something`
#     @l.log(log_tag="create", log_level="info")
#     def something(a, b=3):
#         print(a, b)
#
#     # TODO: this is best tested with the mock server, as done in:
#     # https: // github.com / fluent / fluent - logger - python / blob / master / tests / test_sender.py
#     # but, for now, we can just make sure the last line written to the log is what is what we expected
#     # clearly, this won't work if other services are logg after the execution of the function something
#
#     something(2, b=3)
#
#     # better to do this than read a potentially large log file?
#     stream = os.popen('tail -1  /var/log/td-agent/td-agent.log')
#     # The line should be
#     # <DATE> <TIME> <VAL> sage3.smartbits.create: {"func_name":"something","args":[2],"kwargs":{"b":3},"level":"info"}
#
#     last_line = stream.read()
#     last_line_data = last_line.split()
#
#     assert last_line_data[3] == 'sage3.smartbits.create:'
#     assert last_line_data[4] == '{"func_name":"something","args":[2],"kwargs":{"b":3},"level":"info"}'
