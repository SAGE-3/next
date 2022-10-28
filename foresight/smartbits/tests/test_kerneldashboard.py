# import pytest
from smartbits.kerneldashboard import KernelDashboard
from sample_sb_docs import kernel_dashboard_doc


def test_create_kerneldashboard_smartbit():
    kd = KernelDashboard(**kernel_dashboard_doc)
    assert isinstance(kd, KernelDashboard)





