from utils.sage_communication import SageCommunication
import pytest
from config import config as conf, prod_type

# TODO: add a test to check if a kernel exist and report an appropriate error otherwise
# perhaps maybe not even run the remaining tests


@pytest.fixture()
def sage_communication():
    c = SageCommunication(conf, prod_type)
    return c


def test_get_configruation(sage_communication):
    sage_config = sage_communication.get_configuration()
    assert "serverName" in sage_config
    assert "namespace" in sage_config


