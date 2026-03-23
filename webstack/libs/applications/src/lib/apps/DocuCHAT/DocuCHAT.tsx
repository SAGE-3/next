/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import React, { useEffect, useState, useRef } from 'react';

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
import { MdSend, MdRefresh, MdCode } from 'react-icons/md';

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
  const [progressLines, setProgressLines] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [s.messages, progressLines]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || s.isLoading) return;

    const userMessage = {
      id: genId(),
      role: 'user' as const,
      content: inputValue.trim(),
      timestamp: Date.now(),
    };

    // Add user message and start loading
    const newMessages = [...s.messages, userMessage];
    updateState(props._id, { messages: newMessages, isLoading: true });
    const query = inputValue.trim();
    setInputValue('');
    setProgressLines([]);

    // Create an AbortController so clearChat can cancel this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/docuchat/ai-search', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let resultData: any = null;
      let errorMsg: string | null = null;

      // Read the NDJSON stream
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop()!; // keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === 'progress') {
              setProgressLines((prev) => [...prev, event.message]);
            } else if (event.type === 'result' && event.success) {
              resultData = event.data;
            } else if (event.type === 'error') {
              errorMsg = event.message;
            }
          } catch {
            // ignore malformed JSON lines
          }
        }
      }

      // Pipeline finished — build the assistant message
      if (resultData) {
        const paperCount = countPapers(resultData);
        const assistantMessage = {
          id: genId(),
          role: 'assistant' as const,
          content: `Research paper hierarchy generated successfully! Found ${paperCount} papers organized into topics.`,
          timestamp: Date.now(),
          jsonData: resultData,
        };
        updateState(props._id, {
          messages: [...newMessages, assistantMessage],
          isLoading: false,
        });
      } else {
        const assistantMessage = {
          id: genId(),
          role: 'assistant' as const,
          content: errorMsg
            ? `Pipeline error: ${errorMsg}`
            : 'Pipeline completed but did not produce a hierarchy.',
          timestamp: Date.now(),
        };
        updateState(props._id, {
          messages: [...newMessages, assistantMessage],
          isLoading: false,
        });
      }
    } catch (error) {
      // If the request was aborted (e.g. by clearChat), don't add an error message
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      const errorMessage = {
        id: genId(),
        role: 'assistant' as const,
        content: `Error: Failed to connect to AI service. ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
      };
      updateState(props._id, {
        messages: [...newMessages, errorMessage],
        isLoading: false,
      });
    } finally {
      abortControllerRef.current = null;
      setProgressLines([]);
    }
  };

  /** Count total papers in a hierarchy node recursively */
  const countPapers = (node: any): number => {
    if (!node) return 0;
    let count = 0;
    if (node.papers) count += node.papers.length;
    if (node.children) {
      for (const child of node.children) {
        count += countPapers(child);
      }
    }
    return count;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    // Abort any running AiSearch pipeline (closes the connection,
    // which triggers the backend to kill the Python subprocess)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setProgressLines([]);
    updateState(props._id, { messages: [], isLoading: false });
  };

  // Function to transform AI response data to DocuSAGE Tree format
  // Handles both PaperNode format (label, is_document) and
  // AiSearch HierarchyNode format (name, papers[])
  const transformAIDataToTree = (node: any): any => {
    if (!node) {
      console.error('transformAIDataToTree: node is null or undefined');
      return { topic: 'Error', size: 0, children: [], summary: 'Error transforming data' };
    }

    try {
      // Leaf papers array (AiSearch HierarchyNode format)
      if (node.papers && node.papers.length > 0 && (!node.children || node.children.length === 0)) {
        const paperChildren = node.papers.map((p: any) => ({
          topic: p.title || 'Untitled',
          size: 1,
          children: [],
          title: p.title || '',
          authors: p.authors || [],
          year: p.year != null ? String(p.year) : '',
          venue: p.venue || '',
          url: p.url || '',
          abstract: p.abstract || '',
          tldr: p.tldr || '',
          citations: p.citations || 0,
          pdf_url: p.pdf_url || null,
          source: p.source || '',
        }));
        return {
          topic: node.name || node.label || node.topic || 'Untitled',
          size: 0,
          children: paperChildren,
          summary: node.summary || '',
        };
      }

      // Cluster / branch node
      return {
        topic: node.name || node.label || node.topic || 'Untitled',
        size: node.is_document ? 1 : 0,
        children: node.children ? node.children.map(transformAIDataToTree) : [],
        summary: node.summary || '',
        title: node.title || '',
        authors: node.authors || [],
        year: node.year != null ? String(node.year) : '',
        venue: node.venue || '',
      };
    } catch (error) {
      console.error('Error transforming node:', error, node);
      return { topic: 'Error', size: 0, children: [], summary: 'Error transforming data' };
    }
  };

  const createCodeEditorApp = (jsonData: any, filename: string = 'output.json') => {
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

    const appSize = { width: 1000, height: 700, depth: 0 };
    const newPosition = findNextAvailablePosition(appSize, 40);

    createApp({
      title: `CodeEditor - ${filename}`,
      roomId: props.data.roomId,
      boardId: props.data.boardId,
      position: newPosition,
      size: appSize,
      rotation: { x: 0, y: 0, z: 0 },
      type: 'CodeEditor',
      state: {
        content: JSON.stringify(jsonData, null, 2),
        language: 'json',
        fontSize: 14,
        readonly: true,
        filename: filename,
        sources: [],
      },
      raised: true,
      dragging: false,
      pinned: false,
    });
  };

  const createDocuSAGEApp = (hierarchyData: any, visualizationType: 'treemap' | 'tsne' | 'umap' | 'dotplot' | 'linegraph') => {
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
        dotPlotAlgorithm: visualizationType === 'dotplot' ? 'tsne' : undefined,
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
            <Text fontSize="lg" fontWeight="bold">DocuCHAT</Text>
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
              const hierarchyData = (message.role === 'assistant' && message.jsonData) ? message.jsonData : null;

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
                    
                    {/* Action buttons for AI responses with data */}
                    {hierarchyData && (
                      <Box mt={3} pt={2} borderTop="1px" borderColor={borderColor}>
                        <Text fontSize="xs" mb={2} opacity={0.8}>
                          Actions:
                        </Text>
                        <HStack spacing={2} wrap="wrap">
                          <Button
                            size="xs"
                            colorScheme="blue"
                            variant="outline"
                            leftIcon={<MdCode />}
                            onClick={() => createCodeEditorApp(hierarchyData, 'output.json')}
                          >
                            View JSON
                          </Button>
                          {hierarchyData.children && hierarchyData.children.length > 0 && (
                            <>
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
                                colorScheme="green"
                                variant="outline"
                                onClick={() => createDocuSAGEApp(hierarchyData, 'dotplot')}
                              >
                                Dot Plot
                              </Button>
                              <Button
                                size="xs"
                                colorScheme="orange"
                                variant="outline"
                                onClick={() => createDocuSAGEApp(hierarchyData, 'linegraph')}
                              >
                                Line Graph
                              </Button>
                            </>
                          )}
                        </HStack>
                      </Box>
                    )}
                    {hierarchyData && (!hierarchyData.children || hierarchyData.children.length === 0) && (
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
            <Box alignSelf="flex-start" maxW="90%">
              <Box
                bg="white"
                px={4}
                py={3}
                borderRadius="lg"
                shadow="sm"
                border="1px"
                borderColor={borderColor}
              >
                {progressLines.length > 0 ? (
                  <VStack align="stretch" spacing={0} maxH="200px" overflowY="auto">
                    {progressLines.map((line, i) => (
                      <Text key={i} fontSize="xs" fontFamily="mono" color="gray.600" lineHeight="1.6">
                        {line}
                      </Text>
                    ))}
                  </VStack>
                ) : (
                  <Text fontSize="sm" color="gray.500">Starting pipeline...</Text>
                )}
                <HStack mt={2}>
                  <Spinner size="xs" color="blue.400" />
                  <Text fontSize="xs" color="gray.400">Processing...</Text>
                </HStack>
              </Box>
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
