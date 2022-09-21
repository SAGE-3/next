### About

The foresight engine is where the python magic happens. This documents serves as both a living documentation of the foresight engine
as well

### Features

#### Linked apps
Two apps can be linked uisng `sage_proxy`'s `register_linked_app`. For example, to link a counter and note pad we use 
the following:

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
This means that any updates to the src_field (count) of src_app will be passed to the dest_field (text) of the destinatin app. For now, we assume the fields exist. 
When the count is updates, the callback function is executed. Here the function can simply do something like the following:
```python
def update_value(src_val, dest_app, dest_field):
    # update the field
    setattr(dest_app.state, dest_field, f"val is {src_val}")
    # propagate the update to the client
    dest_app.send_updates()
```

If only only needs to update the dest fiel with the value in the source field, the function `update_dest_from_src` can be used. 
> :memo: This function as well need a future home! 

For example:
















