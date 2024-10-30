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
  Input,
} from '@chakra-ui/react';

import { useHexColor, useUsersStore } from '@sage3/frontend';
import { User } from '@sage3/shared/types';

// Props for the AccountDeletion
interface AccountDeletionProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}
type UserStats = {
  userId: string;
  numRooms: number;
  numBoards: number;
  numApps: number;
  numAssets: number;
  numPlugins: number;
};
/**
 * Account Deletion Modal
 * @param props
 * @returns
 */

export function AccountDeletion(props: AccountDeletionProps): JSX.Element {
  const user = props.user;
  const accountDelete = useUsersStore((state) => state.accountDeletion);
  const getUserStats = useUsersStore((state) => state.getUserStats);

  const email = user?.data.email;

  // User stats
  const [stats, setUserStats] = useState<UserStats | null>(null);

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

  useEffect(() => {
    const fetchUserStats = async () => {
      if (user) {
        const data = await getUserStats(user._id);
        console.log(data);
        setUserStats(data);
      }
    };
    fetchUserStats();
  }, [props.isOpen, user, getUserStats]);

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} size="lg" colorScheme="red">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize={'3xl'}>Account Deletion</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text mb={3}>The following will be removed from this SAGE3 Server</Text>
          <Text color={redTextHex} fontWeight={'bold'}>
            Rooms: {stats?.numRooms}
          </Text>
          <Text color={redTextHex} fontWeight={'bold'}>
            Boards: {stats?.numBoards}
          </Text>
          <Text color={redTextHex} fontWeight={'bold'}>
            Apps: {stats?.numApps}
          </Text>
          <Text color={redTextHex} fontWeight={'bold'}>
            Assets: {stats?.numAssets}
          </Text>
          <Text color={redTextHex} fontWeight={'bold'}>
            Plugins: {stats?.numPlugins}
          </Text>
          <Text my={3} fontWeight={'bold'} fontSize={'xl'}>
            This action cannot be undone.
          </Text>

          <Text mt={3}>Please enter your email address below to confirm:</Text>
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
