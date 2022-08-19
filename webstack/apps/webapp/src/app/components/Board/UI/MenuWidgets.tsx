/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

 import { Box, useDisclosure } from '@chakra-ui/react';
 import { Applications, initialValues } from '@sage3/applications/apps';
 import { AppName } from '@sage3/applications/schema';
 import { AssetModal, ContextMenu, UploadModal, useAppStore, useBoardStore, useUIStore, useUser } from '@sage3/frontend';
 import { useNavigate } from 'react-router';
 //import { AppToolbar } from './UI/AppToolbar';
 //import { BoardContextMenu } from './UI/BoardContextMenu';
 
 //import { InfoPanel } from './UI/InfoPanel';
 //import { MiniMap } from './UI/Minimap';
 import { ButtonPanel, Panel , PanelProps} from './Panel';
 import { Twilio } from './Twilio';

 export interface MainMenuProps extends PanelProps {
    assetOnOpen: any;
    uploadOnOpen:  any;
  };

 export function MainMenu2(props: MainMenuProps){
    const setMenuPanelPosition = props.setPosition;
    const menuPanelPosition = props.position;
    const boardPosition = useUIStore((state) => state.boardPosition);

    const navigate = useNavigate();
     // Redirect the user back to the homepage when he clicks the green button in the top left corner
    function handleHomeClick() {
        navigate('/home');
    }

    const apps = useAppStore((state) => state.apps);
    const deleteApp = useAppStore((state) => state.delete);

    return(
        <Panel title={'Main Menu'} opened={true} setPosition={setMenuPanelPosition} position={menuPanelPosition} height={182} >
            <ButtonPanel title="Home" onClick={handleHomeClick} colorScheme="blackAlpha" />
            <ButtonPanel title="Asset Browser" onClick={props.assetOnOpen} />
            <ButtonPanel title="Upload" onClick={props.uploadOnOpen} />
            <ButtonPanel title="Clear Board" onClick={() => apps.forEach((a) => deleteApp(a._id))} />
        </Panel>
    );
      
 }

 