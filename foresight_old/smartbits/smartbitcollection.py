#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

# import rx
from rx.subject import Subject

class SmartBitsCollection(Subject):
    # TODO refactor this into properties
    def __init__(self):
        super().__init__()
        self.smartbits_collection = {}
        self.subject = Subject()

    def __len__(self):
        return len(self.smartbits_collection)

    def __getitem__(self, sb_id):
        return self.smartbits_collection.get(sb_id, None)

    def __setitem__(self, sb_id, sb):
        self.on_next({"operation": "add", "sb_id": sb_id})
        self.smartbits_collection[sb_id] = sb

    def __delitem__(self, sb_id):
        self.on_next({"operation": "add", "sb": sb_id})
        del self.smartbits_collection[sb_id]

    def __iter__(self):
        yield from self.smartbits_collection.items()
