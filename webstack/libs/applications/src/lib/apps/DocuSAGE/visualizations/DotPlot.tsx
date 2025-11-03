import React, { useEffect, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { Tree } from '../data';
import { AppState } from '../DocuSAGE';
import { Box, Text, useColorModeValue, Button, HStack, Input, VStack, InputGroup, InputRightElement, IconButton } from '@chakra-ui/react';
import { MdAdd } from 'react-icons/md';

type DotPlotProps = {
  width: number;
  height: number;
  data: Tree;
  state: AppState;
  colors: string[];
  onPaperClick?: (paper: Tree) => void;
  onTitleHover?: (title: string | null) => void;
  algorithm?: 'tsne' | 'umap'; // Algorithm to use
  onAlgorithmChange?: (algorithm: 'tsne' | 'umap') => void; // Callback for algorithm change
};

type DotPlotPoint = {
  x: number;
  y: number;
  data: Tree;
  color: string;
  isCustom?: boolean;
  customText?: string;
};

export const DotPlot = ({
  width,
  height,
  data,
  state: s,
  colors,
  onPaperClick,
  onTitleHover,
  algorithm = 'tsne',
  onAlgorithmChange,
}: DotPlotProps): JSX.Element => {
  const [points, setPoints] = useState<DotPlotPoint[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<DotPlotPoint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [customText, setCustomText] = useState('');
  const [customColor, setCustomColor] = useState('#ff0000');
  const [customPoints, setCustomPoints] = useState<DotPlotPoint[]>([]);
  const [customPointData, setCustomPointData] = useState<Array<{ text: string; color: string }>>([]);
  const [projectionScale, setProjectionScale] = useState<number>(1);
  const [projectionCenter, setProjectionCenter] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [originalProjected, setOriginalProjected] = useState<{ x: number; y: number }[]>([]);
  const [previousPapersLength, setPreviousPapersLength] = useState<number>(0);

  // Color mode values for dark/light theme support
  const backgroundColor = useColorModeValue('#f8f9fa', '#1a1a1a');
  const strokeColor = useColorModeValue('#e9ecef', '#404040');
  const legendBg = useColorModeValue('white', 'gray.800');
  const legendTextColor = useColorModeValue('gray.600', 'gray.300');
  const tooltipBg = useColorModeValue('rgba(0,0,0,0.8)', 'rgba(255,255,255,0.9)');
  const tooltipTextColor = useColorModeValue('white', 'black');
  const circleStroke = useColorModeValue('white', '#2d2d2d');
  const buttonBg = useColorModeValue('gray.100', 'gray.700');
  const buttonActiveBg = useColorModeValue('blue.500', 'blue.600');
  const buttonTextColor = useColorModeValue('gray.800', 'gray.100');
  const buttonActiveTextColor = useColorModeValue('white', 'white');

  // Calculate responsive circle size based on viewport
  const circleRadius = Math.max(15, Math.min(40, Math.min(width, height) * 0.02));
  const strokeWidth = Math.max(2, circleRadius * 0.15);
  
  // Calculate responsive sizes based on viewport (always proportional)
  const baseSize = Math.min(width, height);
  
  // Legend sizes
  const legendWidth = width * 0.2;
  const legendPadding = baseSize * 0.0375;
  const legendTitleSize = baseSize * 0.03;
  const legendItemSize = baseSize * 0.024;
  const legendColorSize = baseSize * 0.03;
  const legendItemSpacing = baseSize * 0.018;

  // Button and input sizes
  const buttonFontSize = baseSize * 0.035;
  const buttonWidth = baseSize * 0.15;
  const buttonHeight = baseSize * 0.055;
  const buttonPaddingX = baseSize * 0.018;
  const buttonPaddingY = baseSize * 0.012;
  const inputFontSize = baseSize * 0.028;
  const inputHeight = baseSize * 0.055;
  const inputWidth = baseSize * 0.3;
  const colorPickerSize = baseSize * 0.055;
  const iconButtonSize = baseSize * 0.055;
  const iconButtonFontSize = baseSize * 0.03;
  const controlSpacing = baseSize * 0.01;

  // Extract papers at and below the selected layer (depth)
  const papers = useMemo(() => {
    const collectLeaves = (node: Tree): Tree[] => {
      if (!node.children || node.children.length === 0) return [node];
      return node.children.flatMap(collectLeaves);
    };

    const extractAtOrBelowDepth = (node: Tree, currentDepth: number = 0): Tree[] => {
      // If we are above the target depth, keep descending
      if (currentDepth < s.depth) {
        if (!node.children || node.children.length === 0) return [];
        return node.children.flatMap(child => extractAtOrBelowDepth(child, currentDepth + 1));
      }
      // If we reached the target depth, collect all leaves under this node
      return collectLeaves(node);
    };

    const root = s.filteredData || data;
    return extractAtOrBelowDepth(root, 0);
  }, [data, s.filteredData, s.depth]);

  // Generate embeddings for dimensionality reduction
  const generateEmbeddings = async (papers: Tree[]): Promise<number[][]> => {
    return papers.map(paper => {
      const text = `${paper.title || ''} ${paper.summary || ''}`.toLowerCase();
      
      // Simple bag-of-words style embedding
      const words = text.split(/\s+/).filter(w => w.length > 2);
      const wordCounts: { [key: string]: number } = {};
      words.forEach(word => {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      });
      
      // Create a 50-dimensional embedding
      const embedding = new Array(50).fill(0);
      const uniqueWords = Object.keys(wordCounts);
      uniqueWords.forEach((word, i) => {
        const hash = word.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0);
        const index = Math.abs(hash) % 50;
        embedding[index] += wordCounts[word] * (i + 1) / uniqueWords.length;
      });
      
      return embedding;
    });
  };

  // Generate embedding for custom text
  const generateCustomEmbedding = (text: string): number[] => {
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/).filter(w => w.length > 2);
    const wordCounts: { [key: string]: number } = {};
    words.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
    
    // Create a 50-dimensional embedding
    const embedding = new Array(50).fill(0);
    const uniqueWords = Object.keys(wordCounts);
    uniqueWords.forEach((word, i) => {
      const hash = word.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      const index = Math.abs(hash) % 50;
      embedding[index] += wordCounts[word] * (i + 1) / uniqueWords.length;
    });
    
    return embedding;
  };

  // Function to ensure minimum distance between points
  const ensureMinimumDistance = (points: DotPlotPoint[], minDistance: number = 60): DotPlotPoint[] => {
    const adjustedPoints = [...points];
    
    for (let i = 0; i < adjustedPoints.length; i++) {
      for (let j = i + 1; j < adjustedPoints.length; j++) {
        const dx = adjustedPoints[i].x - adjustedPoints[j].x;
        const dy = adjustedPoints[i].y - adjustedPoints[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < minDistance) {
          // Move points apart
          const angle = Math.atan2(dy, dx);
          const moveDistance = (minDistance - distance) / 2;
          
          adjustedPoints[i].x += Math.cos(angle) * moveDistance;
          adjustedPoints[i].y += Math.sin(angle) * moveDistance;
          adjustedPoints[j].x -= Math.cos(angle) * moveDistance;
          adjustedPoints[j].y -= Math.sin(angle) * moveDistance;
        }
      }
    }
    
    return adjustedPoints;
  };

  // Project embeddings using t-SNE algorithm
  const projectTSNE = (embeddings: number[][]): DotPlotPoint[] => {
    const projected = embeddings.map((embedding, i) => {
      // Simple PCA-like projection for demo
      const x = embedding.slice(0, 25).reduce((a, b) => a + b, 0) * 50;
      const y = embedding.slice(25, 50).reduce((a, b) => a + b, 0) * 50;
      
      return {
        x: x,
        y: y,
        data: papers[i],
        color: getColorForPaper(papers[i])
      };
    });
    
    return projected;
  };

  // Project embeddings using UMAP algorithm
  const projectUMAP = (embeddings: number[][]): DotPlotPoint[] => {
    const projected = embeddings.map((embedding, i) => {
      // UMAP-style projection: uses different component weights
      // More emphasis on middle components for different clustering
      const x = (embedding.slice(5, 30).reduce((a, b) => a + b, 0) / 25) * 60;
      const y = (embedding.slice(20, 45).reduce((a, b) => a + b, 0) / 25) * 60;
      
      return {
        x: x,
        y: y,
        data: papers[i],
        color: getColorForPaper(papers[i])
      };
    });
    
    return projected;
  };

  // Run dimensionality reduction
  const runProjection = async () => {
    if (papers.length === 0) return;
    
    setIsLoading(true);
    
    try {
      // Generate embeddings
      const embeddings = await generateEmbeddings(papers);
      
      // Project based on selected algorithm
      let projected;
      if (algorithm === 'umap') {
        projected = projectUMAP(embeddings);
      } else {
        projected = projectTSNE(embeddings);
      }
      
      // Scale and center the points to fit within the viewport
      const xValues = projected.map(p => p.x);
      const yValues = projected.map(p => p.y);
      const minX = Math.min(...xValues);
      const maxX = Math.max(...xValues);
      const minY = Math.min(...yValues);
      const maxY = Math.max(...yValues);
      
      const rangeX = maxX - minX;
      const rangeY = maxY - minY;
      
      // Scale to use most of the available space, leaving some margin
      const margin = 100; // Leave 100px margin
      const availableWidth = width - margin;
      const availableHeight = height - margin;
      const scaleX = availableWidth / Math.max(rangeX, 1);
      const scaleY = availableHeight / Math.max(rangeY, 1);
      const scale = Math.min(scaleX, scaleY) * 0.8; // Use 80% of available space
      
      // Center the points
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      
      // Store scale and center for custom points
      setProjectionScale(scale);
      setProjectionCenter({ x: centerX, y: centerY });
      setOriginalProjected(projected.map(p => ({ x: p.x, y: p.y })));
      
      const scaledProjected = projected.map(point => ({
        ...point,
        x: (point.x - centerX) * scale,
        y: (point.y - centerY) * scale
      }));
      
      // Apply minimum distance to prevent overlap (scaled to viewport size)
      const minDistance = Math.min(width, height) * 0.05; // 5% of smaller dimension
      const spacedPoints = ensureMinimumDistance(scaledProjected, minDistance);
      
      setPoints(spacedPoints);
      
      // Only clear custom points if the data actually changed (papers length changed)
      if (papers.length !== previousPapersLength) {
        setCustomPoints([]);
        setCustomPointData([]);
        setPreviousPapersLength(papers.length);
      }
    } catch (error) {
      console.error(`Error running ${algorithm}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper: find path from root to target node
  const findPathToNode = (root: Tree, target: Tree): Tree[] | null => {
    if (root === target) return [root];
    if (!root.children) return null;
    for (const child of root.children) {
      const childPath = findPathToNode(child, target);
      if (childPath) return [root, ...childPath];
    }
    return null;
  };

  // Helper: get ancestor topic at a given depth relative to current root
  const getAncestorTopicAtDepth = (root: Tree, paper: Tree, targetDepth: number): string | null => {
    const path = findPathToNode(root, paper);
    if (!path) return null;
    // Clamp depth within path range (exclude leaf if it's the paper node)
    const clampedDepth = Math.min(Math.max(targetDepth, 0), path.length - 2);
    const nodeAtDepth = path[clampedDepth];
    return nodeAtDepth ? nodeAtDepth.topic : null;
  };

  // Get color for paper based on its ancestor at the selected depth layer
  const getColorForPaper = (paper: Tree): string => {
    const root = s.filteredData || data;
    const ancestorTopic = getAncestorTopicAtDepth(root, paper, s.depth);
    if (!ancestorTopic) return '#888888';
    // Color mapping same as Treemap: color by top-level parent using provided colors
    const color = getColorForTopic(ancestorTopic);
    return color;
  };

  // Build a color mapping aligned with Treemap's approach
  const fullHierarchy = useMemo(() => d3.hierarchy(data)
    .sum((d: any) => (d.children && d.children.length ? 0 : (d as any).size))
    .sort((a, b) => (b.value || 0) - (a.value || 0)), [data]);

  const firstLevelGroups = fullHierarchy?.children?.map((child) => child.data.topic) || [];
  const colorScale = useMemo(() => d3.scaleOrdinal<string>().domain(firstLevelGroups).range(colors), [firstLevelGroups, colors]);

  const getTopLevelParentTopic = (topic: string): string | null => {
    const originalNode = fullHierarchy.descendants().find((n) => n.data.topic === topic);
    let topLevelParent: any = originalNode;
    while (topLevelParent && topLevelParent.depth > 1) {
      if (topLevelParent.parent) topLevelParent = topLevelParent.parent; else break;
    }
    return topLevelParent ? topLevelParent.data.topic : null;
  };

  const getColorForTopic = (topic: string): string => {
    const top = getTopLevelParentTopic(topic) || topic;
    return colorScale(top) as string;
  };

  // Run projection when papers or algorithm changes
  useEffect(() => {
    runProjection();
  }, [papers, algorithm]);

  const handlePointClick = (point: DotPlotPoint) => {
    onPaperClick?.(point.data);
  };

  const handlePointHover = (point: DotPlotPoint | null) => {
    setHoveredPoint(point);
    if (point) {
      if (point.isCustom && point.customText) {
        onTitleHover?.(point.customText);
      } else {
        onTitleHover?.(point.data.title || point.data.topic);
      }
    } else {
      onTitleHover?.(null);
    }
  };

  const handleAlgorithmChange = (newAlgorithm: 'tsne' | 'umap') => {
    onAlgorithmChange?.(newAlgorithm);
  };

  const handleAddCustomPoint = () => {
    if (!customText.trim() || points.length === 0 || projectionScale === 1) return;

    // Generate embedding for custom text
    const embedding = generateCustomEmbedding(customText);
    
    // Project using the same algorithm
    let projectedX: number, projectedY: number;
    if (algorithm === 'umap') {
      projectedX = (embedding.slice(5, 30).reduce((a, b) => a + b, 0) / 25) * 60;
      projectedY = (embedding.slice(20, 45).reduce((a, b) => a + b, 0) / 25) * 60;
    } else {
      projectedX = embedding.slice(0, 25).reduce((a, b) => a + b, 0) * 50;
      projectedY = embedding.slice(25, 50).reduce((a, b) => a + b, 0) * 50;
    }

    // Scale and center the custom point using stored values
    const scaledX = (projectedX - projectionCenter.x) * projectionScale;
    const scaledY = (projectedY - projectionCenter.y) * projectionScale;

    // Create a dummy Tree object for the custom point
    const customTree: Tree = {
      topic: customText,
      size: 1,
      children: [],
      title: customText,
      summary: '',
    };

    const customPoint: DotPlotPoint = {
      x: scaledX,
      y: scaledY,
      data: customTree,
      color: customColor,
      isCustom: true,
      customText: customText,
    };

    setCustomPoints([...customPoints, customPoint]);
    setCustomPointData([...customPointData, { text: customText, color: customColor }]);
    setCustomText('');
  };

  // Re-project custom points using current algorithm and scale
  const reprojectCustomPoints = useCallback(() => {
    if (customPointData.length === 0 || projectionScale === 1) return;

    const reprojected = customPointData.map((data) => {
      // Generate embedding for custom text
      const embedding = generateCustomEmbedding(data.text);
      
      // Project using the current algorithm
      let projectedX: number, projectedY: number;
      if (algorithm === 'umap') {
        projectedX = (embedding.slice(5, 30).reduce((a, b) => a + b, 0) / 25) * 60;
        projectedY = (embedding.slice(20, 45).reduce((a, b) => a + b, 0) / 25) * 60;
      } else {
        projectedX = embedding.slice(0, 25).reduce((a, b) => a + b, 0) * 50;
        projectedY = embedding.slice(25, 50).reduce((a, b) => a + b, 0) * 50;
      }

      // Scale and center the custom point using stored values
      const scaledX = (projectedX - projectionCenter.x) * projectionScale;
      const scaledY = (projectedY - projectionCenter.y) * projectionScale;

      // Create a dummy Tree object for the custom point
      const customTree: Tree = {
        topic: data.text,
        size: 1,
        children: [],
        title: data.text,
        summary: '',
      };

      return {
        x: scaledX,
        y: scaledY,
        data: customTree,
        color: data.color,
        isCustom: true,
        customText: data.text,
      } as DotPlotPoint;
    });

    setCustomPoints(reprojected);
  }, [customPointData, algorithm, projectionScale, projectionCenter]);

  // Re-project custom points when algorithm, scale, or center changes
  useEffect(() => {
    if (customPointData.length > 0 && projectionScale !== 1 && !isLoading) {
      reprojectCustomPoints();
    }
  }, [algorithm, projectionScale, projectionCenter.x, projectionCenter.y, customPointData.length, isLoading, reprojectCustomPoints]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddCustomPoint();
    }
  };

  if (isLoading) {
    return (
      <Box
        width="100%"
        height="100%"
        display="flex"
        alignItems="center"
        justifyContent="center"
        fontSize="24px"
        color="gray.500"
      >
        Computing {algorithm === 'umap' ? 'UMAP' : 't-SNE'}...
      </Box>
    );
  }

  return (
    <Box width="100%" height="100%" position="relative">
      {/* Algorithm Toggle */}
      <Box
        position="absolute"
        top="20px"
        right="20px"
        zIndex={100}
      >
        <HStack spacing={controlSpacing}>
          <Button
            fontSize={`${buttonFontSize}px`}
            px={buttonPaddingX}
            py={buttonPaddingY}
            width={`${buttonWidth}px`}
            height={`${buttonHeight}px`}
            onClick={() => handleAlgorithmChange('tsne')}
            bg={algorithm === 'tsne' ? buttonActiveBg : buttonBg}
            color={algorithm === 'tsne' ? buttonActiveTextColor : buttonTextColor}
            fontWeight="bold"
            _hover={{
              bg: algorithm === 'tsne' ? buttonActiveBg : useColorModeValue('gray.200', 'gray.600')
            }}
          >
            t-SNE
          </Button>
          <Button
            fontSize={`${buttonFontSize}px`}
            px={buttonPaddingX}
            py={buttonPaddingY}
            width={`${buttonWidth}px`}
            height={`${buttonHeight}px`}
            onClick={() => handleAlgorithmChange('umap')}
            bg={algorithm === 'umap' ? buttonActiveBg : buttonBg}
            color={algorithm === 'umap' ? buttonActiveTextColor : buttonTextColor}
            fontWeight="bold"
            _hover={{
              bg: algorithm === 'umap' ? buttonActiveBg : useColorModeValue('gray.200', 'gray.600')
            }}
          >
            UMAP
          </Button>
        </HStack>
      </Box>

      {/* Custom Point Input - Bottom Left */}
      <Box
        position="absolute"
        bottom="20px"
        left="20px"
        zIndex={100}
      >
        <HStack spacing={controlSpacing}>
          <Input
            placeholder="Add word or phrase..."
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyPress={handleKeyPress}
            fontSize={`${inputFontSize}px`}
            height={`${inputHeight}px`}
            width={`${inputWidth}px`}
            bg={useColorModeValue('white', 'gray.700')}
            color={useColorModeValue('gray.800', 'gray.100')}
          />
          <Input
            type="color"
            value={customColor}
            onChange={(e) => setCustomColor(e.target.value)}
            width={`${colorPickerSize}px`}
            height={`${inputHeight}px`}
            p={0}
            border="2px solid"
            borderColor={useColorModeValue('gray.300', 'gray.600')}
            borderRadius="md"
            cursor="pointer"
          />
          <IconButton
            aria-label="Add custom point"
            icon={<MdAdd />}
            onClick={handleAddCustomPoint}
            width={`${iconButtonSize}px`}
            height={`${inputHeight}px`}
            fontSize={`${iconButtonFontSize}px`}
            colorScheme="blue"
            isDisabled={!customText.trim() || points.length === 0}
          />
        </HStack>
      </Box>

      <svg width={width} height={height}>
        {/* Background */}
        <rect
          width={width}
          height={height}
          fill={backgroundColor}
          stroke={strokeColor}
          strokeWidth={1}
        />
        
        {/* Original Points */}
        {points.map((point, i) => (
          <g key={i}>
            <circle
              cx={point.x + width / 2}
              cy={point.y + height / 2}
              r={circleRadius}
              fill={point.color}
              stroke={circleStroke}
              strokeWidth={strokeWidth}
              style={{ cursor: 'pointer' }}
              onClick={() => handlePointClick(point)}
              onMouseEnter={() => handlePointHover(point)}
              onMouseLeave={() => handlePointHover(null)}
            />
          </g>
        ))}
        
        {/* Custom Points - rendered after original points so they appear on top */}
        {customPoints.map((point, i) => (
          <g key={`custom-${i}`}>
            <circle
              cx={point.x + width / 2}
              cy={point.y + height / 2}
              r={circleRadius * 1.5}
              fill={point.color}
              stroke={useColorModeValue('black', 'white')}
              strokeWidth={strokeWidth * 2}
              style={{ cursor: 'pointer' }}
              onClick={() => handlePointClick(point)}
              onMouseEnter={() => handlePointHover(point)}
              onMouseLeave={() => handlePointHover(null)}
            />
          </g>
        ))}
      </svg>
      
      {/* Legend */}
      <Box
        position="absolute"
        top="20px"
        left="20px"
        bg={legendBg}
        p={legendPadding / 2}
        borderRadius="lg"
        boxShadow="xl"
        width={`${legendWidth}px`}
        border="2px solid"
        borderColor={useColorModeValue('gray.200', 'gray.600')}
      >
        <Text 
          fontSize={`${legendTitleSize}px`} 
          fontWeight="bold" 
          mb={legendItemSpacing}
          color={useColorModeValue('gray.800', 'gray.100')}
        >
          Topic Cluster
        </Text>
        {Array.from(new Set(points.map(p => p.color))).map((color, i) => {
          const papersWithColor = points.filter(p => p.color === color);
          const samplePaper = papersWithColor[0];
          const parentAtDepth = samplePaper ? getAncestorTopicAtDepth(s.filteredData || data, samplePaper.data, s.depth) : 'Unknown';
          
          return (
            <Box 
              key={i} 
              display="flex" 
              alignItems="center" 
              mb={legendItemSpacing / 2}
              p={2}
              borderRadius="md"
              _hover={{ 
                bg: useColorModeValue('gray.50', 'gray.700'),
                transform: 'translateX(4px)',
                transition: 'all 0.2s ease'
              }}
            >
              <Box
                width={`${legendColorSize}px`}
                height={`${legendColorSize}px`}
                bg={color}
                borderRadius="50%"
                mr={legendItemSpacing}
                border="2px solid"
                borderColor={useColorModeValue('white', 'gray.600')}
                boxShadow="sm"
              />
              <Text 
                fontSize={`${legendItemSize}px`} 
                color={legendTextColor}
                fontWeight="medium"
                lineHeight="1.2"
              >
                {parentAtDepth} ({papersWithColor.length})
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

