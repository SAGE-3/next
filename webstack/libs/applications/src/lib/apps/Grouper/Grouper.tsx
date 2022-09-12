/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useAppStore, useUIStore, useUser } from '@sage3/frontend';
import { Box, Button, ButtonGroup, HStack, Text, Tooltip, useDisclosure } from '@chakra-ui/react';
import { App } from '../../schema';

import { state as AppState } from './index';
import { AppEmpty } from '../../components';
import { MdAdd, MdRemove } from 'react-icons/md';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { style } from 'd3';
import { appendFileSync } from 'fs';
import { Position } from '@sage3/shared/types';
import { useStore } from 'zustand';

type UpdateFunc = (id: string, state: Partial<AppState>) => Promise<void>;


function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  //const update = useAppStore((state) => state.update);
  //const boardPosition = useUIStore((state) => state.boardPosition);
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  //const selectedApp = useUIStore((state) => state.selectedAppId);
  //const deleteApp = useAppStore((state) => state.delete);
  const {user} = useUser();
  //const apps = useAppStore((state) => state.apps);
  const getAppById = useAppStore((state) => state.getAppById);
  const [offsets, setOffsets ] = useState<Position[]>([]);
  const update = useAppStore((state) => state.update);  // isn't it confusing to have update and updateState from the same source do different things

  // select the app after it is created
  useEffect(() => {
    if (user && user._id === props._createdBy) setSelectedApp(props._id); // make sure the group is the active app after its creation
  },[]);

  // create offsets array
  useEffect(() => {
    const _offsets = s.selectedApps.map(appId => {
      let app = getAppById(appId);
      if (app != null) {
        const offset : Position = {x: app.data.position.x - props.data.position.x,  y: app.data.position.y - props.data.position.y, z: app.data.position.z}
        return offset;
      } else return {x:0, y:0, z:0};
    });
    console.log(_offsets);
    setOffsets(_offsets);
  },[s.grouped]);

  useEffect(() => {
    //s.selectedApps.reduce(function (accumulator:string, currentValue: string , currentIndex: number) {
    //  return ""
    //})
    s.selectedApps.map((appId, index) => {
      let app = getAppById(appId);
      if (app != null && offsets[index]) {
        update(appId, {
          position: {
            x: props.data.position.x + offsets[index].x, 
            y: props.data.position.y + offsets[index].y,
            z: app.data.position.z,
          },
        });
      }
    })
  },[props.data.position]);
  
 
  const ref = useRef<HTMLDivElement>(null);

  
  const selected = () => {
    //console.log('selected')
  }
  
  const deselected = () => {
    //console.log('deselected')
    // check if the group is empty, if it is, can dismiss app
    //deleteApp(props._id);
  }

  return (
    <AppEmpty app={props} onSelected={selected} onDeselected={deselected} enableResizing={!s.grouped} >
      <Box width="100%"
        height="100%"
        borderStyle="dashed"
        borderWidth={"3px"}
        borderColor="orange"
        >
        <Box 
          //width={props.data.size.width+"px"} 
          //height={props.data.size.height+"px"} 
          width="100%"
          height="100%"
          bgColor="orange" 
          opacity={0.2} 
          ref={ref}
        >
     
        </Box>
      </Box>
    </AppEmpty>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const deleteApp = useAppStore((state) => state.delete);
  const apps = useAppStore((state) => state.apps);
  const updateState = useAppStore((state) => state.updateState);

  const handleDismiss  = () =>  {
    // do we want it toerase all of the apps inside the group?
    if (s.grouped) {
      s.selectedApps.map(app => deleteApp(app))
    }
    deleteApp(props._id);
    
  };

  const handleUngroup = () => {
    updateState(props._id, {selectedApps: [], grouped: false});
    //deleteApp(props._id);
  }
  const handleGroup = () => {
    updateState(props._id, {selectedApps: [], grouped: false});
    // calculate the selected apps
    const x1 = props.data.position.x;
    const x2 = props.data.position.x + props.data.size.width;
    const y1 = props.data.position.y;
    const y2 = props.data.position.y + props.data.size.height;

    let array: string[] = [];
    apps.map(app => {
      if(app._id !== props._id) {
        // check bounds
        if (app.data.position.x > x1 &&
          app.data.position.x + app.data.size.width < x2 &&
          app.data.position.y > y1 &&
          app.data.position.y + app.data.size.height < y2) {
            array.push(app._id);
            //updateState(props._id, {selectedApps: s.selectedApps.push(app._id)});
          }
      }
    });
    if (array.length > 0) {
      updateState(props._id, {selectedApps: array, grouped: true});
    }
    
  };

  return (
    <>
      <HStack >

        {(!s.grouped) ?
          <Tooltip placement="bottom" hasArrow={true} label={'Group apps in highlighted area'} openDelay={400}  >
          <Button  _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }} onClick={handleGroup} colorScheme="teal" size="xs">
            Group
          </Button>
        </Tooltip> : null}
        {(s.grouped) ?
          <Tooltip placement="bottom" hasArrow={true} label={'Ungroup the selected apps'} openDelay={400} >
          <Button  _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }} onClick={handleUngroup} colorScheme="teal" size="xs">
            Ungroup
          </Button>
        </Tooltip> : null}
        {(s.grouped) ?
        <Tooltip placement="bottom" hasArrow={true} label={'Close selected apps'} openDelay={400}>
          <Button  _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }} onClick={handleDismiss}  colorScheme="teal" size="xs">
            Close Apps
          </Button>
        </Tooltip> : null}
        <Tooltip placement="bottom" hasArrow={true} label={'Cancel grouper'} openDelay={400}>
          <Button  _hover={{ opacity: 0.7, transform: 'scaleY(1.3)' }} onClick={()=>deleteApp(props._id)}  colorScheme="teal" size="xs">
            Cancel
          </Button>
        </Tooltip>
      </HStack>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
