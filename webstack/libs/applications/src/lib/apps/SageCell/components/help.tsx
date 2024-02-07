/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import {
  Box,
  Button,
  ButtonGroup,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  Text,
  Kbd,
  Container,
} from '@chakra-ui/react';
import { MdClearAll, MdPlayArrow, MdStop } from 'react-icons/md';

/**
 * Props for help modal
 */
type HelpProps = {
  onClose: () => void;
  isOpen: boolean;
};

/**
 * Help modal for Seer app
 * @param props
 * @returns
 */
export function HelpModal(props: HelpProps) {
  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} blockScrollOnMount={false} isCentered={true} size="5xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <Text fontSize={'4xl'}>Welcome to SAGECell</Text>
        </ModalHeader>
        <ModalBody>
          <Box mb={2}>
            <Text fontSize="lg">
              Welcome to SAGECell - a freely moving, collaborative, coding and scripting tool to execute Python commands.
            </Text>
            <Text mt={2}>
              <b>SAGECells</b> allow for real-time interaction between users, Jupyter notebooks, and application "Smartbits" within SAGE3.
              <br />
              <b>Smartbits</b> are the objects created each time you run an app on the board. We can access the app info and
              programmatically perform actions on the board. For example, we can create a new Smartbit, or we can update an existing
              Smartbit. We can also access the board's state, which is a JSON object that contains all the information about the board,
              including the Smartbits and their properties. We can perform machine learning tasks on the board, or we can create a new
              Smartbit based on the results of a given task. You can also use Python SAGECells to create automated workflows that can be
              triggered by events on the board.
            </Text>
          </Box>
          <Box mb={4}>
            <Text>
              You can drop a .py script onto the board to create a SAGECell, or just start typing. Edit the code to fit your needs, and then
              run it using the <b>play button</b> or <Kbd>Shift</Kbd> + <Kbd>Enter</Kbd>. If you change your mind or want to stop the
              process, simply press the <b>stop button</b>. If the code is running and there is an error, the code will stop and the error
              will be displayed in the <b>output box</b>. If you want to clear the code editor, press the <b>clear button</b>. We recently
              added split-pane support, so you can now view adjust how much of the screen is dedicated to the code editor and output box.
            </Text>
            <Text mt={2}>Let's work together to create something amazing!</Text>
            <Text fontSize="md" mt={2}>
              Note: <em>If you prefer to work alone, please select a <b>private</b> kernel from the app toolbar dropdown menu.</em>
            </Text>
          </Box>
          <Container maxW={'container.xl'} p={0}>
            <Box mb={4}>
              <Text>Use the button group below the input boxes to execute, stop, or clear the code editor:</Text>
              <ButtonGroup isAttached variant="outline" size="lg">
                <IconButton aria-label={'Execute'} icon={<MdPlayArrow size={'1.5em'} color="#008080" />} />
                <IconButton aria-label={'Interrupt'} icon={<MdStop size={'1.5em'} color="#008080" />} />
                <IconButton aria-label={''} icon={<MdClearAll size={'1.5em'} color="#008080" />} />
              </ButtonGroup>
            </Box>
          </Container>
          <Box>
            <Text fontSize="md">
              The output of the code will be displayed below. Some of the generated images can be dragged onto the board. We are working to
              add this feature to more output types soon. Use the toolbar at the bottom of the page to select from one of the available
              kernels to get started!
            </Text>
          </Box>
          <Box mt={4}>
            <Text fontSize="md">
              We are always looking for new ideas and feedback. If you have any questions, comments, or suggestions, please don't hesitate
              to reach out to the SAGE3 team. We're always here to help and eager to hear your feedback!
            </Text>
          </Box>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="green" size="sm" mr={3} onClick={props.onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
