# Python API to SAGE3

# Configuration

.env file or environment variables

```
SAGE3_SERVER=example.com
ENVIRONMENT=production
TOKEN= XXX_JWT TOKEN for SAGE3 Auth_XXX
```

# Loading

```
from foresight.config import config as conf, prod_type
from foresight.Sage3Sugar.pysage3 import PySage3
# Connect to the SAGE3 server
ps3 = PySage3(conf, prod_type)
```

## Examples

See [https://sage-3.github.io/docs/SAGE3-API-in-SageCell](https://sage-3.github.io/docs/SAGE3-API-in-SageCell)

```python
from foresight.config import config as conf, prod_type
from foresight.Sage3Sugar.pysage3 import PySage3

room_id = %%sage_room_id
board_id = %%sage_board_id
app_id = %%sage_app_id
selected_apps = %%sage_selected_apps

ps3 = PySage3(conf, prod_type)
smartbits = ps3.get_smartbits(room_id, board_id)
bits = [smartbits[a] for a in selected_apps]
for b in bits:
  print(b)
```

