/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Chakra UI Modal for accoutn deletion
import { useEffect, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  Text,
  ModalCloseButton,
  Box,
  useColorModeValue,
  Button,
  useToast,
  Input,
} from '@chakra-ui/react';

import { useHexColor, useUser, useUsersStore } from '@sage3/frontend';

// Props for the AccountDeletion
interface AccountDeletionProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Account Deletion Modal
 * @param props
 * @returns
 */

export function AccountDeletion(props: AccountDeletionProps): JSX.Element {
  const { user } = useUser();

  const accountDelete = useUsersStore((state) => state.accountDeletion);

  const email = user?.data.email;

  const toast = useToast();

  const inputTextPlaceholdColor = useColorModeValue('gray.900', 'gray.100');
  const inputColor = useHexColor(inputTextPlaceholdColor);

  const redText = useColorModeValue('red.500', 'red.300');
  const redTextHex = useHexColor(redText);

  const [value, setValue] = useState('');
  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
  };

  const handleDeleteAccount = () => {
    // Delete account
    const userId = user?._id;
    if (!userId) return;
    accountDelete(userId);
  };

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} size="lg" colorScheme="red">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize={'3xl'}>Account Deletion</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text color={redTextHex} fontWeight={'bold'} fontSize={'lg'}>
            This action cannot be undone.
          </Text>
          <Text mt={6} fontWeight="bold">
            The following will be removed from this SAGE3 Server
          </Text>
          <Text color={redTextHex} fontWeight={'bold'}>
            Your created Rooms, Boards, Apps, and Annotations.
          </Text>
          <Text color={redTextHex} fontWeight={'bold'}>
            Your uploaded Files, Assets, and Plugins.
          </Text>
          <Text color={redTextHex} fontWeight={'bold'}>
            Your User information.
          </Text>

          <Text mt={6}>Please enter your email address below to confirm:</Text>
          <Text>{email}</Text>

          <Input
            my="3"
            value={value}
            onChange={handleEmailChange}
            placeholder="Enter your email"
            _placeholder={{ color: inputColor }}
            size="md"
            width="100%"
          />

          <Box my={2}>
            <Button width="100%" isDisabled={value !== email} colorScheme="red" onClick={handleDeleteAccount}>
              Delete Account
            </Button>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
