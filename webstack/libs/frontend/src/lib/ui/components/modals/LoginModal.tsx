/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { FcGoogle } from 'react-icons/fc';
import { FaGhost } from 'react-icons/fa';

import {
  Button,
  IconButton,
  ButtonGroup,
  Modal,
  ModalContent,
  ModalBody,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react';

import { AuthHTTPService } from '../../../api';
import { BgColor } from '../../theme';

type LoginModalProps = {
  google?: boolean,
  guest?: boolean,
  cilogon?: boolean,
  isOpen: boolean,
  onClose: () => void
}

/**
 * LoginDialog with the various login strategies.
 * @export
 * @param {LoginModalProps} props : Enable or disable the various login strategies
 * @returns JSX.Element
 */
export function LoginModal(props: LoginModalProps): JSX.Element {

  return (

    <Modal isCentered isOpen={props.isOpen} onClose={props.onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>SAGE3 Login</ModalHeader>
        <ModalBody>
          {/* Google Auth Service */}
          <ButtonGroup isDisabled={!props.google} isAttached width="17rem" size="lg">
            <IconButton
              width="6rem"
              px="1rem"
              aria-label="Login with Google"
              icon={<FcGoogle size="25" />}
              pointerEvents="none"
              borderRight={`3px ${BgColor()} solid`}
            />
            <Button
              width="17rem"
              pl="1rem"
              _hover={{ bg: 'teal.200', color: 'rgb(26, 32, 44)' }}
              justifyContent="flex-start"
              onClick={() => AuthHTTPService.loginWithGoogle()}
            >
              Login with Google
            </Button>
          </ButtonGroup>

          {/* Guest Auth Service */}
          <ButtonGroup isDisabled={!props.guest} isAttached width="17rem" size="lg">
            <IconButton
              width="6rem"
              px="1rem"
              aria-label="Login as Guest"
              icon={<FaGhost size="25" color="gray" />}
              pointerEvents="none"
              borderRight={`3px ${BgColor()} solid`}
            />
            <Button
              width="17rem"
              pl="1rem"
              _hover={{ bg: 'teal.200', color: 'rgb(26, 32, 44)' }}
              justifyContent="flex-start"
              onClick={() => AuthHTTPService.loginWithGuest()}
            >
              Login as Guest
            </Button>
          </ButtonGroup>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
