/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import React, { useState } from 'react';
import { Button, Select, Slider, SliderTrack, SliderFilledTrack, SliderThumb, SliderMark, Box, Input, Tooltip, Text as ChakraText, useColorModeValue } from '@chakra-ui/react';
import { useAppStore } from '@sage3/frontend';
import { App, AppGroup } from '../../schema';
import { AppWindow } from '../../components';
import { data, Tree, transformToTree } from './data';
import { CircularPacking } from './visualizations/CircularPacking';
import { Treemap } from './visualizations/Treemap';
import { Force } from './visualizations/Force';
import { TSNE } from './visualizations/TSNE';
import { UMAP } from './visualizations/UMAP';
import { DotPlot } from './visualizations/DotPlot';
import { LineGraph } from './visualizations/LineGraph';

// Slightly lighten each color by about 8%
const colors = [
  "#f2c74a", // lighter #e0ac2b
  "#7a9ed6", // lighter #6689c6
  "#b9d98a", // lighter #a4c969
  "#f06d6d", // lighter #e85252
  "#b48ad0", // lighter #9a6fb0
  "#b04a6a", // lighter #a53253
  "#a0a0a0", // lighter #7f7f7f
];

// Default colors for reset functionality
const defaultColors = [...colors];

// Fixed aspect ratio for DocuSAGE apps (4:3)
const DOCUSAGE_ASPECT_RATIO = 16/9;

export type AppState = {
  depth: number;
  selectedTopic: string | null;
  filteredData: Tree | null;
  maxDepth: number;
  data?: Tree;
  customColors?: string[]; // Add custom colors to state
  visualizationType?: 'treemap' | 'tsne' | 'umap' | 'dotplot' | 'linegraph'; // Add visualization type
  dotPlotAlgorithm?: 'tsne' | 'umap'; // Algorithm for dot plot
};

export const state: AppState = {
  depth: 1,
  selectedTopic: null,
  filteredData: null,
  maxDepth: 3, // Default to 3, will be calculated from data
  customColors: [...defaultColors], // Initialize with default colors
  visualizationType: 'treemap', // Default to treemap
  dotPlotAlgorithm: 'tsne', // Default algorithm for dot plot
};

