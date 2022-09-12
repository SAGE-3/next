/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

 import { useEffect, useState } from 'react';
 import { DraggableData, Position, ResizableDelta, Rnd } from 'react-rnd';
 import { Box, Text, useColorModeValue, useToast } from '@chakra-ui/react';
 import { MdOpenInFull, MdOutlineClose, MdOutlineCloseFullscreen } from 'react-icons/md';
 
 import { App } from '../schema';
 import { useAppStore, useUIStore } from '@sage3/frontend';
 import { sageColorByName } from '@sage3/shared';
import { reduce } from 'd3';
import { useStore } from 'zustand';
 
 type EmptyAppProps = {
   app: App;
   aspectRatio?: number | boolean;
   children: JSX.Element;
 
   // React Rnd property to control the window aspect ratio (optional)
   lockAspectRatio?: boolean | number;
   onSelected?: ()=> void;
   onDeselected?: ()=> void;
   disableDragging?: boolean;
   enableResizing? : boolean;
 };
 
 export function AppEmpty(props: EmptyAppProps) {
   // UI store for global setting
   const scale = useUIStore((state) => state.scale);
   const zindex = useUIStore((state) => state.zIndex);
   const incZ = useUIStore((state) => state.incZ);
   const gridSize = useUIStore((state) => state.gridSize);
   const setSelectedApp = useUIStore((state) => state.setSelectedApp);
   const selectedApp = useUIStore((state) => state.selectedAppId);
 
   const [selected, setSelected] = useState(false);

   // Display messages
   const toast = useToast();
   // Height of the title bar
   //const titleBarHeight = 24;
   // Border color when selected
  // const borderColor = useColorModeValue(
  //   sageColorByName('blue'),
  //   sageColorByName('orange')
  // );
 
   // App Store
   const apps = useAppStore((state) => state.apps);
   const update = useAppStore((state) => state.update);
   const deleteApp = useAppStore((state) => state.delete);
   const storeError = useAppStore((state) => state.error);
   const clearError = useAppStore((state) => state.clearError);
 
   // Local state
   const [pos, setPos] = useState({ x: props.app.data.position.x, y: props.app.data.position.y });
   const [size, setSize] = useState({ width: props.app.data.size.width, height: props.app.data.size.height });
   const [minimized, setMinimized] = useState(props.app.data.minimized);
   const [myZ, setMyZ] = useState(zindex);


   useEffect(() => {
    if (props.app._id == selectedApp && props.onSelected) {
      props.onSelected();
      setSelected(true)
    }
    if (props.app._id !== selectedApp && props.onDeselected) {
      if (selected) {
        props.onDeselected();
        setSelected(false)
      }
    }
   }, [selectedApp]);
 
   // Track the app store errors
   useEffect(() => {
     if (storeError) {
       // Display a message'
       if (storeError.id && storeError.id === props.app._id)
         toast({ description: 'Error - ' + storeError.msg, duration: 3000, isClosable: true });
       // Clear the error
       clearError();
     }
   }, [storeError]);
 
   // If size or position change, update the local state.
   useEffect(() => {
     setSize({ width: props.app.data.size.width, height: props.app.data.size.height });
     setPos({ x: props.app.data.position.x, y: props.app.data.position.y });
   }, [props.app.data.size, props.app.data.position]);
 
   // If minimized change, update the local state.
   useEffect(() => {
     setMinimized(props.app.data.minimized);
   }, [props.app.data.minimized]);
 
   // Handle when the app is dragged by the title bar
   function handleDragStop(_e: any, data: DraggableData) {
     let x = data.x;
     let y = data.y;
     x = Math.round(x / gridSize) * gridSize; // Snap to grid
     y = Math.round(y / gridSize) * gridSize;
     setPos({ x, y });
     update(props.app._id, {
       position: {
         x, y, z: props.app.data.position.z,
       },
     });
   }
 
   // Handle when the app is resized
   function handleResizeStop(e: MouseEvent | TouchEvent, _direction: any, ref: any, _delta: ResizableDelta, position: Position) {
     // Get the width and height of the app after the resize
     //const width = parseInt(ref.offsetWidth);
     const width = parseInt(ref.style.width);
     // Subtract the height of the title bar. The title bar is just for the UI, we don't want to save the additional height to the server.
     const height = parseInt(ref.offsetHeight);
     // Set local state
     setPos({ x: position.x, y: position.y });
     setSize({ width, height });
 
     // Update the size and position of the app in the server
     update(props.app._id, {
       position: {
         ...props.app.data.position,
         x: position.x,
         y: position.y,
       },
       size: {
         ...props.app.data.size,
         width,
         height,
       },
     });
   }
 
   // Set the local state on resize
   function handleResize(e: MouseEvent | TouchEvent, _direction: any, ref: any, _delta: ResizableDelta, position: Position) {
     // Get the width and height of the app after the resize
     //const width = parseInt(ref.offsetWidth);
     const width = parseInt(ref.style.width);
     // Subtract the height of the title bar. The title bar is just for the UI, we don't want to save the additional height to the server.
     const height = parseInt(ref.offsetHeight);
 
     // Set local state
     setSize({ width, height });
     setPos({ x: position.x, y: position.y });
 
   }
 
   // Close the app and delete from server
   function handleClose() {
     deleteApp(props.app._id);
   }
 
   // Minimize the app. Currently only local.
   function handleMinimize() {
     update(props.app._id, { minimized: !minimized });
   }
 
   // Track raised state
   useEffect(() => {
     if (props.app.data.raised) {
       // raise  my zIndex
       setMyZ(zindex + 1);
       // raise the global value
       incZ();
     }
   }, [props.app.data.raised]);
 
   function handleAppClick(e: any) {
     e.stopPropagation();
     // Set the selected app in the UI store
     setSelectedApp(props.app._id);
     // Raise down
     apps.forEach((a) => {
       if (a.data.raised) update(a._id, { raised: false });
     });
     // Bring to front function
     update(props.app._id, { raised: true });
   }
 
   return (
      <Rnd 
        //dragHandleClassName={'handle'}
        
        position={pos}
        size={{ width: size.width, height:size.height}}
        style={{
          zIndex: myZ,
        }}
        scale={scale}
        onDragStop={handleDragStop}
        onResizeStop={(props.enableResizing) ? handleResizeStop : ()=>{}}
        onResize={(props.enableResizing) ? handleResize: ()=>{}}
        //onResizeStart={handleAppClick}
        disableDragging={(props.disableDragging)? props.disableDragging : false}
        enableResizing={(props.enableResizing) ? props.enableResizing : true}   // this property doesn't seem to work
        onClick={handleAppClick}
      >
        <Box id={'app_' + props.app._id} width="100%" height="100%">
          {props.children}
        </Box>
      </Rnd>
  );
 }


