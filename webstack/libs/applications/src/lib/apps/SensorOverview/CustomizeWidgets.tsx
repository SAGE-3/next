/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
  Box,
  Wrap,
  WrapItem,
  Text,
  TabPanel,
  TabPanels,
  Tabs,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import EChartsViewer from './EChartsViewer';
import VariableCard from './VariableCard';
import WidgetCreator from './WidgetCreator';

function CustomizeWidgets(props: {
  widgetsEnabled: { visualizationType: string; yAxisNames: string[]; xAxisNames: string[]; stationNames: string[] }[];
  handleEnableWidget: (index: number) => void;
}) {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [tabIndex, setTabIndex] = useState(0);

  const handleTabsChange = (index: number) => {
    setTabIndex(index);
  };

  return (
    <>
      <Button onClick={onOpen}>Open Modal</Button>

      <Modal scrollBehavior={'inside'} size="xl" isCentered motionPreset="slideInBottom" isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent maxW={'82rem'} maxH="70rem">
          <Tabs index={tabIndex}>
            <TabPanels>
              <TabPanel maxW={'82rem'} maxH="63rem" overflowY="auto">
                <ModalHeader>Add Your Widget</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                  <Wrap>
                    {props.widgetsEnabled.map((widget, index) => {
                      switch (widget.visualizationType) {
                        case 'variableCard':
                          return (
                            <WrapItem>
                              <VariableCard variableName={widget.yAxisNames[0]} variableValue={'99'} />
                            </WrapItem>
                          );
                        case 'line':
                          return (
                            <WrapItem>
                              <EChartsViewer
                                stationNames={['005HI']}
                                visualizationType={widget.visualizationType}
                                dateRange={''}
                                variableType={widget.yAxisNames[0]}
                              />
                            </WrapItem>
                          );

                        default:
                          return <></>;
                      }
                    })}
                    <WrapItem>
                      <Box
                        onClick={() => {
                          handleTabsChange(1);
                          console.log(tabIndex);
                        }}
                        p="1rem"
                        w="300px"
                        h="300px"
                        border="solid white 1px"
                        bgColor={'blackAlpha.700'}
                      >
                        <Text textAlign={'center'}>
                          <strong>Add Widget</strong>
                        </Text>
                        <Text lineHeight={'7rem'} textAlign="center" fontSize={'xl'} verticalAlign={'middle'}>
                          <strong>+</strong>
                        </Text>
                      </Box>
                    </WrapItem>
                  </Wrap>
                </ModalBody>
              </TabPanel>
              <TabPanel>
                <ModalHeader>Create Your Own Widget</ModalHeader>

                <Button
                  onClick={() => {
                    handleTabsChange(0);
                    console.log(tabIndex);
                  }}
                >
                  Go Back
                </Button>
                <WidgetCreator />
              </TabPanel>
              <TabPanel>
                <p>three!</p>
              </TabPanel>
            </TabPanels>
          </Tabs>

          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              Close
            </Button>
            <Button variant="ghost">Secondary Action</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

export default CustomizeWidgets;
