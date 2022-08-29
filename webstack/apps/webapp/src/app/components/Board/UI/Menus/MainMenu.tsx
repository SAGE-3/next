/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

 import { Box } from '@chakra-ui/react';
 import { useAppStore, useUIStore } from '@sage3/frontend';
 import { useNavigate } from 'react-router';
 
 import { ButtonPanel, Panel , PanelProps} from '../Panel';

 export interface MainMenuProps  {
    assetOnOpen: any;
    uploadOnOpen:  any;
  };

 export function MainMenu(props: MainMenuProps){
    //const setMenuPanelPosition = props.setPosition;
    //const menuPanelPosition = props.position;
    const boardPosition = useUIStore((state) => state.boardPosition);

    const position = useUIStore((state) => state.mainMenu.position);
    const setPosition = useUIStore((state) => state.mainMenu.setPosition);
    const opened = useUIStore((state) => state.mainMenu.opened);
    const setOpened = useUIStore((state) => state.mainMenu.setOpened);

    const navigate = useNavigate();
     // Redirect the user back to the homepage when he clicks the green button in the top left corner
    function handleHomeClick() {
        navigate('/home');
    }

    const apps = useAppStore((state) => state.apps);
    const deleteApp = useAppStore((state) => state.delete);

    return(
        <Panel title={'Main Menu'} opened={opened} setOpened={setOpened} setPosition={setPosition} position={position}  >
            <Box><ButtonPanel title="Home" onClick={handleHomeClick} colorScheme="blackAlpha" />
            <ButtonPanel title="Asset Browser" onClick={props.assetOnOpen} />
            <ButtonPanel title="Upload" onClick={props.uploadOnOpen} />
            <ButtonPanel title="Clear Board" onClick={() => apps.forEach((a) => deleteApp(a._id))} /></Box>
        </Panel>
    );
      
 }

 