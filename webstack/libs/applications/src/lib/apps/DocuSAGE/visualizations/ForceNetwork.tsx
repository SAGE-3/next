import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { Tree } from '../data';
import { AppState } from '../DocuSAGE';
import { Box, useColorModeValue, VStack, HStack, Text, Slider, SliderTrack, SliderFilledTrack, SliderThumb, Button } from '@chakra-ui/react';

type ForceNetworkProps = {
  width: number;
  height: number;
  data: Tree;
  state: AppState;
  colors: string[];
  onTitleHover?: (title: string | null) => void;
  onPaperClick?: (paper: Tree) => void;
};

type NodeType = 'cluster' | 'paper';

interface NetworkNode extends d3.SimulationNodeDatum {
  id: string;
  data: Tree;
  type: NodeType;
  group: string; // Top-level parent topic for coloring
  title: string;
  size: number;
  depth: number;
  fixed?: boolean;
  fx?: number | null;
  fy?: number | null;
}

type LinkType = 'hierarchy' | 'paper';

interface NetworkLink extends d3.SimulationLinkDatum<NetworkNode> {
  source: NetworkNode | string;
  target: NetworkNode | string;
  type: LinkType;
  strength: number;
}

export const ForceNetwork = ({
  width,
  height,
  data,
  state: s,
  colors,
  onTitleHover,
  onPaperClick,
}: ForceNetworkProps): JSX.Element => {
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [links, setLinks] = useState<NetworkLink[]>([]);
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null);
  const [draggedNode, setDraggedNode] = useState<NetworkNode | null>(null);
  const [zoomTransform, setZoomTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  const [forceCharge, setForceCharge] = useState(-500);
  const [forceLinkDistance, setForceLinkDistance] = useState(100);
  
  const simulationRef = useRef<d3.Simulation<NetworkNode, NetworkLink> | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Color mode values for dark/light theme support
  const backgroundColor = useColorModeValue('#f8f9fa', '#1a1a1a');
  const strokeColor = useColorModeValue('#e9ecef', '#404040');
  const textColor = useColorModeValue('#333', '#ccc');
  const legendBg = useColorModeValue('white', 'gray.800');
  const legendTextColor = useColorModeValue('gray.600', 'gray.300');
  const tooltipBg = useColorModeValue('rgba(0,0,0,0.9)', 'rgba(255,255,255,0.95)');
  const tooltipTextColor = useColorModeValue('white', 'black');
  const rootNodeColor = useColorModeValue('#808080', '#a0a0a0'); // Gray for root node

  // Build color mapping aligned with other visualizations
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

  // Helper to find path from root to target node
  const findPathToNode = (root: Tree, target: Tree): Tree[] | null => {
    if (root === target) return [root];
    if (!root.children) return null;
    for (const child of root.children) {
      const childPath = findPathToNode(child, target);
      if (childPath) return [root, ...childPath];
    }
    return null;
  };

  // Extract all nodes (clusters and papers) from the tree - always show all layers
  const extractNodes = (node: Tree, currentDepth: number = 0): { clusters: Tree[], papers: Tree[] } => {
    const clusters: Tree[] = [];
    const papers: Tree[] = [];

    const traverse = (n: Tree, depth: number) => {
      const isLeaf = !n.children || n.children.length === 0;
      
      if (isLeaf) {
        // It's a paper/document
        papers.push(n);
      } else {
        // It's a cluster - always include it
        clusters.push(n);
        // Continue traversing all children regardless of depth
        n.children.forEach(child => traverse(child, depth + 1));
      }
    };

    traverse(node, currentDepth);
    return { clusters, papers };
  };

  // Build network nodes and links
  const buildNetwork = useCallback(() => {
    const displayData = s.filteredData || data;
    const { clusters, papers } = extractNodes(displayData, 0);

    // Create cluster nodes
    const clusterNodes: NetworkNode[] = clusters.map(cluster => {
      const topLevelParent = getTopLevelParentTopic(cluster.topic) || cluster.topic;
      const path = findPathToNode(data, cluster);
      const depth = path ? path.length - 1 : 0;
      
      return {
        id: cluster.topic,
        data: cluster,
        type: 'cluster',
        group: topLevelParent,
        title: cluster.topic,
        size: cluster.size || (cluster.children ? cluster.children.length : 0),
        depth: depth,
        x: undefined,
        y: undefined,
      };
    });

    // Create paper nodes
    const paperNodes: NetworkNode[] = papers.map(paper => {
      const topLevelParent = getTopLevelParentTopic(paper.topic) || paper.topic;
      const path = findPathToNode(data, paper);
      const depth = path ? path.length - 1 : 0;
      
      return {
        id: paper.topic,
        data: paper,
        type: 'paper',
        group: topLevelParent,
        title: paper.title || paper.topic,
        size: paper.size || 1,
        depth: depth,
        x: undefined,
        y: undefined,
      };
    });

    const allNodes = [...clusterNodes, ...paperNodes];

    // Build hierarchy links (cluster to sub-cluster or cluster to paper)
    const hierarchyLinks: NetworkLink[] = [];
    clusters.forEach(cluster => {
      if (cluster.children) {
        cluster.children.forEach(child => {
          const childNode = allNodes.find(n => n.id === child.topic);
          if (childNode) {
            hierarchyLinks.push({
              source: cluster.topic,
              target: child.topic,
              type: 'hierarchy',
              strength: 0.8,
            });
          }
        });
      }
    });

    const allLinks = hierarchyLinks;

    setNodes(allNodes);
    setLinks(allLinks);

    return { nodes: allNodes, links: allLinks };
  }, [data, s.filteredData]);

  // Initialize or update simulation
  useEffect(() => {
    const { nodes: nodeData, links: linkData } = buildNetwork();

    // Stop previous simulation if it exists
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    // Calculate group positions in a circular pattern
    const uniqueGroups = Array.from(new Set(nodeData.map(n => n.group)));
    const groupPositions = new Map<string, { x: number; y: number }>();
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.3; // Distance from center for each group
    
    uniqueGroups.forEach((group, i) => {
      const angle = (i / uniqueGroups.length) * 2 * Math.PI - Math.PI / 2; // Start from top
      groupPositions.set(group, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    });

    // Initialize node positions near their group centers
    nodeData.forEach(node => {
      const pos = groupPositions.get(node.group);
      if (pos && (node.x === undefined || node.y === undefined)) {
        // Add some random offset so nodes don't all start at the exact same point
        const offset = (Math.random() - 0.5) * 50;
        node.x = pos.x + offset;
        node.y = pos.y + offset;
      } else if (node.x === undefined || node.y === undefined) {
        node.x = centerX + (Math.random() - 0.5) * 100;
        node.y = centerY + (Math.random() - 0.5) * 100;
      }
    });

    // Create force simulation
    const simulation = d3
      .forceSimulation<NetworkNode>(nodeData)
      .force(
        'link',
        d3.forceLink<NetworkNode, NetworkLink>(linkData)
          .id((d) => d.id)
          .distance((d) => {
            const link = d as NetworkLink;
            if (link.type === 'hierarchy') {
              return forceLinkDistance * 1.5;
            }
            return forceLinkDistance;
          })
          .strength((d) => {
            const link = d as NetworkLink;
            return link.strength * 1.0;
          })
      )
      .force('charge', d3.forceManyBody<NetworkNode>()
        .strength((d) => {
          // Clusters have stronger repulsion
          return d.type === 'cluster' ? forceCharge * 1.5 : forceCharge;
        })
      )
      // Add group positioning force - pulls nodes toward their group's position
      .force('groupX', d3.forceX<NetworkNode>()
        .strength(0.15)
        .x((d) => {
          const pos = groupPositions.get(d.group);
          return pos ? pos.x : centerX;
        })
      )
      .force('groupY', d3.forceY<NetworkNode>()
        .strength(0.15)
        .y((d) => {
          const pos = groupPositions.get(d.group);
          return pos ? pos.y : centerY;
        })
      )
      // Add repulsion between different groups using a custom force
      .force('groupRepulsion', (alpha) => {
        const minDistance = Math.min(width, height) * 0.25; // Minimum distance between groups
        const strength = 0.3;
        
        for (let i = 0; i < nodeData.length; i++) {
          const nodeA = nodeData[i];
          if (nodeA.x === undefined || nodeA.y === undefined) continue;
          
          for (let j = i + 1; j < nodeData.length; j++) {
            const nodeB = nodeData[j];
            if (nodeB.x === undefined || nodeB.y === undefined) continue;
            if (nodeA.group === nodeB.group) continue; // Skip same group
            
            const dx = (nodeB.x as number) - (nodeA.x as number);
            const dy = (nodeB.y as number) - (nodeA.y as number);
            const distanceSquared = dx * dx + dy * dy;
            const distance = Math.sqrt(distanceSquared);
            
            if (distance < minDistance && distance > 0) {
              const force = (minDistance - distance) / distance * strength * alpha;
              const fx = dx * force;
              const fy = dy * force;
              
              nodeA.vx = (nodeA.vx || 0) - fx;
              nodeA.vy = (nodeA.vy || 0) - fy;
              nodeB.vx = (nodeB.vx || 0) + fx;
              nodeB.vy = (nodeB.vy || 0) + fy;
            }
          }
        }
      })
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.1))
      .force('collision', d3.forceCollide<NetworkNode>()
        .radius((d) => {
          if (d.type === 'cluster') {
            return Math.sqrt(d.size) * 15 + 30;
          }
          return Math.sqrt(d.size) * 5 + 10;
        })
      )
      .on('tick', () => {
        setNodes([...nodeData]);
      });

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
    };
  }, [buildNetwork, width, height, forceCharge, forceLinkDistance]);

  // Setup zoom behavior
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .filter((event) => {
        // Allow wheel zoom always, but disable pan when dragging a node
        // Disable click-to-zoom
        if (event.type === 'wheel') return true;
        if (event.type === 'mousedown' && event.button === 0) {
          // Allow left-click drag for panning, but not double-click zoom
          return !draggedNode;
        }
        // Disable all other mouse events for zoom (including double-click)
        if (event.type === 'dblclick') return false;
        return !draggedNode;
      })
      .on('zoom', (event) => {
        setZoomTransform(event.transform);
        if (containerRef.current) {
          containerRef.current.setAttribute('transform', event.transform.toString());
        }
      });

    zoomRef.current = zoom;
    const svgSelection = d3.select(svgRef.current);
    svgSelection.call(zoom);
    
    // Explicitly disable double-click zoom
    svgSelection.on('dblclick.zoom', null);

    return () => {
      if (svgRef.current && zoomRef.current) {
        d3.select(svgRef.current).on('.zoom', null);
      }
    };
  }, [draggedNode]);

  // Handle node drag
  const handleNodeDragStart = useCallback((event: React.MouseEvent, node: NetworkNode) => {
    event.stopPropagation();
    setDraggedNode(node);
    if (simulationRef.current) {
      simulationRef.current.alphaTarget(0.3).restart();
      // Account for zoom transform
      const [x, y] = d3.pointer(event, containerRef.current);
      node.fx = (x - zoomTransform.x) / zoomTransform.k;
      node.fy = (y - zoomTransform.y) / zoomTransform.k;
    }
  }, [zoomTransform]);

  const handleNodeDrag = useCallback((event: React.MouseEvent) => {
    if (!draggedNode || !containerRef.current) return;
    
    // Account for zoom transform
    const [x, y] = d3.pointer(event, containerRef.current);
    draggedNode.fx = (x - zoomTransform.x) / zoomTransform.k;
    draggedNode.fy = (y - zoomTransform.y) / zoomTransform.k;
    
    if (simulationRef.current) {
      simulationRef.current.alpha(0.3).restart();
    }
  }, [draggedNode, zoomTransform]);

  const handleNodeDragEnd = useCallback(() => {
    if (!draggedNode) return;
    
    if (simulationRef.current) {
      simulationRef.current.alphaTarget(0);
    }
    
    // Optionally unfix the node after a delay
    setTimeout(() => {
      if (draggedNode) {
        draggedNode.fx = null;
        draggedNode.fy = null;
      }
    }, 100);
    
    setDraggedNode(null);
  }, [draggedNode]);

  // Reset zoom
  const handleResetZoom = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(750)
        .call(zoomRef.current.transform, d3.zoomIdentity);
    }
  }, []);

  // Calculate responsive sizes
  const baseSize = Math.min(width, height);
  const clusterRadius = Math.max(15, Math.min(40, baseSize * 0.025));
  const paperRadius = Math.max(5, Math.min(12, baseSize * 0.012));
  const fontSize = Math.max(10, Math.min(12, baseSize * 0.015));
  
  // Legend sizes (matching DotPlot)
  const legendWidth = width * 0.2;
  const legendPadding = baseSize * 0.0375;
  const legendTitleSize = baseSize * 0.03;
  const legendItemSize = baseSize * 0.024;
  const legendColorSize = baseSize * 0.03;
  const legendItemSpacing = baseSize * 0.018;
  
  // Button and control sizes (matching DotPlot)
  const buttonFontSize = baseSize * 0.035;
  const buttonWidth = baseSize * 0.15;
  const buttonHeight = baseSize * 0.055;
  const buttonPaddingX = baseSize * 0.018;
  const buttonPaddingY = baseSize * 0.012;
  const controlTextSize = baseSize * 0.028;
  const controlSpacing = baseSize * 0.01;

  // Get the root node (the one that matches displayData)
  const displayData = s.filteredData || data;
  const rootNodeId = displayData.topic;

  // Get unique groups for legend (excluding the root node)
  const uniqueGroups = useMemo(() => {
    const groups = new Set(nodes.map(n => n.group));
    // Remove the root node's group from the legend
    const rootNode = nodes.find(n => n.id === rootNodeId);
    if (rootNode) {
      groups.delete(rootNode.group);
    }
    return Array.from(groups);
  }, [nodes, rootNodeId]);

  return (
    <Box width="100%" height="100%" position="relative">
      {/* Controls Panel */}
      <Box
        position="absolute"
        top="20px"
        right="20px"
        bg={legendBg}
        p={legendPadding / 2}
        borderRadius="lg"
        boxShadow="xl"
        zIndex={1000}
        width={`${buttonWidth * 1.5}px`}
        border="2px solid"
        borderColor={useColorModeValue('gray.200', 'gray.600')}
      >
        <VStack spacing={controlSpacing * 2} align="stretch">
          <Text fontSize={`${legendTitleSize}px`} fontWeight="bold" color={legendTextColor}>
            Force Controls
          </Text>
          
          <Box>
            <Text fontSize={`${controlTextSize}px`} color={legendTextColor} mb={1}>
              Charge: {forceCharge}
            </Text>
            <Slider
              value={forceCharge}
              onChange={setForceCharge}
              min={-2000}
              max={-100}
              step={50}
              size="lg"
            >
              <SliderTrack>
                <SliderFilledTrack />
              </SliderTrack>
              <SliderThumb />
            </Slider>
          </Box>

          <Box>
            <Text fontSize={`${controlTextSize}px`} color={legendTextColor} mb={1}>
              Link Distance: {forceLinkDistance}
            </Text>
            <Slider
              value={forceLinkDistance}
              onChange={setForceLinkDistance}
              min={50}
              max={200}
              step={10}
              size="lg"
            >
              <SliderTrack>
                <SliderFilledTrack />
              </SliderTrack>
              <SliderThumb />
            </Slider>
          </Box>

          <Button
            fontSize={`${buttonFontSize * 0.75}px`}
            px={buttonPaddingX * 0.75}
            py={buttonPaddingY * 0.75}
            width="100%"
            height={`${buttonHeight * 0.75}px`}
            onClick={handleResetZoom}
            colorScheme="blue"
            size="sm"
          >
            Reset Zoom
          </Button>
        </VStack>
      </Box>

      {/* Color Legend */}
      <Box
        position="absolute"
        top="20px"
        left="20px"
        bg={legendBg}
        p={legendPadding / 2}
        borderRadius="lg"
        boxShadow="xl"
        zIndex={1000}
        width={`${legendWidth}px`}
        border="2px solid"
        borderColor={useColorModeValue('gray.200', 'gray.600')}
      >
        <Text 
          fontSize={`${legendTitleSize}px`} 
          fontWeight="bold" 
          color={legendTextColor} 
          mb={legendItemSpacing}
        >
          Clusters
        </Text>
        <VStack spacing={legendItemSpacing / 2} align="stretch">
          {uniqueGroups.map((group, i) => (
            <HStack key={i} spacing={legendItemSpacing}>
              <Box
                width={`${legendColorSize}px`}
                height={`${legendColorSize}px`}
                minWidth={`${legendColorSize}px`}
                minHeight={`${legendColorSize}px`}
                flexShrink={0}
                borderRadius="50%"
                bg={getColorForTopic(group)}
                border="2px solid"
                borderColor={useColorModeValue('white', 'gray.600')}
                boxShadow="sm"
              />
              <Text 
                fontSize={`${legendItemSize}px`} 
                color={legendTextColor} 
                noOfLines={1}
                fontWeight="medium"
                lineHeight="1.2"
                wordBreak="break-word"
                flex="1"
              >
                {group}
              </Text>
            </HStack>
          ))}
        </VStack>
      </Box>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ background: backgroundColor, cursor: draggedNode ? 'grabbing' : 'grab' }}
        onMouseMove={draggedNode ? handleNodeDrag : undefined}
        onMouseUp={draggedNode ? handleNodeDragEnd : undefined}
        onMouseLeave={draggedNode ? handleNodeDragEnd : undefined}
      >
        <g ref={containerRef}>
          {/* Links */}
          <g>
            {links.map((link, i) => {
              const sourceId = typeof link.source === 'string' ? link.source : (link.source as NetworkNode).id;
              const targetId = typeof link.target === 'string' ? link.target : (link.target as NetworkNode).id;
              const sourceNode = nodes.find(n => n.id === sourceId);
              const targetNode = nodes.find(n => n.id === targetId);
              
              if (!sourceNode || !targetNode || sourceNode.x === undefined || sourceNode.y === undefined || targetNode.x === undefined || targetNode.y === undefined) {
                return null;
              }

              // Use gray for links connected to root node, otherwise use source node's color
              const isRootLink = sourceNode.id === rootNodeId || targetNode.id === rootNodeId;
              const linkColor = isRootLink ? rootNodeColor : getColorForTopic(sourceNode.group);

              return (
                <line
                  key={i}
                  x1={sourceNode.x}
                  y1={sourceNode.y}
                  x2={targetNode.x}
                  y2={targetNode.y}
                  stroke={linkColor}
                  strokeOpacity={0.6}
                  strokeWidth={2}
                />
              );
            })}
          </g>

          {/* Nodes */}
          <g>
            {nodes.map((node) => {
              if (node.x === undefined || node.y === undefined) return null;
              
              const isRoot = node.id === rootNodeId;
              const nodeColor = isRoot ? rootNodeColor : getColorForTopic(node.group); // Gray for root node
              const isCluster = node.type === 'cluster';
              const radius = isCluster ? clusterRadius : paperRadius;
              const isHovered = hoveredNode?.id === node.id;
              
              return (
                <g key={node.id}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={radius}
                    fill={nodeColor}
                    fillOpacity={isCluster ? 0.8 : 0.6}
                    stroke={nodeColor}
                    strokeWidth={isHovered ? 3 : 2}
                    style={{ cursor: draggedNode?.id === node.id ? 'grabbing' : 'grab' }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleNodeDragStart(e, node);
                    }}
                    onMouseEnter={() => {
                      if (!draggedNode) {
                        setHoveredNode(node);
                        onTitleHover?.(node.title);
                      }
                    }}
                    onMouseLeave={() => {
                      if (!draggedNode) {
                        setHoveredNode(null);
                        onTitleHover?.(null);
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (node.type === 'paper' && !draggedNode) {
                        onPaperClick?.(node.data);
                      }
                    }}
                  />
                  {isCluster && (
                    <text
                      x={node.x}
                      y={node.y + radius + fontSize + 2}
                      textAnchor="middle"
                      fontSize={`${fontSize}px`}
                      fill={textColor}
                      style={{ pointerEvents: 'none', userSelect: 'none', fontWeight: 'bold' }}
                    >
                      {node.title.length > 15 ? node.title.substring(0, 15) + '...' : node.title}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </svg>
    </Box>
  );
};
