/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useEffect } from 'react';

import { MdPerson, MdOutlineLogout } from 'react-icons/md';
import { Avatar, MenuButton, Menu, MenuList, MenuItem, MenuOptionGroup, useDisclosure, Box, Placement } from '@chakra-ui/react';

import { AuthService, useUser } from '@sage3/frontend/services';
import { fixedCharAt } from '@sage3/frontend/utils/misc/strings';
import { EditProfileModal } from '../user-editprofile/editprofile';
import { UserNameModal } from '../user-name-modal/usernamemodal';

function SAGEAvatar(props: { style?: React.CSSProperties; avatarSize?: string; menuPlacement?: Placement }) {
  const { name, color, profilePicture, userType, userRole } = useUser();
  const { isOpen, onOpen, onClose } = useDisclosure({ id: 'avatar' });

  const { isOpen: isNameOpen, onOpen: onNameOpen, onClose: onNameClose } = useDisclosure({ id: 'username' });

  // Open the name change panel
  useEffect(() => {
    if (name) {
      if (name.includes('Guest#')) {
        onNameOpen();
      }
    }
  }, [name]);

  return (
    <Box style={props.style ? props.style : {}}>
      <Menu placement={props.menuPlacement ? props.menuPlacement : undefined}>
        <MenuButton>
          <Avatar
            name={name}
            src={profilePicture}
            getInitials={(name) => {
              // same as charAt() but with better support
              return fixedCharAt(name, 0);
            }}
            mr={0}
            bg={color}
            textShadow={"0 0 2px #000"}
            borderRadius={userType == 'wall' ? '0%' : '100%'}
            color={'white'}
            size={props.avatarSize ? props.avatarSize : 'md'}
            showBorder={true}
            borderColor="whiteAlpha.600"
          />
          {userRole == 'guest' ? (
            <div
              style={{
                borderRadius: '100%',
                color: 'black',
                fontWeight: 'bold',
                fontSize: '12px',
                lineHeight: '1rem',
                textAlign: 'center',
                backgroundColor: 'white',
                height: '1rem',
                width: '1rem',
                transform: 'translate(2px, -14px)',
                position: 'absolute',
              }}
            >
              G
            </div>
          ) : null}
        </MenuButton>
        <MenuList>
          <MenuOptionGroup title={name ? name.trim().substring(0, 19) : ''}>
            <MenuItem icon={<MdPerson />} onClick={onOpen}>
              Edit Profile
            </MenuItem>
            <MenuItem onClick={() => AuthService.logout()} icon={<MdOutlineLogout />}>
              Logout
            </MenuItem>
          </MenuOptionGroup>
        </MenuList>
      </Menu>
      <EditProfileModal isOpen={isOpen} onClose={onClose} />
      <UserNameModal isOpen={isNameOpen} onClose={onNameClose} />
    </Box>
  );
}

export const UserAvatar = React.memo(SAGEAvatar);
