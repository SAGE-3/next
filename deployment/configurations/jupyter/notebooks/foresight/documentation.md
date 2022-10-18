### About

The foresight engine is where the Python magic happens. This document serves as both a living documentation of the foresight engine as well

The proxy to the foresight engine lives in proxy.py. The proxy is room specific and needs a room id to listen to. Current rooms can
be obtained using the API, by nagivating, for example to `http://localhost:4200/api/rooms`.

One the room number is provided, proxy can be run from the python terminal using:

run proxy.py # opening and executing file in iPython also works


### Features

Some of the current featured are documented below

#### Updating apps attributes


#### Linked apps

Two apps can be linked uisng `sage_proxy`'s `register_linked_app`. For example, to link a counter and note pad we use and 
if we only need to update the dest field with the value in the source field, the function `update_dest_from_src` can be used. 
> :memo: This function as well need a future home! 

```python
sage_proxy.register_linked_app(
	board_id="ad18901e-e128-4997-9c77-99aa6a6ab313", 
	src_app="f1f37163-39ac-47ee-a76f-4fc668c1bb5d", 
	dest_app="26201a49-f87a-4aee-b20e-51f395a867fd", 
	src_field="count", 
	dest_field="text", 
	callback=update_dest_from_src
	)
```

This means that any updates to the src_field (count) of src_app will be passed to the dest_field (text) of the destinatin app. For now, we assume the fields exist.

The callback can be any function that take three params, src_val, dest_app (an app SmarBit object) and the field name (str)

When the source field is updated the callback function is executed. Here the function can simply do something like the following:
```python
def update_value(src_val, dest_app, dest_field):
    # update the field
    setattr(dest_app.state, dest_field, f"val is {src_val}")
    # propagate the update to the client
    dest_app.send_updates()
```

So the link can be:
```python
sage_proxy.register_linked_app(
   board_id="ad18901e-e128-4997-9c77-99aa6a6ab313", 
   src_app="f1f37163-39ac-47ee-a76f-4fc668c1bb5d", 
   dest_app="26201a49-f87a-4aee-b20e-51f395a867fd", 
   src_field="count", 
   dest_field="text", 
   callback=update_value
   )
```

* You can unregister a linked app by providing the same information provide to register the app minus the callback 
> TODO: potentially use a ID returned when we called `register_linked_app`


 















