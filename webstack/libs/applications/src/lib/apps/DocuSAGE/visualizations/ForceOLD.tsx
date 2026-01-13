import React, { useEffect, useState } from 'react';
import * as d3 from 'd3';
import { Tree } from '../data';
import { state as AppState } from '../index';

interface ForceNode extends d3.SimulationNodeDatum {
  id: string;
  group: string;  // Parent topic or self if top level
  value: number | undefined;
  children?: ForceNode[];
}

type ForceProps = {
  width: number;
  height: number;
  data: Tree;
  state: AppState;
  onCircleClick?: (topic: string) => void;
  onHover?: (topic: string | null) => void;
  colors: string[];
};

export const Force = ({
  width,
  height,
  data,
  state: s,
  onCircleClick,
  onHover,
  colors,
}: ForceProps): JSX.Element => {
  const [nodes, setNodes] = useState<ForceNode[]>([]);
  const [links, setLinks] = useState<d3.SimulationLinkDatum<ForceNode>[]>([]);

  // Create hierarchy for color consistency
  const fullHierarchy = d3.hierarchy(data).sum((d) => d.size).sort((a, b) => b.value! - a.value!);

  const firstLevelGroups = fullHierarchy?.children?.map((child) => child.data.topic);
  const colorScale = d3.scaleOrdinal<string>().domain(firstLevelGroups || []).range(colors);

  useEffect(() => {
    const displayData = s.filteredData || data;
    const hierarchy = d3.hierarchy(displayData);

    // Filter nodes based on depth
    const currentDepth = s.depth ?? 3;  // Default to 3 if undefined
    const filteredNodes = hierarchy.descendants().filter(d => d.depth <= currentDepth);
    const filteredLinks = hierarchy.links().filter(link => 
      filteredNodes.some(n => n.data.topic === link.source.data.topic) &&
      filteredNodes.some(n => n.data.topic === link.target.data.topic)
    );

    const nodeData: ForceNode[] = filteredNodes.map((d) => ({
      id: d.data.topic,
      // In filtered view, use the filtered parent's topic as the group
      group: s.filteredData ? s.filteredData.topic : (d.depth === 1 ? d.data.topic : (d.parent?.data.topic || d.data.topic)),
      value: d.value,
      x: undefined,
      y: undefined,
    }));

    const linkData = filteredLinks.map((d) => ({
      source: d.source.data.topic,
      target: d.target.data.topic,
    }));

    setNodes(nodeData);
    setLinks(linkData);

    const simulation = d3
      .forceSimulation<ForceNode>(nodeData)
      .force(
        'link',
        d3.forceLink<ForceNode, d3.SimulationLinkDatum<ForceNode>>(linkData)
          .id((d) => d.id)
          .distance(100)  // Set minimum distance between connected nodes
          .strength(0.5)  // Reduce link strength to allow nodes to spread out more
      )
      .force('charge', d3.forceManyBody<ForceNode>()
        .strength(d => {
          // Stronger repulsion for leaf nodes
          const isLeaf = !linkData.some(link => link.source === d.id);
          return isLeaf ? -1000 : -500;
        })
      )
      .force('center', d3.forceCenter(width / 2, height / 2))
      // Add collision force to prevent overlap
      .force('collision', d3.forceCollide<ForceNode>().radius(d => Math.sqrt(d.value || 10) * 20 + 10))
      .on('tick', () => {
        setNodes([...nodeData]);
      });

    return () => {
      simulation.stop();
    };
  }, [data, width, height, s.filteredData, s.depth]);

  return (
    <svg width={width} height={height}>
      {/* Draw lines from leaves to their roots and from roots to center */}
      {nodes.map((node) => {
        // Skip if it's a root node (group === id)
        if (node.group === node.id) return null;
        
        // Find the root node for this leaf
        const rootNode = nodes.find(n => n.id === node.group);
        if (!rootNode) return null;

        return (
          <g key={`lines-${node.id}`}>
            {/* Line from leaf to root */}
            <line
              x1={node.x}
              y1={node.y}
              x2={rootNode.x}
              y2={rootNode.y}
              stroke={colorScale(node.group)}
              strokeOpacity={0.3}
              strokeWidth={1}
            />
            {/* Line from root to center */}
            <line
              x1={rootNode.x}
              y1={rootNode.y}
              x2={width / 2}
              y2={height / 2}
              stroke={colorScale(node.group)}
              strokeOpacity={0.2}
              strokeWidth={1}
              strokeDasharray="4,4"
            />
          </g>
        );
      })}
      {links.map((link, i) => (
        <line
          key={i}
          x1={nodes.find((n) => n.id === link.source)?.x || 0}
          y1={nodes.find((n) => n.id === link.source)?.y || 0}
          x2={nodes.find((n) => n.id === link.target)?.x || 0}
          y2={nodes.find((n) => n.id === link.target)?.y || 0}
          stroke="#999"
          strokeOpacity={0.6}
        />
      ))}
      {nodes.map((node) => (
        <g key={node.id}>
          <circle
            cx={node.x}
            cy={node.y}
            r={Math.sqrt(node.value || 10) * (node.group === node.id ? 30 : 20)}
            fill={colorScale(node.group)}
            fillOpacity={0.2}
            stroke={colorScale(node.group)}
            strokeWidth={1}
            onMouseEnter={() => onHover?.(node.id)}
            onMouseLeave={() => onHover?.(null)}
          />
          <text
            x={node.x}
            y={node.y}
            textAnchor="middle"
            alignmentBaseline="middle"
            fontSize="14px"
          >
            {node.id}
          </text>
        </g>
      ))}
      {links.map((link, i) => {
        const sourceNode = nodes.find(n => n.id === link.source);
        const targetNode = nodes.find(n => n.id === link.target);
        if (!sourceNode || !targetNode) return null;
        
        return (
          <line
            key={i}
            x1={sourceNode.x}
            y1={sourceNode.y}
            x2={targetNode.x}
            y2={targetNode.y}
            stroke={colorScale(sourceNode.group)}
            strokeOpacity={0.3}
            strokeWidth={1}
          />
        );
      })}
    </svg>
  );
}; 