import { useEffect } from 'react';
import { Box, HStack } from '@chakra-ui/react';
 import { useAppStore, useUIStore } from '@sage3/frontend';
 import { useNavigate } from 'react-router';
 
 import { ButtonPanel, Panel , PanelProps, IconButtonPanel, IconButtonPanelProps} from '../Panel';
 import { MdOpenInFull, MdMap, MdOutlineInfo, MdGroups , MdOutlineWork } from 'react-icons/md';

 export interface ControllerProps  {
    
  };

 export function Controller(props: ControllerProps){
    //const setMenuPanelPosition = props.setPosition;
    //const menuPanelPosition = props.position;
    const boardPosition = useUIStore((state) => state.boardPosition);

    const position = useUIStore((state) => state.controller.position);
    const setPosition = useUIStore((state) => state.controller.setPosition);
    const opened = useUIStore((state) => state.controller.opened);
    const setOpened = useUIStore((state) => state.controller.setOpened);
    const show = useUIStore((state) => state.controller.show);
    const setShow = useUIStore((state) => state.controller.setShow);
    const stuck = useUIStore((state) => state.controller.stuck);
    const setStuck = useUIStore((state) => state.controller.setStuck);

    const mainMenushow = useUIStore((state) => state.mainMenu.show);
    const setMainMenuShow = useUIStore((state) => state.mainMenu.setShow);
    const avatarMenuShow = useUIStore((state) => state.avatarMenu.show);
    const setAvatarMenuShow = useUIStore((state) => state.avatarMenu.setShow);
    const applicationsMenuShow = useUIStore((state) => state.applicationsMenu.show);
    const setApplicationsMenuShow = useUIStore((state) => state.applicationsMenu.setShow);
    const navigationMenuShow = useUIStore((state) => state.navigationMenu.show);
    const setNavigationMenuShow = useUIStore((state) => state.navigationMenu.setShow);

    

    const navigate = useNavigate();
     // Redirect the user back to the homepage when he clicks the green button in the top left corner
    function handleHomeClick() {
        navigate('/home');
    }

    const apps = useAppStore((state) => state.apps);
    const deleteApp = useAppStore((state) => state.delete);

    return(
        <Panel 
            title={'SAGE3'} 
            opened={opened} 
            setOpened={setOpened} 
            setPosition={setPosition} 
            position={position} 
            width={260} 
            showClose={false}
            show={show} 
            setShow={setShow}
            stuck={stuck}
            setStuck={setStuck}
            >
            
                <HStack w="100%" >
                    <IconButtonPanel icon={<MdOutlineWork />} description="Launch applications" disabled={false} used={applicationsMenuShow}  onClick={()=>setApplicationsMenuShow(!applicationsMenuShow)}/>
                    <IconButtonPanel icon={<MdOutlineInfo />} description="Information" disabled={false} used={mainMenushow}  onClick={()=>setMainMenuShow(!mainMenushow)}/>
                    <IconButtonPanel icon={<MdGroups />} description="Avatars" disabled={false} used={avatarMenuShow} onClick={()=>setAvatarMenuShow(!avatarMenuShow)} />
                    <IconButtonPanel icon={<MdMap />} description="Navigation" disabled={false} used={navigationMenuShow}  onClick={()=>setNavigationMenuShow(!navigationMenuShow)}/> 
               </HStack>
           
        </Panel>
    );
      
 }