/* App component for DocuSAGE */
export const AppComponent = (props: App): JSX.Element => {
  const s = props.data.state as AppState;
  
  // Color mode values for dark/light theme support
  const hoverTitleBg = useColorModeValue('white', 'gray.800');
  const hoverTitleColor = useColorModeValue('#222', 'gray.100');
  const hoverTitleBorder = useColorModeValue('#eee', 'gray.600');
  const updateState = useAppStore((state) => state.updateState);
  const createApp = useAppStore((state) => state.create);

  const [hoverTitle, setHoverTitle] = useState<string | null>(null); // <-- add this
  
  // Calculate the number of top-level nodes for color management
  const calculateTopLevelCount = (node: Tree): number => {
    return node.children ? node.children.length : 0;
  };
  
  const topLevelCount = s.filteredData ? calculateTopLevelCount(s.filteredData) : calculateTopLevelCount(s.data || data);
  
  // Helper function to find next available position
  const findNextAvailablePosition = (appSize: { width: number; height: number }, gap: number = 40, preferBelow: boolean = false) => {
    const apps = useAppStore.getState().apps;
    const currentApp = props;
    
    // Get all apps in the same room/board
    const roomApps = Object.values(apps).filter((app: any) => 
      app.data.roomId === currentApp.data.roomId && 
      app.data.boardId === currentApp.data.boardId &&
      app._id !== currentApp._id
    );
    
    // Start with preferred position based on type
    let candidatePosition = preferBelow ? {
      x: currentApp.data.position.x,
      y: currentApp.data.position.y + currentApp.data.size.height + gap,
      z: 0
    } : {
      x: currentApp.data.position.x + currentApp.data.size.width + gap,
      y: currentApp.data.position.y,
      z: 0
    };
    
    // Check for collisions and find next available position
    const maxAttempts = 30; // Prevent infinite loop
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      let hasCollision = false;
      
      // Check collision with each existing app
      for (const app of roomApps) {
        const appLeft = (app as any).data.position.x;
        const appRight = (app as any).data.position.x + (app as any).data.size.width;
        const appTop = (app as any).data.position.y;
        const appBottom = (app as any).data.position.y + (app as any).data.size.height;
        
        const candidateLeft = candidatePosition.x;
        const candidateRight = candidatePosition.x + appSize.width;
        const candidateTop = candidatePosition.y;
        const candidateBottom = candidatePosition.y + appSize.height;
        
        // Check if rectangles overlap
        if (!(candidateRight < appLeft || candidateLeft > appRight || 
              candidateBottom < appTop || candidateTop > appBottom)) {
          hasCollision = true;
          break;
        }
      }
      
      if (!hasCollision) {
        return candidatePosition;
      }
      
      // Try next position based on preference
      if (preferBelow) {
        // For below preference: try right, then further down, then diagonal
        if (attempts % 3 === 0) {
          // Move right
          candidatePosition.x += appSize.width + gap;
        } else if (attempts % 3 === 1) {
          // Move further down
          candidatePosition.y += appSize.height + gap;
        } else {
          // Move diagonal
          candidatePosition.x += appSize.width + gap;
          candidatePosition.y += appSize.height + gap;
        }
      } else {
        // For right preference: systematically try positions in a grid pattern
        // First row: keep moving right
        if (attempts < 10) {
          candidatePosition.x += appSize.width + gap;
        } else if (attempts < 20) {
          // Second row: move down and start from left
          candidatePosition.x = currentApp.data.position.x + currentApp.data.size.width + gap;
          candidatePosition.y += appSize.height + gap;
        } else {
          // Third row and beyond: continue the grid pattern
          candidatePosition.x += appSize.width + gap;
          if (attempts % 10 === 0) {
            candidatePosition.x = currentApp.data.position.x + currentApp.data.size.width + gap;
            candidatePosition.y += appSize.height + gap;
          }
        }
      }
      
      attempts++;
    }
    
    // If we can't find a position, use the preferred fallback
    return preferBelow ? {
      x: currentApp.data.position.x,
      y: currentApp.data.position.y + currentApp.data.size.height + gap,
      z: 0
    } : {
      x: currentApp.data.position.x + currentApp.data.size.width + gap,
      y: currentApp.data.position.y,
      z: 0
    };
  };

  const handlePaperClick = (paper: any) => {
    // Use 8.5x11 aspect ratio for paper
    const DOCUPAGE_ASPECT_RATIO = 8.5 / 11;
    const baseWidth = 850;
    const paperSize = { width: baseWidth, height: Math.round(baseWidth / DOCUPAGE_ASPECT_RATIO), depth: 0 };
    const newPosition = findNextAvailablePosition(paperSize, 60, false); // Papers prefer right
    
    createApp({
      title: paper.title || paper.topic,
      roomId: props.data.roomId,
      boardId: props.data.boardId,
      position: newPosition,
      size: paperSize,
      rotation: { x: 0, y: 0, z: 0 },
      type: 'DocuPAGE',
      state: {
        topic: paper.topic || '',
        title: paper.title,
        authors: paper.authors,
        year: paper.year,
        venue: paper.venue,
        summary: paper.summary,
      },
      raised: true,
      dragging: false,
      pinned: false,
    });
  };

  const handleCircleClick = (topic: string) => {
    // Find the clicked node's data
    const clickedNode = findNodeByTopic(s.data || data, topic);
    if (!clickedNode) return;

    // Create a new application with just this node's data
    const newAppState = {
      ...s,
      selectedTopic: topic,
      filteredData: clickedNode,
      depth: Math.max(1, (s.depth || 1) - 1), // Set depth to main view's depth - 1, but at least 1
      customColors: s.customColors || [...defaultColors], // Ensure custom colors are included
    };

    // Use consistent aspect ratio
    const baseWidth = props.data.size.width;
    const consistentSize = { width: baseWidth, height: Math.round(baseWidth / DOCUSAGE_ASPECT_RATIO), depth: 0 };
    const newPosition = findNextAvailablePosition(consistentSize, 40, true); // Filtered layers prefer below

    // Create the new application with consistent aspect ratio
    createApp({
      title: topic,
      roomId: props.data.roomId,
      boardId: props.data.boardId,
      position: newPosition,
      size: consistentSize, // Use consistent aspect ratio
      rotation: { x: 0, y: 0, z: 0 },
      type: 'DocuSAGE',
      state: newAppState,
      raised: true,
      dragging: false,
      pinned: false,
    });
  };

  // Immutable rename of a node topic
  function renameNode(root: Tree, targetTopic: string, newName: string): Tree {
    const recur = (node: Tree): Tree => {
      const renamed: Tree = {
        ...node,
        topic: node.topic === targetTopic ? newName : node.topic,
        children: node.children ? node.children.map(recur) : [],
      } as Tree;
      return renamed;
    };
    return recur(root);
  }

  // Immutable move of a leaf (paper) to another target topic (non-leaf)
  function moveLeaf(root: Tree, paperTopic: string, targetTopic: string): Tree {
    let leafNode: Tree | null = null;

    // Remove leaf from current parent
    const removeLeaf = (node: Tree): Tree => {
      if (!node.children || node.children.length === 0) return node;
      const newChildren: Tree[] = [];
      for (const child of node.children) {
        if (child.topic === paperTopic && (!child.children || child.children.length === 0)) {
          leafNode = child; // capture
          continue; // drop from this parent's children
        }
        newChildren.push(removeLeaf(child));
      }
      return { ...node, children: newChildren } as Tree;
    };

    const pruned = removeLeaf(root);
    if (!leafNode) return root; // nothing moved

    // Insert leaf under target topic
    const insertLeaf = (node: Tree): Tree => {
      if (node.topic === targetTopic) {
        const updatedChildren = [...(node.children || []), { ...leafNode! }];
        return { ...node, children: updatedChildren } as Tree;
      }
      if (!node.children || node.children.length === 0) return node;
      return { ...node, children: node.children.map(insertLeaf) } as Tree;
    };

    return insertLeaf(pruned);
  }

  const handleRequestRename = (nodeTopic: string, newName: string) => {
    const current = s.data || data;
    const updated = renameNode(current, nodeTopic, newName);
    const newFiltered = s.selectedTopic ? findNodeByTopic(updated, s.selectedTopic) : null;
    updateState(props._id, { data: updated, filteredData: newFiltered });
  };

  const handleRequestMove = (paperTopic: string, targetTopic: string) => {
    const current = s.data || data;
    const updated = moveLeaf(current, paperTopic, targetTopic);
    const newFiltered = s.selectedTopic ? findNodeByTopic(updated, s.selectedTopic) : null;
    updateState(props._id, { data: updated, filteredData: newFiltered });
  };

  const visualizationProps = {
    width: props.data.size.width,
    height: props.data.size.height,
    data: s.data || data,
    state: s,
    onCircleClick: handleCircleClick,
    colors: (s.customColors || defaultColors).slice(0, topLevelCount), // Use only colors needed for top-level nodes
    onDepthChange: (depth: number) => updateState(props._id, { depth }),
    onTitleHover: setHoverTitle,
    onPaperClick: handlePaperClick,
    topLevelCount: topLevelCount, // Pass the calculated topLevelCount
    onRequestMove: handleRequestMove,
    onRequestRename: handleRequestRename,
  };

  const handleDotPlotAlgorithmChange = (algorithm: 'tsne' | 'umap') => {
    updateState(props._id, { dotPlotAlgorithm: algorithm });
  };

  const renderVisualization = () => {
    // Choose visualization based on type
    if (s.visualizationType === 'dotplot') {
      return <DotPlot {...visualizationProps} algorithm={s.dotPlotAlgorithm || 'tsne'} onAlgorithmChange={handleDotPlotAlgorithmChange} />;
    }
    
    if (s.visualizationType === 'linegraph') {
      return <LineGraph {...visualizationProps} />;
    }
    
    // For backward compatibility with old t-SNE and UMAP apps
    if (s.visualizationType === 'tsne' || s.visualizationType === 'umap') {
      return <DotPlot {...visualizationProps} algorithm={s.visualizationType} onAlgorithmChange={handleDotPlotAlgorithmChange} />;
    }
    
    return <Treemap {...visualizationProps} />;
  };

  // Calculate responsive hover title font size based on app size
  const baseSize = Math.min(props.data.size.width, props.data.size.height);
  const hoverTitleFontSize = baseSize * 0.025;

  return (
    <AppWindow 
      app={props} 
      lockAspectRatio={DOCUSAGE_ASPECT_RATIO} // Lock to 16:9 aspect ratio
    >
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {hoverTitle && (
          <div
            style={{
              position: 'absolute',
              top: '0.74em',
              left: '50%',
              transform: 'translateX(-50%)',
              background: hoverTitleBg,
              color: hoverTitleColor,
              fontWeight: 700,
              fontSize: `${hoverTitleFontSize}px`,
              textAlign: 'center',
              padding: '0.6em 1.5em',
              zIndex: 2000,
              border: '0.056em solid',
              borderColor: hoverTitleBorder,
              borderRadius: '0.6em',
              boxShadow: '0 0.15em 0.6em rgba(0,0,0,0.18)',
              pointerEvents: 'none',
            }}
          >
            {hoverTitle}
          </div>
        )}
        {renderVisualization()}
      </div>
    </AppWindow>
  );
}

