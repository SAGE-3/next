/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { useEffect, useState, useRef } from 'react';

import { 
  Button, 
  ButtonGroup, 
  Tooltip, 
  Box, 
  VStack, 
  HStack, 
  Input, 
  Text, 
  Spinner, 
  useColorModeValue,
  Flex,
  IconButton,
  Divider
} from '@chakra-ui/react';
import { MdSend, MdRefresh } from 'react-icons/md';

import { useAppStore, apiUrls } from '@sage3/frontend';
import { genId } from '@sage3/shared';

import { state as AppState } from "./index";
import { App, AppGroup } from "../../schema";
import { AppWindow } from '../../components';

// Styling
import './styling.css';

/* App component for DocuCHAT */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore(state => state.updateState);
  const createApp = useAppStore(state => state.create);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [s.messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || s.isLoading) return;

    const userMessage = {
      id: genId(),
      role: 'user' as const,
      content: inputValue.trim(),
      timestamp: Date.now(),
    };

    // Add user message
    const newMessages = [...s.messages, userMessage];
    updateState(props._id, { messages: newMessages, isLoading: true });
    setInputValue('');

    try {
      const response = await fetch('/api/docuchat/ai-search', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ query: inputValue.trim() }),
      });

      const result = await response.json();

      const assistantMessage = {
        id: genId(),
        role: 'assistant' as const,
        content: result.success 
          ? `AI Search Results:\n\n${result.data ? JSON.stringify(result.data, null, 2) : 'No data returned from AI search.'}`
          : `Error: ${result.message}`,
        timestamp: Date.now(),
      };

      updateState(props._id, { 
        messages: [...newMessages, assistantMessage], 
        isLoading: false 
      });
    } catch (error) {
      const errorMessage = {
        id: genId(),
        role: 'assistant' as const,
        content: `Error: Failed to connect to AI service. ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
      };

      updateState(props._id, { 
        messages: [...newMessages, errorMessage], 
        isLoading: false 
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    updateState(props._id, { messages: [], isLoading: false });
  };

  // Function to transform AI response data to DocuSAGE Tree format
  const transformAIDataToTree = (node: any): any => {
    if (!node) {
      console.error('transformAIDataToTree: node is null or undefined');
      return {
        topic: 'Error',
        size: 0,
        children: [],
        summary: 'Error transforming data'
      };
    }

    try {
      return {
        topic: node.label || node.topic || 'Untitled',
        size: node.is_document ? 1 : (node.paper_count || 0),
        children: node.children ? node.children.map(transformAIDataToTree) : [],
        summary: node.summary || '',
        title: node.title || '',
        authors: node.authors || [],
        year: node.year || '',
        venue: node.venue || ''
      };
    } catch (error) {
      console.error('Error transforming node:', error, node);
      return {
        topic: 'Error',
        size: 0,
        children: [],
        summary: 'Error transforming data'
      };
    }
  };

  const createDocuSAGEApp = (hierarchyData: any, visualizationType: 'treemap' | 'tsne' | 'linegraph') => {
    console.log('Creating DocuSAGE app with data:', hierarchyData);
    console.log('Visualization type:', visualizationType);
    
    // Helper function to find next available position
    const findNextAvailablePosition = (appSize: { width: number; height: number }, gap: number = 40) => {
      const apps = useAppStore.getState().apps;
      const currentApp = props;
      
      // Get all apps in the same room/board
      const roomApps = Object.values(apps).filter((app: any) => 
        app.data.roomId === currentApp.data.roomId && 
        app.data.boardId === currentApp.data.boardId &&
        app._id !== currentApp._id
      );
      
      // Start with position to the right
      let candidatePosition = {
        x: currentApp.data.position.x + currentApp.data.size.width + gap,
        y: currentApp.data.position.y,
        z: 0
      };
      
      // Check for collisions and find next available position
      const maxAttempts = 30;
      let attempts = 0;
      
      while (attempts < maxAttempts) {
        let hasCollision = false;
        
        for (const app of roomApps) {
          const appLeft = (app as any).data.position.x;
          const appRight = (app as any).data.position.x + (app as any).data.size.width;
          const appTop = (app as any).data.position.y;
          const appBottom = (app as any).data.position.y + (app as any).data.size.height;
          
          const candidateLeft = candidatePosition.x;
          const candidateRight = candidatePosition.x + appSize.width;
          const candidateTop = candidatePosition.y;
          const candidateBottom = candidatePosition.y + appSize.height;
          
          if (!(candidateRight < appLeft || candidateLeft > appRight || 
                candidateBottom < appTop || candidateTop > appBottom)) {
            hasCollision = true;
            break;
          }
        }
        
        if (!hasCollision) {
          return candidatePosition;
        }
        
        // Try next position
        if (attempts < 10) {
          candidatePosition.x += appSize.width + gap;
        } else if (attempts < 20) {
          candidatePosition.x = currentApp.data.position.x + currentApp.data.size.width + gap;
          candidatePosition.y += appSize.height + gap;
        } else {
          candidatePosition.x += appSize.width + gap;
          if (attempts % 10 === 0) {
            candidatePosition.x = currentApp.data.position.x + currentApp.data.size.width + gap;
            candidatePosition.y += appSize.height + gap;
          }
        }
        
        attempts++;
      }
      
      return candidatePosition;
    };

    const appSize = { width: 800, height: 600, depth: 0 };
    const newPosition = findNextAvailablePosition(appSize, 40);

    // Transform the AI data to DocuSAGE Tree format
    console.log('Original hierarchy data:', hierarchyData);
    const transformedData = transformAIDataToTree(hierarchyData);
    console.log('Transformed data:', transformedData);

    createApp({
      title: `DocuSAGE - ${visualizationType.charAt(0).toUpperCase() + visualizationType.slice(1)}`,
      roomId: props.data.roomId,
      boardId: props.data.boardId,
      position: newPosition,
      size: appSize,
      rotation: { x: 0, y: 0, z: 0 },
      type: 'DocuSAGE',
      state: {
        depth: 1,
        selectedTopic: null,
        filteredData: null,
        maxDepth: 3,
        data: transformedData,
        customColors: [
          "#f2c74a", "#7a9ed6", "#b9d98a", "#f06d6d", "#b48ad0", "#b04a6a", "#a0a0a0"
        ],
        visualizationType: visualizationType,
      },
      raised: true,
      dragging: false,
      pinned: false,
    });
  };

  return (
    <AppWindow app={props}>
      <Flex direction="column" height="100%" bg={bgColor}>
        {/* Header */}
        <Box p={4} borderBottom="1px" borderColor={borderColor}>
          <HStack justify="space-between">
            <Text fontSize="lg" fontWeight="bold">DocuCHAT AI</Text>
            <ButtonGroup size="sm">
              <Tooltip label="Clear Chat">
                <IconButton
                  aria-label="Clear chat"
                  icon={<MdRefresh />}
                  onClick={clearChat}
                  variant="ghost"
                />
              </Tooltip>
            </ButtonGroup>
          </HStack>
        </Box>

        {/* Messages */}
        <VStack flex={1} overflowY="auto" p={4} spacing={4} align="stretch">
          {s.messages.length === 0 ? (
            <Box textAlign="center" py={8}>
              <Text color="gray.500">Start a conversation with DocuCHAT AI</Text>
              <Text fontSize="sm" color="gray.400" mt={2}>
                Ask me to search for research papers or any scientific topics!
              </Text>
            </Box>
          ) : (
            s.messages.map((message) => {
              // Check if this is an AI response with data
              const isAIResponse = message.role === 'assistant' && message.content.includes('AI Search Results:');
              let hierarchyData = null;
              
              if (isAIResponse) {
                try {
                  // Extract JSON data from the message content
                  const jsonMatch = message.content.match(/AI Search Results:\n\n([\s\S]*)/);
                  if (jsonMatch) {
                    console.log('Raw JSON string:', jsonMatch[1]);
                    hierarchyData = JSON.parse(jsonMatch[1]);
                    console.log('Parsed hierarchy data:', hierarchyData);
                  } else {
                    console.log('No JSON match found in message:', message.content);
                  }
                } catch (error) {
                  console.error('Error parsing hierarchy data:', error);
                  console.log('Failed to parse JSON string:', message.content);
                }
              }

              return (
                <Box
                  key={message.id}
                  alignSelf={message.role === 'user' ? 'flex-end' : 'flex-start'}
                  maxW="80%"
                >
                  <Box
                    bg={message.role === 'user' ? 'blue.500' : 'white'}
                    color={message.role === 'user' ? 'white' : 'black'}
                    px={4}
                    py={2}
                    borderRadius="lg"
                    shadow="sm"
                    border={message.role === 'assistant' ? '1px' : 'none'}
                    borderColor={borderColor}
                  >
                    <Text fontSize="sm" whiteSpace="pre-wrap">
                      {message.content}
                    </Text>
                    <Text fontSize="xs" opacity={0.7} mt={1}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </Text>
                    
                    {/* Visualization buttons for AI responses with data */}
                    {isAIResponse && hierarchyData && hierarchyData.children && hierarchyData.children.length > 0 && (
                      <Box mt={3} pt={2} borderTop="1px" borderColor={borderColor}>
                        <Text fontSize="xs" mb={2} opacity={0.8}>
                          Visualize with DocuSAGE:
                        </Text>
                        <HStack spacing={2}>
                          <Button
                            size="xs"
                            colorScheme="teal"
                            variant="outline"
                            onClick={() => createDocuSAGEApp(hierarchyData, 'treemap')}
                          >
                            Tree Map
                          </Button>
                          <Button
                            size="xs"
                            colorScheme="purple"
                            variant="outline"
                            onClick={() => createDocuSAGEApp(hierarchyData, 'tsne')}
                          >
                            t-SNE Plot
                          </Button>
                          <Button
                            size="xs"
                            colorScheme="orange"
                            variant="outline"
                            onClick={() => createDocuSAGEApp(hierarchyData, 'linegraph')}
                          >
                            Line Graph
                          </Button>
                        </HStack>
                      </Box>
                    )}
                    {isAIResponse && hierarchyData && (!hierarchyData.children || hierarchyData.children.length === 0) && (
                      <Box mt={3} pt={2} borderTop="1px" borderColor={borderColor}>
                        <Text fontSize="xs" color="gray.500">
                          No hierarchical data available for visualization
                        </Text>
                      </Box>
                    )}
                  </Box>
                </Box>
              );
            })
          )}
          {s.isLoading && (
            <Box alignSelf="flex-start">
              <HStack>
                <Spinner size="sm" />
                <Text fontSize="sm" color="gray.500">AI is thinking...</Text>
              </HStack>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </VStack>

        {/* Input */}
        <Box p={4} borderTop="1px" borderColor={borderColor}>
          <HStack>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me to search for research papers..."
              disabled={s.isLoading}
            />
            <IconButton
              aria-label="Send message"
              icon={<MdSend />}
              onClick={handleSendMessage}
              colorScheme="blue"
              disabled={!inputValue.trim() || s.isLoading}
            />
          </HStack>
        </Box>
      </Flex>
    </AppWindow>
  )
}

/* App toolbar component for the app DocuCHAT */
function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  const clearChat = () => {
    updateState(props._id, { messages: [], isLoading: false });
  };

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="blue" mr="1">
        <Tooltip placement="top-start" hasArrow={true} label={'Clear Chat'} openDelay={400}>
          <Button onClick={clearChat} leftIcon={<MdRefresh />}>
            Clear
          </Button>
        </Tooltip>
      </ButtonGroup>
    </>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = (props: { apps: AppGroup }) => { return null; };

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
