import pytest
from smartbits.kerneldashboard import KernelDashboard

def test_create_kerneldashboard_smartbit():
    doc = {
        '_id': '9d36d86d-077f-48d6-aab9-cd145b87620d',
        '_createdAt': 1666121339357,
        '_createdBy': '5787fd6a-5831-4193-bf81-c9e4ed1df5f0',
        '_updatedAt': 1666121339357,
        '_updatedBy': '5787fd6a-5831-4193-bf81-c9e4ed1df5f0',
        'data': {
            'name': 'KernelDashboard',
            'description': 'KernelDashboard',
            'roomId': 'c9a79450-c2db-4ca3-8d6b-fdf77cf410d9',
            'boardId': 'a6ee5780-933e-42fa-812e-76d35c412550',
            'position': {'x': 2500027, 'y': 2500115, 'z': 0},
            'size': {'width': 400, 'height': 400, 'depth': 0},
            'rotation': {'x': 0, 'y': 0, 'z': 0},
            'type': 'KernelDashboard',
            'ownerId': '5787fd6a-5831-4193-bf81-c9e4ed1df5f0',
            'minimized': False,
            'raised': True
            },
        'state': {
            'kernels': [],
            'sessions': [],
            'defaultKernel': '',
            'kernelSpecs': [],
            'availableKernels': [],
            'executeInfo': {'executeFunc': '', 'params': {}}
            }
    }
    kd = KernelDashboard(**doc)
    assert isinstance(kd, KernelDashboard)





