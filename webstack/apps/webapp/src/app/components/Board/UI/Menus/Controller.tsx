import { useEffect } from 'react';
import { Box, HStack, Tooltip } from '@chakra-ui/react';
import { useAppStore, useUIStore } from '@sage3/frontend';
import { useNavigate } from 'react-router';

import { ButtonPanel, Panel, PanelProps, IconButtonPanel, IconButtonPanelProps } from '../Panel';
import { MdOpenInFull, MdMap, MdOutlineInfo, MdGroups, MdOutlineWork, MdFolder, MdApps } from 'react-icons/md';

export interface ControllerProps {}

export function Controller(props: ControllerProps) {
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
  const assetMenuShow = useUIStore((state) => state.assetsMenu.show);
  const setAssetMenuShow = useUIStore((state) => state.assetsMenu.setShow);

  const navigate = useNavigate();
  // Redirect the user back to the homepage when he clicks the green button in the top left corner
  function handleHomeClick() {
    navigate('/home');
  }

  return (
    <Panel
      title={'SAGE3'}
      opened={opened}
      setOpened={setOpened}
      setPosition={setPosition}
      position={position}
      width={300}
      showClose={false}
      show={show}
      setShow={setShow}
      stuck={stuck}
      setStuck={setStuck}
    >
      <HStack w="100%">
        <Tooltip label="Info" shouldWrapChildren={true} openDelay={200} hasArrow={true}>
          <IconButtonPanel
            icon={<MdOutlineInfo />}
            description="Information"
            disabled={false}
            used={mainMenushow}
            onClick={() => setMainMenuShow(!mainMenushow)}
          />
        </Tooltip>

        <Tooltip label="Users" shouldWrapChildren={true} openDelay={200} hasArrow={true}>
          <IconButtonPanel
            icon={<MdGroups />}
            description="Avatars"
            disabled={false}
            used={avatarMenuShow}
            onClick={() => setAvatarMenuShow(!avatarMenuShow)}
          />
        </Tooltip>
        <Tooltip label="Apps" shouldWrapChildren={true} openDelay={200} hasArrow={true}>
          <IconButtonPanel
            icon={<MdApps />}
            description="Launch applications"
            disabled={false}
            used={applicationsMenuShow}
            onClick={() => setApplicationsMenuShow(!applicationsMenuShow)}
          />
        </Tooltip>
        <Tooltip label="Assets" shouldWrapChildren={true} openDelay={200} hasArrow={true}>
          <IconButtonPanel
            icon={<MdFolder />}
            description="Assets"
            disabled={false}
            used={assetMenuShow}
            onClick={() => setAssetMenuShow(!assetMenuShow)}
          />
        </Tooltip>
        <Tooltip label="Map" shouldWrapChildren={true} openDelay={200} hasArrow={true}>
          <IconButtonPanel
            icon={<MdMap />}
            description="Navigation"
            disabled={false}
            used={navigationMenuShow}
            onClick={() => setNavigationMenuShow(!navigationMenuShow)}
          />
        </Tooltip>
      </HStack>
    </Panel>
  );
}
function toast(arg0: { title: string; description: string; duration: number; isClosable: boolean; status: string }) {
  throw new Error('Function not implemented.');
}
