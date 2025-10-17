import React, { useEffect, useState } from 'react';
import * as d3 from 'd3';
import { Tree } from '../data';
import { AppState } from '../DocuSAGE';
import { Box, Slider, SliderTrack, SliderFilledTrack, SliderThumb, VStack, Text, Tooltip, Button, Menu, MenuButton, MenuList, MenuItem, Portal, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Select, Divider } from '@chakra-ui/react';

type TreemapProps = {
  width: number;
  height: number;
  data: Tree;
  state: AppState;
  onCircleClick?: (topic: string) => void;
  onHover?: (topic: string | null) => void;
  colors: string[];
  onDepthChange?: (depth: number) => void;
  onTitleHover?: (title: string | null) => void; // <-- add this
  onPaperClick?: (paper: Tree) => void;
  onRequestMove?: (paperTopic: string, targetTopic: string) => void;
  onRequestRename?: (nodeTopic: string, newName: string) => void;
};

type TooltipData = {
  topic: string;
  size: number;
  x: number;
  y: number;
  summary?: string;
  title?: string;
  authors?: string[];
  year?: string;
  venue?: string;
} | null;

export const Treemap = ({
  width,
  height,
  data,
  state: s,
  onCircleClick,
  onHover,
  colors,
  onDepthChange,
  onTitleHover,
  onPaperClick,
  onRequestMove,
  onRequestRename,
}: TreemapProps): JSX.Element => {
  const [rotation, setRotation] = useState({ x: 45, y: 0, z: 45 });
  const [isDragging, setIsDragging] = useState(false);
  const [startDrag, setStartDrag] = useState({ x: 0, y: 0 });
  const [selectedLayer, setSelectedLayer] = useState<number>(0);
  const [layerSpacing, setLayerSpacing] = useState(-200);
  const [tooltipData, setTooltipData] = useState<TooltipData>(null);
  const [hideLayersAbove, setHideLayersAbove] = useState(false);
  const [zoom, setZoom] = useState(1); // Add zoom state
  const [mode, setMode] = useState<'rotate' | 'pan'>('rotate'); // Add mode state for rotation vs pan
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 }); // Add pan offset state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: any } | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameTargetTopic, setRenameTargetTopic] = useState<string | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTargetValue, setMoveTargetValue] = useState('');
  const [movePaperTopic, setMovePaperTopic] = useState<string | null>(null);

  // Update selected layer when depth changes
  useEffect(() => {
    setSelectedLayer((s.depth || 1) - 1);
  }, [s.depth]);

  // Clear tooltip when data changes (e.g., after uploading new JSON)
  useEffect(() => {
    setTooltipData(null);
  }, [data]);

  // Add keyboard shortcuts for zooming
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        setZoom(prevZoom => Math.min(3, prevZoom + 0.1));
      } else if (e.key === '-') {
        e.preventDefault();
        setZoom(prevZoom => Math.max(0.1, prevZoom - 0.1));
      } else if (e.key === '0') {
        e.preventDefault();
        resetView();
      } else if (e.key === 'r') {
        e.preventDefault();
        setMode('rotate');
      } else if (e.key === 'p') {
        e.preventDefault();
        setMode('pan');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    const handler = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener('click', handler, { once: true });
    }
    return () => window.removeEventListener('click', handler);
  }, [contextMenu]);

  const openContextMenu = (x: number, y: number, node: any) => {
    setContextMenu({ x, y, node });
  };

  const handleNodeContextMenu = (e: React.MouseEvent, node: any) => {
    e.preventDefault();
    openContextMenu(e.clientX, e.clientY, node);
  };

  const openRename = () => {
    if (!contextMenu) return;
    const n = contextMenu.node;
    const isLeaf = !n.children || n.children.length === 0;
    if (isLeaf) return;
    setRenameValue(n.data.topic);
    setRenameTargetTopic(n.data.topic);
    setRenameOpen(true);
    setContextMenu(null);
  };

  const confirmRename = () => {
    if (!renameValue.trim() || !renameTargetTopic) { setRenameOpen(false); return; }
    if (onRequestRename) onRequestRename(renameTargetTopic, renameValue.trim());
    setRenameOpen(false);
    setRenameTargetTopic(null);
  };

  const openMove = () => {
    if (!contextMenu) return;
    const n = contextMenu.node;
    const isLeaf = !n.children || n.children.length === 0;
    if (!isLeaf) return;
    setMoveTargetValue('');
    setMovePaperTopic(n.data.topic);
    setMoveOpen(true);
    setContextMenu(null);
  };

  const confirmMove = () => {
    if (!movePaperTopic || !moveTargetValue) { setMoveOpen(false); return; }
    if (onRequestMove) onRequestMove(movePaperTopic, moveTargetValue);
    setMoveOpen(false);
    setMovePaperTopic(null);
    setMoveTargetValue('');
  };

  // Create hierarchy for the full data to maintain color consistency
  const fullHierarchy = d3.hierarchy(data)
    .sum((d) => d.children?.length ? 0 : d.size)
    .sort((a, b) => b.value! - a.value!);

  const firstLevelGroups = fullHierarchy?.children?.map((child) => child.data.topic);
  const colorScale = d3.scaleOrdinal<string>().domain(firstLevelGroups || []).range(colors);

  function getTopLevelParentTopic(topic: string): string | null {
    const originalNode = fullHierarchy.descendants().find((n) => n.data.topic === topic);
    let topLevelParent = originalNode;
    while (topLevelParent && topLevelParent.depth > 1) {
      if (topLevelParent.parent) {
        topLevelParent = topLevelParent.parent;
      } else {
        break;
      }
    }
    return topLevelParent ? topLevelParent.data.topic : null;
  }

  // Create hierarchy for the display data
  const displayData = s.filteredData || data;
  const hierarchy = d3.hierarchy(displayData)
    .sum((d) => d.children?.length ? 0 : d.size)
    .sort((a, b) => b.value! - a.value!);

  // Calculate square dimensions
  const squareSize = Math.min(width, height) / 2;

  const treemap = d3.treemap<Tree>()
    .size([squareSize, squareSize])
    .paddingOuter(8)
    .paddingInner(8)
    .round(true);

  const root = treemap(hierarchy);

  // Calculate layer height based on depth
  const layerHeight = squareSize;
  const middleLayerIndex = Math.floor(Math.max(...root.descendants().map(d => d.depth)) / 2);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setStartDrag({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const dx = e.clientX - startDrag.x;
    const dy = e.clientY - startDrag.y;
    
    if (mode === 'rotate') {
      // Rotation mode - current behavior
      setRotation(prev => ({
        x: Math.max(30, Math.min(120, prev.x + dy * 0.5)),
        y: 0,
        z: prev.z + dx * 0.5
      }));
    } else {
      // Pan mode - screen-space panning so it follows drag direction intuitively
      setPanOffset(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));
    }
    
    setStartDrag({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Reset zoom and rotation to default values
  const resetView = () => {
    setZoom(1);
    setRotation({ x: 45, y: 0, z: 45 });
    setPanOffset({ x: 0, y: 0 });
  };

  // Helper function to wrap text
  const wrapText = (text: string, maxWidth: number, fontSize: number, maxHeight: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    const lineHeight = fontSize * 1.2;
    const ellipsisWidth = 3 * fontSize * 0.6; // Width of "..."
    const availableWidth = maxWidth - ellipsisWidth;
    const charWidth = fontSize * 0.6;
    var truncated = false;

    // If rectangle is too small for even one line, truncate immediately
    if (maxHeight < lineHeight || maxWidth < ellipsisWidth) {
      const maxChars = Math.max(1, Math.floor(availableWidth / charWidth));
      return [text.slice(0, maxChars) + '...'];
    }

    // Calculate maximum number of lines that can fit
    const maxLines = Math.floor(maxHeight / lineHeight);
    if (maxLines <= 0) {
      const maxChars = Math.max(1, Math.floor(availableWidth / charWidth));
      return [text.slice(0, maxChars) + '...'];
    }

    // If only one line can fit, truncate immediately
    if (maxLines === 1) {
      const maxChars = Math.max(1, Math.floor(availableWidth / charWidth));
      return [text.slice(0, maxChars) + '...'];
    }

    let currentLine = '';
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const wordWidth = word.length * charWidth;
      
      // If a single word is too long, truncate it
      if (wordWidth > availableWidth) {
        const maxChars = Math.max(1, Math.floor(availableWidth / charWidth));
        if (currentLine) {
          lines.push(currentLine);
        }
        lines.push(word.slice(0, maxChars) + '...');
        truncated = true;
        break;
      }

      const newLineWidth = (currentLine + (currentLine ? ' ' : '') + word).length * charWidth;
      
      // If adding this word would exceed width or we've reached max lines
      if (newLineWidth > availableWidth || lines.length >= maxLines - 1) {
        if (currentLine) {
          lines.push(currentLine);
        }
        // If we've reached max lines, truncate the remaining text
        if (lines.length >= maxLines - 1) {
          const remainingText = words.slice(i).join(' ');
          const maxChars = Math.max(1, Math.floor(availableWidth / charWidth));
          lines.push(remainingText.slice(0, maxChars) + '...');
          break;
        }
        currentLine = word;
      } else {
        currentLine = currentLine ? currentLine + ' ' + word : word;
      }
    }
    
    // Add the last line if we haven't reached max lines
    if (currentLine && !truncated && lines.length < maxLines) {
      lines.push(currentLine);
    }

    return lines;
  };

  // Helper function to calculate font size
  const calculateFontSize = (width: number, height: number, text: string): number => {
    const minFontSize = 4;
    const maxFontSize = 50;
    const words = text.split(' ');
    const maxWordLength = Math.max(...words.map(w => w.length));
    const fontSize = Math.min(
      Math.max(Math.min(width, height) * 0.1, minFontSize),
      maxFontSize
    );
    return fontSize;
  };

  const renderText = (node: d3.HierarchyNode<Tree>, x: number, y: number, width: number, height: number) => {
    const fontSize = calculateFontSize(width, height, node.data.topic);
    const lines = wrapText(node.data.topic, width, fontSize, height);
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    const startY = y + (height - totalHeight) / 2;

    return lines.map((line, i) => (
      <text
        key={i}
        x={x + width / 2}
        y={startY + i * lineHeight + (fontSize / 2)}
        fontSize={`${fontSize}px`}
        textAnchor="middle"
        alignmentBaseline="middle"
        fill="black"
        style={{ 
          pointerEvents: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }}
      >
        {line}
      </text>
    ));
  };

  // Get all nodes at each depth
  const maxDepth = Math.max(...root.descendants().map(d => d.depth));
  
  // Get top-level parent boundaries for outline
  const getTopLevelParentBoundaries = () => {
    const topLevelNodes = root.descendants().filter(node => node.depth === 1);
    return topLevelNodes.map(node => ({
      x0: node.x0,
      y0: node.y0,
      x1: node.x1,
      y1: node.y1,
      topic: node.data.topic,
      color: colorScale(node.data.topic)
    }));
  };

  const layers = Array.from({ length: maxDepth }, (_, i) => {
    const layerNodes = root.descendants().filter(node => node.depth === i + 1);
    
    // Skip layers with no nodes
    if (layerNodes.length === 0) {
      return null;
    }
    
    // Hide layers above the selected one when hideLayersAbove is true
    if (hideLayersAbove && i < selectedLayer) {
      return null;
    }

    // Calculate z-index: when hiding above layers, adjust so the selected layer is at the top
    let translateZ;
    if (hideLayersAbove) {
      // When hiding above layers, the selected layer should be at the top (highest z-index)
      // Other visible layers should be below it
      if (i === selectedLayer) {
        translateZ = 0; // Selected layer at the top
      } else {
        translateZ = (i - selectedLayer) * layerSpacing; // Other layers below
      }
    } else {
      // Normal layering when not hiding above
      translateZ = (i - middleLayerIndex) * layerSpacing;
    }
    
    const isSelected = i === selectedLayer;

    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          width: squareSize,
          height: layerHeight,
          transform: `translateZ(${translateZ}px)`,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.1s ease-out',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          border: isSelected ? undefined : '3px solid #bdbdbd',
          boxSizing: 'border-box',
        }}
        onClick={() => {
          setSelectedLayer(i);
          onDepthChange?.(i + 1);
        }}
      >
        {/* Shadow layer */}
        <div
          style={{
            position: 'absolute',
            width: squareSize,
            height: layerHeight,
            backgroundColor: 'black',
            transform: 'translateZ(-1px)',
            transformStyle: 'preserve-3d',
            opacity: 0.2
          }}
        />
        {/* Selection outline */}
        {isSelected && (
          <div
            style={{
              position: 'absolute',
              width: squareSize,
              height: layerHeight,
              border: '5px solid red',
              boxSizing: 'border-box',
              transform: 'translateZ(1px)',
              transformStyle: 'preserve-3d',
              pointerEvents: 'none'
            }}
          />
        )}
        <svg width={squareSize} height={layerHeight}>
          {layerNodes.map((node) => {
            const topLevelTopic = getTopLevelParentTopic(node.data.topic);
            const nodeColor = colorScale(topLevelTopic ?? node.data.topic);

            return (
              <g key={node.data.topic}>
                <rect
                  x={node.x0}
                  y={node.y0}
                  width={node.x1 - node.x0}
                  height={node.y1 - node.y0}
                  stroke={nodeColor}
                  strokeWidth={s.filteredData ? 2 : 1}
                  strokeOpacity={0.2}
                  fill={nodeColor}
                  fillOpacity={0.9}
                  style={{ cursor: 'pointer' }}
                />
                {renderText(node, node.x0, node.y0, node.x1 - node.x0, node.y1 - node.y0)}
              </g>
            );
          })}
        </svg>
      </div>
    );
  }).filter(Boolean); // Remove null entries

  // Create 2D view of selected layer
  const selectedLayerNodes = root.descendants().filter(node => node.depth === selectedLayer + 1);
  const twoDView = (
    <div style={{ 
      width: '50%', 
      height: '100%',
      borderLeft: '1px solid #ccc',
      padding: '20px',
      boxSizing: 'border-box',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: '48px', fontWeight: 'bold', textAlign: 'center' }}>Layer {selectedLayer + 1}</h3>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${squareSize} ${squareSize}`} preserveAspectRatio="xMidYMid meet">
          {/* Background for rectangles */}
          <rect
            x={0}
            y={0}
            width={squareSize}
            height={squareSize}
            fill="black"
            opacity={0.2}
          />
          
          {/* Top-level parent outlines */}
          {selectedLayer > 0 && getTopLevelParentBoundaries().map((boundary) => (
            <rect
              key={boundary.topic}
              x={boundary.x0}
              y={boundary.y0}
              width={boundary.x1 - boundary.x0}
              height={boundary.y1 - boundary.y0}
              fill="none"
              stroke={boundary.color}
              strokeWidth="3"
              strokeOpacity="0.6"
              strokeDasharray="5,5"
            />
          ))}
          
          {selectedLayerNodes.map((node) => {
            const topLevelTopic = getTopLevelParentTopic(node.data.topic);
            const nodeColor = colorScale(topLevelTopic ?? node.data.topic);

            return (
              <g key={node.data.topic}>
                <rect
                  x={node.x0}
                  y={node.y0}
                  width={node.x1 - node.x0}
                  height={node.y1 - node.y0}
                  stroke={nodeColor}
                  strokeWidth={s.filteredData ? 2 : 1}
                  strokeOpacity={0.2}
                  fill={nodeColor}
                  fillOpacity={0.9}
                  style={{ cursor: 'context-menu' }}
                  onContextMenu={(e) => handleNodeContextMenu(e, node)}
                  onMouseEnter={(e) => {
                    if (!node.children) {
                      setTooltipData({
                        topic: node.data.topic,
                        size: node.data.size || 0,
                        x: width/2,
                        y: height/2,
                        summary: node.data.summary,
                        title: node.data.title,
                        authors: node.data.authors,
                        year: node.data.year,
                        venue: node.data.venue
                      });
                      onTitleHover?.(null); // clear title hover for leaf
                    } else {
                      onHover?.(node.data.topic);
                      onTitleHover?.(node.data.topic); // show title at top for non-leaf
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!node.children) {
                      setTooltipData(null);
                      onTitleHover?.(null); // clear title hover for leaf
                    } else {
                      onHover?.(null);
                      onTitleHover?.(null); // clear title hover for non-leaf
                    }
                  }}
                />
                {renderText(node, node.x0, node.y0, node.x1 - node.x0, node.y1 - node.y0)}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );

  const renderTooltip = () => {
    if (!tooltipData) return null;

    return (
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          width: '90%',
          height: '90%',
          pointerEvents: 'none',
          border: '1px solid #eee',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          overflow: 'auto'
        }}
      >
        <div style={{ 
          fontWeight: 'bold', 
          fontSize: '100px', 
          color: '#666',
          textAlign: 'center',
          borderBottom: '2px solid #eee',
          paddingBottom: '24px'
        }}>
          <span>{tooltipData.topic}</span>
        </div>
        
        {tooltipData.title && (
          <div style={{ 
            fontSize: '80px',
            fontWeight: '500',
            color: '#333',
            textAlign: 'center'
          }}>
            {tooltipData.title}
          </div>
        )}

        {tooltipData.authors && tooltipData.authors.length > 0 && (
          <div style={{ 
            fontSize: '60px',
            color: '#666',
            textAlign: 'center',
            fontStyle: 'italic'
          }}>
            {tooltipData.authors.join(', ')}
          </div>
        )}

        {(tooltipData.year || tooltipData.venue) && (
          <div style={{ 
            fontSize: '50px',
            color: '#888',
            textAlign: 'center'
          }}>
            {[tooltipData.year, tooltipData.venue].filter(Boolean).join(' • ')}
          </div>
        )}

        {tooltipData.summary && (
          <div style={{ 
            fontSize: '60px',
            color: '#444',
            lineHeight: '1.4',
            textAlign: 'left',
            marginTop: '24px',
            padding: '0 40px'
          }}>
            {tooltipData.summary}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      <VStack 
        width="120px" 
        height="100%" 
        spacing={4} 
        padding="40px 0" 
        justifyContent="flex-start"
        alignItems="center"
        borderRight="1px solid #eee"
      >
        <Text 
          transform="rotate(-90deg)" 
          whiteSpace="nowrap" 
          fontSize="50" 
          color="gray.400"
          marginTop="50px"
          marginBottom="100px"
          fontWeight="medium"
        >
          Spacing
        </Text>
        <Box flex="1" width="100%" display="flex" justifyContent="center" minHeight="400px">
          <Slider
            orientation="vertical"
            min={-400}
            max={-50}
            value={layerSpacing}
            onChange={setLayerSpacing}
            height="100%"
            size="lg"
          >
            <SliderTrack width="20px">
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb width={24} />
          </Slider>
        </Box>
        <Button
          size="lg"
          colorScheme={hideLayersAbove ? "blue" : "blue"}
          variant={hideLayersAbove ? "solid" : "outline"}
          onClick={() => setHideLayersAbove(!hideLayersAbove)}
          width="300px"
          height="100px"
          fontSize="48px"
          marginTop="120px"
          marginBottom="80px"
          transform="rotate(-90deg)"
          whiteSpace="nowrap"
          overflow="hidden"
        >
          {hideLayersAbove ? "Show All" : "Hide Above"}
        </Button>
        
        {/* Zoom Controls */}
        <Text 
          transform="rotate(-90deg)" 
          whiteSpace="nowrap" 
          fontSize="50" 
          color="gray.400"
          marginTop="50px"
          marginBottom="100px"
          fontWeight="medium"
        >
          Zoom
        </Text>
        <Box flex="1" width="100%" display="flex" justifyContent="center" minHeight="400px">
          <Slider
            orientation="vertical"
            min={0.5}
            max={2.5}
            step={0.1}
            value={zoom}
            onChange={setZoom}
            height="100%"
            size="lg"
          >
            <SliderTrack width="20px">
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb width={24} />
          </Slider>
        </Box>
        <Button
          size="lg"
          colorScheme="teal"
          variant="outline"
          onClick={resetView}
          width="300px"
          height="100px"
          fontSize="48px"
          marginTop="120px"
          marginBottom="80px"
          transform="rotate(-90deg)"
          whiteSpace="nowrap"
          overflow="hidden"
        >
          Reset View
        </Button>
      </VStack>
      <div 
        style={{ 
          perspective: '2000px',
          width: 'calc(50% - 60px)',
          height: '100%',
          cursor: isDragging ? 'grabbing' : (mode === 'rotate' ? 'grab' : 'move'),
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          position: 'relative'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Mode Toggle Buttons */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <Tooltip label="Rotate the 3D visualization around its center" placement="right" hasArrow>
            <Button
              size="sm"
              colorScheme={mode === 'rotate' ? "blue" : "gray"}
              variant={mode === 'rotate' ? "solid" : "solid"}
              onClick={() => setMode('rotate')}
              width="300px"
              height="110px"
              fontSize="36px"
              borderRadius="10px"
              bg={mode === 'rotate' ? undefined : "gray.600"}
              color={mode === 'rotate' ? undefined : "white"}
              _hover={{ bg: mode === 'rotate' ? undefined : "gray.500" }}
            >
              ↻ Rotate
            </Button>
          </Tooltip>
          <Tooltip label="Pan the visualization around the viewport" placement="right" hasArrow>
            <Button
              size="sm"
              colorScheme={mode === 'pan' ? "blue" : "gray"}
              variant={mode === 'pan' ? "solid" : "solid"}
              onClick={() => setMode('pan')}
              width="300px"
              height="110px"
              fontSize="36px"
              borderRadius="10px"
              bg={mode === 'pan' ? undefined : "gray.600"}
              color={mode === 'pan' ? undefined : "white"}
              _hover={{ bg: mode === 'pan' ? undefined : "gray.500" }}
            >
              ✋ Pan
            </Button>
          </Tooltip>
          
          {/* Mode Indicator */}
          <div style={{
            textAlign: 'center',
            fontSize: '30px',
            color: mode === 'rotate' ? 'blue.600' : 'gray.600',
            fontWeight: 'medium',
            padding: '4px 8px',
            backgroundColor: mode === 'rotate' ? 'blue.50' : 'gray.50',
            borderRadius: '4px',
            border: `1px solid ${mode === 'rotate' ? 'blue.200' : 'gray.200'}`
          }}>
            {mode === 'rotate' ? 'Rotation Mode' : 'Pan Mode'}
          </div>
        </div>
        
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) rotateX(${rotation.x}deg) rotateZ(${rotation.z}deg) scale(${zoom})`,
            transformStyle: 'preserve-3d',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            transformOrigin: 'center center',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {layers}
          {contextMenu && (
            <Portal>
              <Menu isOpen onClose={() => setContextMenu(null)}>
                <MenuButton as={Box} position="fixed" left={`${contextMenu.x}px`} top={`${contextMenu.y}px`} />
                <MenuList>
                  {(!contextMenu.node.children || contextMenu.node.children.length === 0) ? (
                    <>
                      <MenuItem onClick={() => { onPaperClick?.(contextMenu.node.data); setContextMenu(null); }}>Open paper</MenuItem>
                      <Divider />
                      <MenuItem onClick={openMove}>Move paper…</MenuItem>
                    </>
                  ) : (
                    <>
                      <MenuItem onClick={() => { onCircleClick?.(contextMenu.node.data.topic); setContextMenu(null); }}>Open filtered view</MenuItem>
                      <Divider />
                      <MenuItem onClick={openRename}>Rename node…</MenuItem>
                    </>
                  )}
                </MenuList>
              </Menu>
            </Portal>
          )}

          {/* Rename Modal */}
          <Modal isOpen={renameOpen} onClose={() => setRenameOpen(false)} isCentered>
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Rename node</ModalHeader>
              <ModalBody>
                <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="New name" />
              </ModalBody>
              <ModalFooter>
                <Button mr={3} onClick={() => setRenameOpen(false)}>Cancel</Button>
                <Button colorScheme="blue" onClick={confirmRename}>Save</Button>
              </ModalFooter>
            </ModalContent>
          </Modal>

          {/* Move Modal */}
          <Modal isOpen={moveOpen} onClose={() => setMoveOpen(false)} isCentered>
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Move paper to…</ModalHeader>
              <ModalBody>
                <Menu>
                  <MenuButton as={Button} rightIcon={<span>▾</span>} width="100%" textAlign="left" overflow="hidden" whiteSpace="nowrap">
                    {moveTargetValue || 'Select target topic'}
                  </MenuButton>
                  <MenuList maxH="300px" overflowY="auto">
                    {fullHierarchy.descendants().filter(n => n.children && n.children.length > 0).map((n) => (
                      <MenuItem key={n.data.topic} onClick={() => setMoveTargetValue(n.data.topic)}>
                        {n.data.topic}
                      </MenuItem>
                    ))}
                  </MenuList>
                </Menu>
              </ModalBody>
              <ModalFooter>
                <Button mr={3} onClick={() => setMoveOpen(false)}>Cancel</Button>
                <Button colorScheme="blue" onClick={confirmMove} isDisabled={!moveTargetValue}>Move</Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </div>
        {renderTooltip()}
      </div>
      {twoDView}
    </div>
  );
}; 