// Helper function to find a node by topic
function findNodeByTopic(data: Tree, topic: string): Tree | null {
  if (data.topic === topic) return data;
  if (data.children) {
    for (const child of data.children) {
      const found = findNodeByTopic(child as Tree, topic);
      if (found) return found;
    }
  }
  return null;
}

/* App toolbar component for the app DocuSAGE */
function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  const handleDepthChange = (value: number) => {
    updateState(props._id, { depth: value });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        const transformedData = transformToTree(jsonData);
        updateState(props._id, { 
          data: transformedData,
          filteredData: null,
          depth: 1,
          customColors: s.customColors || [...defaultColors], // Preserve custom colors
        });
      } catch (error) {
        console.error('Error parsing JSON file:', error);
        // You might want to add error handling/notification here
      }
    };
    reader.readAsText(file);
  };

  const handleColorChange = (index: number, color: string) => {
    const currentColors = s.customColors || [...defaultColors];
    const newColors = [...currentColors];
    newColors[index] = color;
    updateState(props._id, { customColors: newColors });
  };

  const handleResetColors = () => {
    const currentColors = s.customColors || [...defaultColors];
    const newColors = [...currentColors];
    // Only reset the colors that are currently active (top-level nodes)
    for (let i = 0; i < topLevelCount; i++) {
      newColors[i] = defaultColors[i] || '#cccccc';
    }
    updateState(props._id, { customColors: newColors });
  };

  const handleVisualizationChange = (type: 'treemap' | 'dotplot' | 'linegraph') => {
    updateState(props._id, { visualizationType: type });
  };

  // Calculate maximum depth of the current data, starting from 0 for the root
  const calculateMaxDepth = (node: Tree, currentDepth: number = 0): number => {
    if (!node.children || node.children.length === 0) return currentDepth;
    return Math.max(...node.children.map(child => calculateMaxDepth(child, currentDepth + 1)));
  };

  // Calculate the number of top-level nodes (children of root)
  const calculateTopLevelCount = (node: Tree): number => {
    return node.children ? node.children.length : 0;
  };

  const maxDepth = s.filteredData ? calculateMaxDepth(s.filteredData) : calculateMaxDepth(s.data || data);
  const topLevelCount = s.filteredData ? calculateTopLevelCount(s.filteredData) : calculateTopLevelCount(s.data || data);
  
  // Get only the colors needed for top-level nodes
  const activeColors = (s.customColors || defaultColors).slice(0, topLevelCount);

  // Create slider marks dynamically
  const sliderMarks = Array.from({ length: maxDepth }, (_, i) => i + 1).map(depth => (
    <SliderMark key={depth} value={depth} transform="translate(-4px, 7px)" fontSize="sm">
      {depth}
    </SliderMark>
  ));

  return (
    <Box display="flex" alignItems="center">
      <Input
        type="file"
        accept=".json"
        onChange={handleFileUpload}
        display="none"
        id="file-upload"
      />
      <Button
        as="label"
        htmlFor="file-upload"
        size="sm"
        colorScheme="teal"
        variant="outline"
        mr={4}
        cursor="pointer"
      >
        Upload JSON
      </Button>
      
      {/* Visualization Type Selector */}
      <Box display="flex" alignItems="center" mr={4}>
        <ChakraText fontSize="sm" fontWeight="medium" mr={2} color="gray.600">
          View:
        </ChakraText>
        <Select
          value={s.visualizationType || 'treemap'}
          onChange={(e) => handleVisualizationChange(e.target.value as 'treemap' | 'dotplot' | 'linegraph')}
          size="sm"
          width="120px"
        >
          <option value="treemap">Tree Map</option>
          <option value="dotplot">Dot Plot</option>
          <option value="linegraph">Line Graph</option>
        </Select>
      </Box>
      
      {/* Color Customization Section */}
      <Box display="flex" alignItems="center" mr={4}>
        <Box display="flex" gap={1}>
          {activeColors.map((color, index) => {
            // Get the topic name for this color index
            const currentData = s.filteredData || s.data || data;
            const topicName = currentData.children && currentData.children[index] ? currentData.children[index].topic : `Topic ${index + 1}`;
            
            return (
              <Tooltip key={index} label={`${topicName}`} placement="top" hasArrow>
                <Input
                  type="color"
                  value={color}
                  onChange={(e) => handleColorChange(index, e.target.value)}
                  size="sm"
                  width="32px"
                  height="32px"
                  padding={0}
                  border="1px solid"
                  borderColor="gray.300"
                  borderRadius="md"
                  cursor="pointer"
                  _hover={{ borderColor: "gray.400" }}
                />
              </Tooltip>
            );
          })}
        </Box>
        <Button
          size="sm"
          colorScheme="gray"
          variant="outline"
          ml={2}
          onClick={handleResetColors}
        >
          Reset
        </Button>
      </Box>
      
      <Box width="200px" justifyContent="center" mx="6" mb="4" display="flex">
        <Slider
          min={1}
          max={maxDepth}
          step={1}
          value={s.depth}
          onChange={handleDepthChange}
          size="sm"
        >
          {sliderMarks}
          <SliderTrack bg={'gray.200'}>
            <SliderFilledTrack bg={'teal'} />
          </SliderTrack>
          <SliderThumb boxSize={3.5}>
            <Box color="teal" transition={'all 0.2s'} _hover={{ color: 'teal' }} />
          </SliderThumb>
        </Slider>
      </Box>
    </Box>
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
