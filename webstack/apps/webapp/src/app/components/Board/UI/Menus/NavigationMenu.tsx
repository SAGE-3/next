/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

 import { useEffect, useState, useRef, createContext } from 'react';
 import { Box, useColorModeValue, Text } from '@chakra-ui/react';
 import { useAppStore, useUIStore } from '@sage3/frontend';
 import { Rnd } from 'react-rnd';

 import { ButtonPanel, Panel , PanelProps} from '../Panel';

 export interface MinimapProps  {
     width: number;
  // position: { x: number; y: number };
  // setPosition: (pos: { x: number; y: number }) => void;
  // stuck?: boolean;
 };
 
 export function NavigationMenu(props: MinimapProps) {
   // App Store
   const apps = useAppStore((state) => state.apps);
   // UI store
   const position = useUIStore((state) => state.navigationMenu.position);
   const setPosition = useUIStore((state) => state.navigationMenu.setPosition);
   const opened = useUIStore((state) => state.navigationMenu.opened);
   const setOpened = useUIStore((state) => state.navigationMenu.setOpened);
   const showUI = useUIStore((state) => state.showUI);
   // Theme
   const textColor = useColorModeValue('gray.800', 'gray.100');
   
   //const setNavPanelPosition = props.setPosition;
   //const navPanelPosition = props.position;

   function handleDblClick(e: any) {
     e.stopPropagation();
   }
 
  /* useEffect(() => {
     const resizeObserver = (e: UIEvent) => {
       props.setPosition({ x: window.innerWidth - 262, y: window.innerHeight - 156 });
     };
     if (stuck) {
       props.setPosition({ x: window.innerWidth - 262, y: window.innerHeight - 156 });
       window.addEventListener('resize', resizeObserver);
     }
     return () => {
       if (stuck) window.removeEventListener('resize', resizeObserver);
     }
   }, [stuck]);
   */
 
     return (
         
        <Panel title={"Mini Map"} opened={opened} setOpened={setOpened} setPosition={setPosition} position={position} width={props.width}  >
            
             <Box alignItems="center" p="1" width="100%" display="flex">
               <Box height={2500 / 25 + 'px'} width={5000 / 25 + 'px'} backgroundColor="#586274" borderRadius="md" border="solid teal 2px">
                 <Box position="absolute">
                   {apps.map((app) => {
                     return (
                       <Box
                         key={app._id}
                         backgroundColor="teal"
                         position="absolute"
                         left={app.data.position.x / 25 + 'px'}
                         top={app.data.position.y / 25 + 'px'}
                         width={app.data.size.width / 25 + 'px'}
                         height={app.data.size.height / 25 + 'px'}
                         transition={'all .2s'}
                       ></Box>
                     );
                   })}
                 </Box>
                </Box>
            </Box>
            
       </Panel>);
     
 }
 