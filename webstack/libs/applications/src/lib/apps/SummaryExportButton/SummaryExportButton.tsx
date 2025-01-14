/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { useEffect, useState } from 'react';

import { Box, Button, Center, Checkbox, Flex, FormControl, FormLabel, HStack, VStack } from '@chakra-ui/react';

import { useAppStore, useUserSettings } from '@sage3/frontend';

import { state as AppState } from './index';
import { App, AppGroup } from '../../schema';
import { AppWindow } from '../../components';

// Styling
import './styling.css';
import { callSummary } from './tRPC';
import { useParams } from 'react-router';
import { AskRequest, genId, SummaryQuery } from '@sage3/shared';
import React from 'react';

/* App component for SummaryExportButton */

interface modelInfo {
  name: string;
  model: string;
  maxTokens: number;
}



function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const { roomId, boardId } = useParams();
  const { settings } = useUserSettings();
  const [username, setUsername] = useState('');
  const [selectedModel, setSelectedModel] = useState(settings.aiModel);
  const [location, setLocation] = useState('');
  const [onlineModels, setOnlineModels] = useState<modelInfo[]>([]);

  const updateState = useAppStore((state) => state.updateState);

  // State to track checkbox selections
  const [exportOptions, setExportOptions] = useState({
    allApps: false,
    images: false,
    all: false,
    Stickie: false,
    CodeEditor: false,
    Notepad: false,
    CSV: false,
    PDFViewer: false,
  });

  useEffect(() => {
    if (settings.aiModel) {
      const model = onlineModels.find((m) => m.name === settings.aiModel);
      if (model) {
        setSelectedModel(model.name as 'openai' | 'llama');
      }
    }
  }, [settings.aiModel, onlineModels]);

  // ffunction to handle checkbox changes
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setExportOptions((prevState) => ({
      ...prevState,
      [name]: checked,
    }));
  };

  //function to handle export button click
  const handleExportClick = async () => {
    const { allApps, images, all, Stickie, CodeEditor, Notepad, CSV, PDFViewer } = exportOptions;

    // Initialize the array to store selected apps
    let exportAppsArray: string[] = [];

    // Add the selected options to the array
    if (allApps) {
      exportAppsArray.push('All Apps');
    }
    if (images) {
      exportAppsArray.push('Images');
    }
    if (Stickie) {
      exportAppsArray.push('Stickie Notes');
    }
    if (CodeEditor) {
      exportAppsArray.push('Code Editor');
    }
    if (Notepad) {
      exportAppsArray.push('Notepad');
    }
    if (CSV) {
      exportAppsArray.push('CSVViewer');
    }
    if (PDFViewer) {
      exportAppsArray.push('PDFViewer');
    }
    const body: SummaryQuery = {
      ctx: {
        previousQ: 'Hello, what can you do?',
        previousA: "I'm an AI model",
        pos: [props.data.position.x + props.data.size.width + 20, props.data.position.y],
        roomId: roomId!,
        boardId: boardId!,
      },
      user: username,
      id: genId(),
      model: selectedModel || 'llama',
      location: location,
      apps: exportAppsArray,
    };

    console.log('Calling callSummary!');

    const response = await callSummary(body);

    if ('message' in response) {
      console.log('Errors:', response);
    } else {
      // Log only the report field from the response
      console.log('Report:', response.report);
    }

   
  };

  return (
    <AppWindow app={props}>
      <Flex direction="column" align="center" justify="center" height="25vh">
        <Flex justify="center" align="center" height="5vh"></Flex>

        <VStack align="start" spacing={10} >
          <FormControl>
          <FormLabel fontWeight="bold">AI-Export App Selection</FormLabel>
          <Box
              maxHeight="200px" // Adjust height as needed
              overflowY="auto"
              border="1px solid #e2e8f0" // Optional: add a border for better visibility
              borderRadius="md"
              padding="2"
            >
              <VStack align="start" spacing={2}>
                
                <Checkbox name="CodeEditor" isChecked={exportOptions.CodeEditor} onChange={handleCheckboxChange}>
                  Code Editor{' '}
                </Checkbox>
                <Checkbox name="images" isChecked={exportOptions.images} onChange={handleCheckboxChange}>
                  Images
                </Checkbox>
                <Checkbox name="CSV" isChecked={exportOptions.CSV} onChange={handleCheckboxChange}>
                  CSV
                </Checkbox>
                <Checkbox name="Stickie" isChecked={exportOptions.Stickie} onChange={handleCheckboxChange}>
                  Stickie Notes
                </Checkbox>
                <Checkbox name="Notepad" isChecked={exportOptions.Notepad} onChange={handleCheckboxChange}>
                   Notepad
                </Checkbox>
                <Checkbox name="PDFViewer" isChecked={exportOptions.PDFViewer} onChange={handleCheckboxChange}>
                  PDFViewer{' '}
                </Checkbox>
                {/* Add additional app checkboxes here */}
              </VStack>
            </Box>
          </FormControl>

          <Flex justify="center" width="100%">
        <Button colorScheme="teal" fontSize="lg" fontWeight="bold" onClick={handleExportClick}>
          Export
        </Button>
      </Flex>
        </VStack>
      </Flex>
    </AppWindow>
  );
}

/* App toolbar component for the app SummaryExportButton */
function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  return (
    <>
      <Button colorScheme="green">Action</Button>
    </>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = (props: { apps: AppGroup }) => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
