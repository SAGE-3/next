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
  Flex,
  IconButton,
  Image,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  Text,
  Kbd,
  HStack,
  Container,
  Spacer,
} from '@chakra-ui/react';
import { MdClearAll, MdPlayArrow, MdStop } from 'react-icons/md';

import { ReactComponent as AppIcon } from './icon.svg';
import imgSource from './seer_icon.png';
import docsImageSource from './sage3-docs-how-to-use.png';
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
          <HStack>
            <Text fontSize={'48px'}>Welcome to Seer</Text>
            <Spacer />
            {/* <AppIcon height={'50px'} /> */}
            <Image src={imgSource} alt="Image" boxSize="64px" />
          </HStack>
        </ModalHeader>
        <ModalBody>
          <Box mb={4}>
            <Flex alignItems="center">
              <Text fontSize="xl">
                The SAGE3 application, <b>Seer</b>, is a powerful tool for generating code that currently focuses on working with Pandas
                dataframes.
              </Text>
            </Flex>
            <Text mt={2}>
              Whether you're a seasoned programmer or have little to no experience, <b>Seer</b> is designed to be flexible and extensible,
              allowing you to start wrangling and analyzing data right away.
            </Text>
          </Box>
          <Box mb={4}>
            <Text fontSize="md">
              To generate code, simply enter a natural language prompt in the first input box, and then press <Kbd>Shift</Kbd> +{' '}
              <Kbd>Enter</Kbd> or the play button from within the <i>Prompt Editor</i> to begin the process.
            </Text>
            <Text fontSize="md" mt={2}>
              The generated code will appear in the second input box, which is a code editor. You can edit the code to fit your needs, and
              then run it again using the play button or <Kbd>Shift</Kbd> + <Kbd>Enter</Kbd> from within the <i>Code Editor</i>. If you
              change your mind or want to stop the process, simply press the stop button.
            </Text>
            <Text mt={2}>Let's work together to create something amazing!</Text>
            <Text fontSize="md" color="gray.500" mt={2}>
              {/* ** Note: If you prefer to work alone, please select a <b>private</b> kernel from the app toolbar dropdown menu. */}
            </Text>
          </Box>
          <Container maxW={'container.xl'}>
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
              Just like in SAGECells, the output of the code will be displayed in the <i>Output Box</i>. Some of the generated images can be
              dragged onto the board. We are working to add this feature to more output types soon. Use the toolbar at the bottom of the
              page to select from one of the available kernels to get started!
            </Text>
          </Box>
          <Box mt={4}>
            <Text fontSize="md">
              We are always looking for new ideas and feedback. If you have any questions, comments, or suggestions, please don't hesitate
              to reach out to the SAGE3 team. We're always here to help and eager to hear your feedback!
            </Text>
          </Box>
          <Box mt={4}></Box>
          <Flex justifyContent="center" alignItems="center">
            <Image boxSize={'48px'} src={docsImageSource} alt="SAGE3 Docs" />
          </Flex>
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
