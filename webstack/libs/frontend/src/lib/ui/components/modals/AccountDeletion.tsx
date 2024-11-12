/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

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
  Table,
  TableContainer,
  Tbody,
  Td,
  Tr,
  useToast,
  Progress,
  Icon,
  FormControl,
  FormLabel,
  Switch,
  Tooltip,
} from '@chakra-ui/react';
import { MdInfo } from 'react-icons/md';

import { formatDateAndTime, useHexColor, useUsersStore } from '@sage3/frontend';
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
 * Chakra UI Modal for account deletion
 * @param props
 * @returns
 */

export function AccountDeletion(props: AccountDeletionProps): JSX.Element {
  const user = props.user;
  const accountDelete = useUsersStore((state) => state.accountDeletion);
  const getUserStats = useUsersStore((state) => state.getUserStats);

  const email = user?.data.email;
  const name = user?.data.name;
  const userJoinedDate = formatDateAndTime(user?._createdAt);

  // User stats
  const [stats, setUserStats] = useState<UserStats | null>(null);

  const inputTextPlaceholdColor = useColorModeValue('gray.900', 'gray.100');
  const inputColor = useHexColor(inputTextPlaceholdColor);

  const redText = useColorModeValue('red.500', 'red.300');
  const redTextHex = useHexColor(redText);

  // Processing
  const [isProcessing, setProcessing] = useState(false);

  //
  const [emailValue, setEmailValue] = useState('');
  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmailValue(event.target.value);
  };

  // Delete all data checkbox state
  const [deleteAllData, setDeleteAllData] = useState<boolean>(false);
  const handleDeleteAllData = () => {
    setDeleteAllData(!deleteAllData);
  };

  // Toast for success or error
  const toast = useToast();

  const handleDeleteAccount = async () => {
    // Delete account
    const userId = user?._id;
    if (!userId) return;
    setProcessing(true);
    const response = await accountDelete(userId, deleteAllData);
    setProcessing(false);
    props.onClose();
    // Toast message
    toast({
      title: response.success ? 'Account Deleted' : 'Failed to Delete Account',
      description: response.success ? 'The account has been deleted' : response.message,
      status: response.success ? 'success' : 'error',
      duration: 5000,
      isClosable: true,
    });
  };

  useEffect(() => {
    const fetchUserStats = async () => {
      if (user) {
        setProcessing(true);
        const data = await getUserStats(user._id);
        setUserStats(data);
        setProcessing(false);
      }
    };

    fetchUserStats();
    setDeleteAllData(false);
  }, [props.isOpen, user, getUserStats]);

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} size="lg" colorScheme="red" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize={'3xl'}>Account Deletion</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {isProcessing ? (
            <Progress mb="3" isIndeterminate colorScheme="teal" />
          ) : (
            <>
              <Text mb={3} fontSize="xl">
                Account Information:
              </Text>
              <TableContainer width="100%" mb="3">
                <Table size="sm">
                  <Tbody px="1">
                    <Tr>
                      <Td>Username</Td>
                      <Td> {name}</Td>
                    </Tr>
                    <Tr>
                      <Td>Email</Td>
                      <Td>{email}</Td>
                    </Tr>
                    <Tr>
                      <Td>Creation Date</Td>
                      <Td>{userJoinedDate}</Td>
                    </Tr>
                  </Tbody>
                </Table>
              </TableContainer>
              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="delete-data" mb="0">
                  Delete Account Data
                </FormLabel>
                <Switch id="delete-data" colorScheme="red" onChange={handleDeleteAllData} isChecked={deleteAllData} />
                <Tooltip
                  defaultIsOpen={false}
                  label={
                    'Your data will be retained and transferred to the SAGE3 server administrator unless you choose to delete all data associated with your account.'
                  }
                  placement="top"
                  shouldWrapChildren={true}
                  openDelay={200}
                  hasArrow={true}
                >
                  <Icon transform={`translate(4px, 2px)`} as={MdInfo}></Icon>
                </Tooltip>
              </FormControl>
              {/* Show data in a table */}
              {deleteAllData && (
                <TableContainer width="280px">
                  <Table size="sm">
                    <Tbody>
                      <Tr>
                        <Td>Rooms</Td>
                        <Td> {stats?.numRooms}</Td>
                      </Tr>
                      <Tr>
                        <Td>Boards</Td>
                        <Td>{stats?.numBoards}</Td>
                      </Tr>
                      <Tr>
                        <Td>Apps</Td>
                        <Td>{stats?.numApps}</Td>
                      </Tr>
                      <Tr>
                        <Td>Assets</Td>
                        <Td> {stats?.numAssets}</Td>
                      </Tr>
                      <Tr>
                        <Td>Plugins</Td>
                        <Td> {stats?.numPlugins}</Td>
                      </Tr>
                    </Tbody>
                  </Table>
                </TableContainer>
              )}

              <Text fontWeight={'bold'} fontSize={'md'} color={redTextHex} my={2}>
                Warning: This action is permanent and cannot be undone.
              </Text>
              <Text mt={3}>Please enter the account's email address below to confirm:</Text>
              <Text fontWeight={'bold'} fontSize="xl" color={redTextHex}>
                {email}
              </Text>

              <Input
                my="3"
                value={emailValue}
                onChange={handleEmailChange}
                placeholder="Enter your email"
                _placeholder={{ color: inputColor }}
                size="md"
                width="100%"
              />

              <Box my={2}>
                <Button width="100%" isDisabled={emailValue !== email} colorScheme="red" onClick={handleDeleteAccount}>
                  Delete Account
                </Button>
              </Box>
            </>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
