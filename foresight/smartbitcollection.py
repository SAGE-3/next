#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
#  University of Hawaii, University of Illinois Chicago, Virginia Tech
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

class SmartBitsCollection():
    # TODO refactor this into properties
    def __init__(self):
        super().__init__()
        self.smartbits_collection = {}

    def __len__(self):
        return len(self.smartbits_collection)

    def __getitem__(self, sb_id):
        return self.smartbits_collection.get(sb_id, None)

    def __setitem__(self, sb_id, sb):
        self.smartbits_collection[sb_id] = sb

    def __delitem__(self, sb_id):
        del self.smartbits_collection[sb_id]

    def __iter__(self):
        yield from self.smartbits_collection.items()

    def __contains__(self, value):
        return value in self.smartbits_collection
