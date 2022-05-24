#-----------------------------------------------------------------------------
#  Copyright (c) SAGE3 Development Team
#
#  Distributed under the terms of the SAGE3 License.  The full license is in
#  the file LICENSE, distributed as part of this software.
#-----------------------------------------------------------------------------

# TODO: remove multiple inheritance here and use composition

class IPrimitive:
    def jsonify(self):
        return {"value": self}


class S_Int(int,IPrimitive):

    # class with no attributes
    __slots__ = ()

    def __new__(cls, value):
        return  int.__new__(cls, value)

    def __add__(self, other):
        return int(self).__add__(other)

    def __sub__(self, other):
        return int(self).__sub__(other)

    def __mul__(self, other):
        return int(self).__mul__(other)

    def __div__(self, other):
        return int(self).__div__(other)

    def __str__(self):
        return "%d" % int(self)

    def __repr__(self):
        return "%d" % int(self)


class S_Float(float, IPrimitive):

    # class with no attributes
    __slots__ = ()

    def __new__(cls, value):
        return  float.__new__(cls, value)

    def __add__(self, other):
        return float(self).__add__(other)

    def __sub__(self, other):
        return float(self).__sub__(other)

    def __mul__(self, other):
        return float(self).__mul__(other)

    def __div__(self, other):
        return float(self).__div__(other)

    def __str__(self):
        return "%f" % float(self)

    def __repr__(self):
        return "%f" % float(self)

class S_String(str, IPrimitive):

    # class with no attributes
    __slots__ = ()

    def __new__(cls, value):
        return  str.__new__(cls, value)

    def __add__(self, other):
        return str(self).__add__(other)

    def __repr__(self):
        return "%s" % str(self)
