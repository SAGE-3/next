/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState } from 'react';
import {
  Modal,
  Button,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Textarea,
  useToast,
  useColorModeValue,
  Box,
} from '@chakra-ui/react';

import { useUser } from '@sage3/frontend';

type FeedbackProps = {
  onClose: () => void;
  isOpen: boolean;
  url: string;
};

export function FeedbackModal(props: FeedbackProps) {
  const { user } = useUser();

  const textColor = useColorModeValue('gray.800', 'white');

  const [pendingSubmit, setPendingSubmit] = useState(false);

  const [feedbackMessage, setFeedbackMessage] = useState('');
  const handleFeedbackMessageChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFeedbackMessage(event.target.value);
  };

  // Chakra Toast for user ui feedback
  const toast = useToast();

  const handleSubmit = async () => {
    // Check all the form fields are filled out
    if (feedbackMessage === '') {
      toast({
        title: 'Error',
        description: 'Please fill out the feedback message',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Set the pending submit to true
    setPendingSubmit(true);
    // Get this server's url
    const url = window.location.href;

    //  POST request to the feedback endpoint
    const response = await fetch(props.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        feedback: feedbackMessage,
        email: user?.data.email,
        url: url,
      }),
    });
    if (response.ok) {
      toast({
        title: 'Success',
        description: 'Feedback submitted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      setFeedbackMessage('');
      setPendingSubmit(false);
      props.onClose();
    } else {
      toast({
        title: 'Error',
        description: 'Failed to submit feedback',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      setPendingSubmit(false);
    }
  };

  const handleClear = () => {
    setFeedbackMessage('');
  };

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} blockScrollOnMount={false} isCentered={true} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="3xl" paddingBottom="0">
          Feedback/Bug Report
        </ModalHeader>
        <ModalBody>
          {/* Description describing what to type */}
          <p>Please provide feedback or report any bugs you encounter. Your feedback is important to us.</p>
          {/* Form for submiting feedback or bug report */}
          <Textarea
            value={feedbackMessage}
            onChange={handleFeedbackMessageChange}
            size="lg"
            height="400px"
            color={textColor}
            marginTop="16px"
            resize="none"
          />
        </ModalBody>
        <ModalFooter>
          <Box display="flex" justifyContent="space-between" width="100%">
            <Box>
              <Button colorScheme="green" size="md" mr={3} onClick={handleSubmit} isDisabled={pendingSubmit}>
                Submit
              </Button>
            </Box>
            <Box>
              <Button colorScheme="blue" size="md" mr={3} onClick={handleClear}>
                Clear
              </Button>

              <Button colorScheme="red" size="md" onClick={props.onClose}>
                Cancel
              </Button>
            </Box>
          </Box>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
