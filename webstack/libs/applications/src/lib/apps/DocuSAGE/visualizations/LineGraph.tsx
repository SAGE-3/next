import React, { useMemo } from 'react';
import * as d3 from 'd3';
import { Tree } from '../data';
import { AppState } from '../DocuSAGE';
import { Box, useColorModeValue } from '@chakra-ui/react';

type LineGraphProps = {
  width: number;
  height: number;
  data: Tree;
  state: AppState;
  colors: string[];
  onTitleHover?: (title: string | null) => void;
};

type YearData = {
  year: number;
  [topicName: string]: number | string; // topicName -> count
};

export const LineGraph = ({
  width,
  height,
  data,
  state: s,
  colors,
  onTitleHover,
}: LineGraphProps): JSX.Element => {
  
  // Color mode values for dark/light theme support
  const backgroundColor = useColorModeValue('#f8f9fa', '#1a1a1a');
  const strokeColor = useColorModeValue('#e9ecef', '#404040');
  const textColor = useColorModeValue('#333', '#ccc');
  const gridColor = useColorModeValue('#e0e0e0', '#404040');

  // Calculate margins (increased to prevent text clipping)
  const margin = { top: 100, right: 80, bottom: 120, left: 150 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

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

  // Helpers to resolve ancestor topic at current depth
  const findPathToNode = (root: Tree, target: Tree): Tree[] | null => {
    if (root === target) return [root];
    if (!root.children) return null;
    for (const child of root.children) {
      const childPath = findPathToNode(child, target);
      if (childPath) return [root, ...childPath];
    }
    return null;
  };

  const getAncestorTopicAtDepth = (root: Tree, paper: Tree, targetDepth: number): string | null => {
    const path = findPathToNode(root, paper);
    if (!path) return null;
    const clampedDepth = Math.min(Math.max(targetDepth, 0), path.length - 2);
    const nodeAtDepth = path[clampedDepth];
    return nodeAtDepth ? nodeAtDepth.topic : null;
  };

  // Extract papers and their years from the current layer
  const { papers, topics } = useMemo(() => {
    const allLeafPapers: Tree[] = [];
    const collectLeaves = (node: Tree) => {
      if (!node.children || node.children.length === 0) {
        allLeafPapers.push(node);
        return;
      }
      node.children.forEach(collectLeaves);
    };
    const root = s.filteredData || data;
    collectLeaves(root);

    const papersWithTopics = allLeafPapers.map(paper => {
      const ancestor = getAncestorTopicAtDepth(root, paper, s.depth);
      return ancestor ? { paper, topic: ancestor } : null;
    }).filter(Boolean) as { paper: Tree; topic: string }[];

    const uniqueTopics = Array.from(new Set(papersWithTopics.map(p => p.topic)));
    return { papers: papersWithTopics, topics: uniqueTopics };
  }, [data, s.filteredData, s.depth]);

  // Process data for the line graph
  const chartData = useMemo(() => {
    // Get all unique years from papers
    const years = new Set<number>();
    papers.forEach(({ paper }) => {
      if (paper.year) {
        // Extract first four consecutive digits from the year string
        const yearMatch = paper.year.match(/\d{4}/);
        if (yearMatch) {
          const year = parseInt(yearMatch[0]);
          if (!isNaN(year) && year > 1900 && year < 2030) {
            years.add(year);
          }
        }
      }
    });

    const sortedYears = Array.from(years).sort();
    
    // Create data structure for each year
    const yearData: YearData[] = sortedYears.map(year => {
      const dataPoint: YearData = { year };
      
      // Initialize count for each topic
      topics.forEach(topic => {
        dataPoint[topic] = 0;
      });
      
      return dataPoint;
    });

    // Count papers by year and topic
    papers.forEach(({ paper, topic }) => {
      if (paper.year) {
        // Extract first four consecutive digits from the year string
        const yearMatch = paper.year.match(/\d{4}/);
        if (yearMatch) {
          const year = parseInt(yearMatch[0]);
          if (!isNaN(year) && year > 1900 && year < 2030) {
            const yearIndex = sortedYears.indexOf(year);
            if (yearIndex !== -1) {
              const currentCount = yearData[yearIndex][topic] as number;
              yearData[yearIndex][topic] = currentCount + 1;
            }
          }
        }
      }
    });

    return yearData;
  }, [papers, topics]);

  // Create scales
  const xScale = useMemo(() => {
    if (chartData.length === 0) return d3.scaleLinear().domain([0, 1]).range([0, innerWidth]);
    
    const years = chartData.map(d => d.year);
    return d3.scaleLinear()
      .domain(d3.extent(years) as [number, number])
      .range([0, innerWidth]);
  }, [chartData, innerWidth]);

  const yScale = useMemo(() => {
    if (chartData.length === 0) return d3.scaleLinear().domain([0, 1]).range([innerHeight, 0]);
    
    const maxCount = Math.max(...chartData.map(d => 
      Math.max(...topics.map(topic => d[topic] as number))
    ));
    
    return d3.scaleLinear()
      .domain([0, maxCount])
      .range([innerHeight, 0]);
  }, [chartData, topics, innerHeight]);

  // Create line generator function
  const createLine = (topicName: string) => d3.line<YearData>()
    .x(d => xScale(d.year))
    .y(d => yScale(d[topicName] as number))
    .curve(d3.curveMonotoneX);

  // Create area generator function for filled areas
  const createArea = (topicName: string) => d3.area<YearData>()
    .x(d => xScale(d.year))
    .y0(innerHeight)
    .y1(d => yScale(d[topicName] as number))
    .curve(d3.curveMonotoneX);

  if (chartData.length === 0) {
    return (
      <Box
        width="100%"
        height="100%"
        display="flex"
        alignItems="center"
        justifyContent="center"
        fontSize="72px"
        color="gray.500"
      >
        No data available for line graph
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
        
        {/* Main chart group */}
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Grid lines */}
          <g className="grid">
            {/* Horizontal grid lines */}
            {yScale.ticks(5).map(tick => (
              <g key={tick}>
                <line
                  x1={0}
                  x2={innerWidth}
                  y1={yScale(tick)}
                  y2={yScale(tick)}
                  stroke={gridColor}
                  strokeWidth={1}
                  opacity={0.3}
                />
                <text
                  x={-20}
                  y={yScale(tick)}
                  dy="0.32em"
                  textAnchor="end"
                  fontSize="48"
                  fill={textColor}
                >
                  {tick}
                </text>
              </g>
            ))}
            
            {/* Vertical grid lines */}
            {xScale.ticks(5).map(tick => (
              <g key={tick}>
                <line
                  x1={xScale(tick)}
                  x2={xScale(tick)}
                  y1={0}
                  y2={innerHeight}
                  stroke={gridColor}
                  strokeWidth={1}
                  opacity={0.3}
                />
                <text
                  x={xScale(tick)}
                  y={innerHeight + 60}
                  textAnchor="middle"
                  fontSize="48"
                  fill={textColor}
                >
                  {tick}
                </text>
              </g>
            ))}
          </g>
          
          {/* Lines for each topic */}
          {topics.map((topic, index) => {
            const color = getColorForTopic(topic);
            const topicData = chartData.filter(d => (d[topic] as number) > 0);
            const line = createLine(topic);
            const area = createArea(topic);
            
            return (
              <g key={topic}>
                {/* Line */}
                <path
                  d={line(topicData) || ''}
                  fill="none"
                  stroke={color}
                  strokeWidth={9}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => onTitleHover?.(topic)}
                  onMouseLeave={() => onTitleHover?.(null)}
                />
                
                {/* Data points */}
                {topicData.map((d, i) => (
                  <circle
                    key={i}
                    cx={xScale(d.year)}
                    cy={yScale(d[topic] as number)}
                    r={24}
                    fill={color}
                    stroke="white"
                    strokeWidth={2}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => onTitleHover?.(`${topic}: ${d[topic]} papers in ${d.year}`)}
                    onMouseLeave={() => onTitleHover?.(null)}
                  />
                ))}
              </g>
            );
          })}
        </g>
        
        {/* Axis labels */}
        <text
          x={width / 2}
          y={height - 10}
          textAnchor="middle"
          fontSize="60"
          fontWeight="bold"
          fill={textColor}
        >
          Year
        </text>
        <text
          x={50}
          y={height / 2}
          textAnchor="middle"
          fontSize="60"
          fontWeight="bold"
          fill={textColor}
          transform={`rotate(-90, 50, ${height / 2})`}
        >
          Number of Papers
        </text>
        
      </svg>
      
      {/* Legend Overlay - Similar to TSNE */}
      <Box
        position="absolute"
        top="20px"
        right="20px"
        bg={useColorModeValue('white', 'gray.800')}
        p={4}
        borderRadius="lg"
        boxShadow="xl"
        border="2px solid"
        borderColor={useColorModeValue('gray.200', 'gray.600')}
        minWidth="300px"
        maxWidth="1200px"
      >
        <Box 
          fontSize="24px" 
          fontWeight="bold" 
          mb={3}
          color={useColorModeValue('gray.800', 'gray.100')}
        >
          Topic Trends
        </Box>
        {topics.map((topic, index) => {
          const color = getColorForTopic(topic);
          const totalPapers = papers.filter(p => p.topic === topic).length;
          
          return (
            <Box 
              key={topic} 
              display="flex" 
              alignItems="center" 
              mb={2}
              p={2}
              borderRadius="md"
              _hover={{ 
                bg: useColorModeValue('gray.50', 'gray.700'),
                transform: 'translateX(4px)',
                transition: 'all 0.2s ease'
              }}
            >
              <Box
                width="18px"
                height="18px"
                bg={color}
                borderRadius="50%"
                mr={3}
                border="2px solid"
                borderColor={useColorModeValue('white', 'gray.600')}
                boxShadow="sm"
              />
              <Box
                fontSize="18px"
                color={useColorModeValue('gray.600', 'gray.300')}
                fontWeight="medium"
                lineHeight="1.2"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => onTitleHover?.(topic)}
                onMouseLeave={() => onTitleHover?.(null)}
              >
                {topic} ({totalPapers})
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
