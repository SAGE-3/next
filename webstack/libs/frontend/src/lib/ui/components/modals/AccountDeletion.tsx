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

import { useHexColor, useUser } from '@sage3/frontend';

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

  const email = user?.data.email;

  const toast = useToast();

  const inputTextPlaceholdColor = useColorModeValue('gray.900', 'gray.100');
  const inputColor = useHexColor(inputTextPlaceholdColor);

  const [value, setValue] = useState('');
  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
  };

  const handleDeleteAccount = () => {
    // Delete account
    toast({
      title: 'Account Deleted',
      description: 'Your account has been deleted.',
      status: 'success',
      duration: 9000,
      isClosable: true,
    });
  };

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} size="lg" colorScheme="red">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize={'2xl'}>Account Deletion</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text>Are you sure you want to delete your account? This action cannot be undone.</Text>
          <Text mt={4}>Please enter your email address below to confirm:</Text>
          <Text mt={2}>{email}</Text>

          <Input
            my="2"
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
