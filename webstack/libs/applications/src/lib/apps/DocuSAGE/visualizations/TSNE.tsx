import React, { useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Tree } from '../data';
import { AppState } from '../DocuSAGE';
import { Box, Text, Tooltip, useColorModeValue } from '@chakra-ui/react';

type TSNEProps = {
  width: number;
  height: number;
  data: Tree;
  state: AppState;
  colors: string[];
  onPaperClick?: (paper: Tree) => void;
  onTitleHover?: (title: string | null) => void;
};

type TSNEPoint = {
  x: number;
  y: number;
  data: Tree;
  color: string;
};

export const TSNE = ({
  width,
  height,
  data,
  state: s,
  colors,
  onPaperClick,
  onTitleHover,
}: TSNEProps): JSX.Element => {
  const [points, setPoints] = useState<TSNEPoint[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<TSNEPoint | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Color mode values for dark/light theme support
  const backgroundColor = useColorModeValue('#f8f9fa', '#1a1a1a');
  const strokeColor = useColorModeValue('#e9ecef', '#404040');
  const legendBg = useColorModeValue('white', 'gray.800');
  const legendTextColor = useColorModeValue('gray.600', 'gray.300');
  const tooltipBg = useColorModeValue('rgba(0,0,0,0.8)', 'rgba(255,255,255,0.9)');
  const tooltipTextColor = useColorModeValue('white', 'black');
  const circleStroke = useColorModeValue('white', '#2d2d2d');

  // Calculate responsive circle size based on viewport
  const circleRadius = Math.max(15, Math.min(40, Math.min(width, height) * 0.02));
  const strokeWidth = Math.max(2, circleRadius * 0.15);
  
  // Calculate responsive tooltip size
  const tooltipWidth = Math.max(150, Math.min(250, width * 0.15));
  const tooltipHeight = Math.max(25, Math.min(35, height * 0.04));
  const tooltipFontSize = Math.max(10, Math.min(14, Math.min(width, height) * 0.015));
  
  // Calculate responsive legend size based on viewport
  const legendMinWidth = Math.max(375, width * 0.27);
  const legendMaxWidth = Math.max(480, width * 0.375);
  const legendPadding = Math.max(24, Math.min(42, Math.min(width, height) * 0.0375));
  const legendTitleSize = Math.max(21, Math.min(60, Math.min(width, height) * 0.03));
  const legendItemSize = Math.max(18, Math.min(40, Math.min(width, height) * 0.024));
  const legendColorSize = Math.max(21, Math.min(30, Math.min(width, height) * 0.03));
  const legendItemSpacing = Math.max(12, Math.min(18, Math.min(width, height) * 0.018));

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

  // Generate embeddings for t-SNE
  const generateEmbeddings = async (papers: Tree[]): Promise<number[][]> => {
    // For now, create simple embeddings based on text features
    // In a real implementation, you'd use a proper embedding model
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

  // Function to ensure minimum distance between points
  const ensureMinimumDistance = (points: TSNEPoint[], minDistance: number = 60, viewportSize: { width: number; height: number }): TSNEPoint[] => {
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

  // Run t-SNE
  const runTSNE = async () => {
    if (papers.length === 0) return;
    
    setIsLoading(true);
    
    try {
      // Generate embeddings
      const embeddings = await generateEmbeddings(papers);
      
      // Simple 2D projection (in practice, you'd use a proper t-SNE library)
      const projected = embeddings.map((embedding, i) => {
        // Simple PCA-like projection for demo
        const x = embedding.slice(0, 25).reduce((a, b) => a + b, 0) * 50;
        const y = embedding.slice(25, 50).reduce((a, b) => a + b, 0) * 50;
        
        
        return {
          x: x ,
          y: y ,
          data: papers[i],
          color: getColorForPaper(papers[i])
        };
      });
      
      // Scale and center the points to fit within the viewport
      const xValues = projected.map(p => p.x);
      const yValues = projected.map(p => p.y);
      const minX = Math.min(...xValues);
      const maxX = Math.max(...xValues);
      const minY = Math.min(...yValues);
      const maxY = Math.max(...yValues);
      
      const rangeX = maxX - minX;
      const rangeY = maxY - minY;
      const maxRange = Math.max(rangeX, rangeY);
      
      // Scale to use most of the available space, leaving some margin
      const margin = 100; // Leave 50px margin on each side
      const availableWidth = width - margin;
      const availableHeight = height - margin;
      const scaleX = availableWidth / Math.max(rangeX, 1);
      const scaleY = availableHeight / Math.max(rangeY, 1);
      const scale = Math.min(scaleX, scaleY) * 0.8; // Use 80% of available space
      
      // Center the points
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      
      const scaledProjected = projected.map(point => ({
        ...point,
        x: (point.x - centerX) * scale,
        y: (point.y - centerY) * scale
      }));
      
      // Apply minimum distance to prevent overlap (scaled to viewport size)
      const minDistance = Math.min(width, height) * 0.05; // 5% of smaller dimension
      const spacedPoints = ensureMinimumDistance(scaledProjected, minDistance, { width, height });
      
      setPoints(spacedPoints);
    } catch (error) {
      console.error('Error running t-SNE:', error);
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

  // Run t-SNE when papers change
  useEffect(() => {
    runTSNE();
  }, [papers]);

  const handlePointClick = (point: TSNEPoint) => {
    onPaperClick?.(point.data);
  };

  const handlePointHover = (point: TSNEPoint | null) => {
    setHoveredPoint(point);
    if (point) {
      onTitleHover?.(point.data.title || point.data.topic);
    } else {
      onTitleHover?.(null);
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
        Computing t-SNE...
      </Box>
    );
  }

  return (
    <Box width="100%" height="100%" position="relative">
      <svg width={width} height={height}>
        {/* Background */}
        <rect
          width={width}
          height={height}
          fill={backgroundColor}
          stroke={strokeColor}
          strokeWidth={1}
        />
        
        {/* Points */}
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
      </svg>
      
      {/* Legend */}
      <Box
        position="absolute"
        top="20px"
        right="20px"
        bg={legendBg}
        p={legendPadding /2}
        borderRadius="lg"
        boxShadow="xl"
        minWidth={`${legendMinWidth}px`}
        maxWidth={`${legendMaxWidth}px`}
        border="2px solid"
        borderColor={useColorModeValue('gray.200', 'gray.600')}
      >
        <Text 
          fontSize={`${legendTitleSize}px`} 
          fontWeight="bold" 
          mb={legendItemSpacing}
          color={useColorModeValue('gray.800', 'gray.100')}
        >
          Topic Clusters
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
