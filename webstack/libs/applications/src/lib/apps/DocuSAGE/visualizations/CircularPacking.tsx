import React, { useEffect, useState } from 'react';
import * as d3 from 'd3';
import { Tree } from '../data';
import { AppState } from '../DocuSAGE';

type CircularPackingProps = {
  width: number;
  height: number;
  data: Tree;
  state: AppState;
  onCircleClick?: (topic: string) => void;
  onHover?: (topic: string | null) => void;
  colors: string[];
};

export const CircularPacking = ({
  width,
  height,
  data,
  state: s,
  onCircleClick,
  onHover,
  colors,
}: CircularPackingProps): JSX.Element => {
  const [nodes, setNodes] = useState<d3.HierarchyPointNode<Tree>[]>([]);

  useEffect(() => {
    const displayData = s.filteredData || data;
    const hierarchy = d3.hierarchy(displayData)
      .sum((d) => d.children?.length ? 0 : d.size)  // Only use size for leaf nodes
      .sort((a, b) => b.value! - a.value!);

    // Filter nodes based on depth
    const currentDepth = s.depth ?? 3;  // Default to 3 if undefined
    
    // Create a new hierarchy with filtered nodes
    const filteredHierarchy = hierarchy
      .descendants()
      .filter(d => d.depth <= currentDepth)
      .reduce((acc: d3.HierarchyNode<Tree> | null, node) => {
        if (node.depth === 0) return node;
        if (node.depth === 1) {
          // For level 1 nodes, only include their children up to currentDepth
          node.children = node.children?.filter(child => child.depth <= currentDepth);
          return node;
        }
        return node;
      }, null);

    if (!filteredHierarchy) return;

    const pack = d3.pack<Tree>()
      .size([width, height])
      .padding(3);

    const root = pack(filteredHierarchy);

    setNodes(root.descendants());
  }, [data, width, height, s.filteredData, s.depth]);

  // Create hierarchy for the full data to maintain color consistency
  const fullHierarchy = d3
    .hierarchy(data)
    .sum((d) => d.children?.length ? 0 : d.size)  // Only use size for leaf nodes
    .sort((a, b) => b.value! - a.value!);

  const packGenerator = d3.pack<Tree>().size([width, height]).padding(4);

  const displayData = s.filteredData || data;
  const hierarchy = d3.hierarchy(displayData)
    .sum((d) => d.children?.length ? 0 : d.size)  // Only use size for leaf nodes
    .sort((a, b) => b.value! - a.value!);
  const root = packGenerator(hierarchy);

  // List of item of level 1 (just under root) & related color scale
  const firstLevelGroups = fullHierarchy?.children?.map((child) => child.data.topic);
  const colorScale = d3.scaleOrdinal<string>().domain(firstLevelGroups || []).range(colors);

  // Circles for level 1 of the hierarchy
  const allLevel1Circles = root
    .descendants()
    .filter((node) => node.depth === 1)
    .map((node) => {
      const parentName = node.parent?.data.topic;
      if (!parentName) return null;
      const isFilteredView = s.filteredData;
      // For filtered view, find the node in the full hierarchy to get its original parent
      const topLevelTopic = getTopLevelParentTopic(node.data.topic);
      const nodeColor = colorScale(topLevelTopic ?? parentName);

      return (
        <g key={node.data.topic}>
          <circle
            cx={node.x}
            cy={node.y}
            r={node.r}
            stroke={nodeColor}
            strokeWidth={2}
            strokeOpacity={0.4}
            fill={nodeColor}
            fillOpacity={0.5}
            style={{ cursor: isFilteredView ? 'default' : 'pointer' }}
            onClick={isFilteredView ? undefined : () => onCircleClick?.(node.data.topic)}
            onMouseEnter={!isFilteredView ? () => onHover?.(node.data.topic) : undefined}
            onMouseLeave={!isFilteredView ? () => onHover?.(null) : undefined}
          />
          {/* Only show text if this is the deepest level */}
          {s.depth === 1 && (
            <>
              {(() => {
                const text = node.data.topic;
                const words = text.split(' ');
                const lines: string[] = [];
                let currentLine = words[0];

                // Calculate font size based on circle radius with dynamic scaling
                const minFontSize = Math.min(width, height) * 0.01; // Minimum size for small circles
                const maxFontSize = Math.min(width, height) * 0.09; // Maximum size for large circles
                const fontSize = Math.min(
                  Math.max(node.r * 0.25, minFontSize), // Scale with radius but don't go below minimum
                  maxFontSize // Don't exceed maximum
                );

                // Split text into multiple lines if it's too long
                for (let i = 1; i < words.length; i++) {
                  const testLine = currentLine + ' ' + words[i];
                  if (testLine.length * fontSize * 0.6 < node.r * 1.1) {
                    currentLine = testLine;
                  } else {
                    lines.push(currentLine);
                    currentLine = words[i];
                  }
                }
                lines.push(currentLine);

                return lines.map((line, i) => (
                  <text
                    key={i}
                    x={node.x}
                    y={node.y - (lines.length - 1) * fontSize * 0.4 + i * fontSize}
                    fontSize={`${fontSize}px`}
                    fontWeight="normal"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    fill="black"
                    style={{ pointerEvents: 'none' }}
                  >
                    {line}
                  </text>
                ));
              })()}
            </>
          )}
        </g>
      );
    });

  // Circles for deeper levels
  const allLeafCircles = root
    .descendants()
    .filter((node) => node.depth > 1 && node.depth <= (s.depth ?? 3))
    .map((node) => {
      const parentName = node.parent?.data.topic;
      if (!parentName) return null;

      // Calculate font size based on circle radius with dynamic scaling
      const minFontSize = Math.min(width, height) * 0.01; // Minimum size for small circles
      const maxFontSize = Math.min(width, height) * 0.02; // Maximum size for large circles
      const fontSize = Math.min(
        Math.max(node.r * 0.25, minFontSize), // Scale with radius but don't go below minimum
        maxFontSize // Don't exceed maximum
      );
      
      const text = node.data.topic;
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = words[0];

      // Split text into multiple lines if it's too long
      for (let i = 1; i < words.length; i++) {
        const testLine = currentLine + ' ' + words[i];
        if (testLine.length * fontSize * 0.6 < node.r * 1.1) {
          currentLine = testLine;
        } else {
          lines.push(currentLine);
          currentLine = words[i];
        }
      }
      lines.push(currentLine);

      
      // Find the top-level parent to get its color
      const topLevelTopic = getTopLevelParentTopic(node.data.topic);
      const nodeColor = colorScale(topLevelTopic ?? parentName);
      const isFilteredView = s.filteredData;

      return (
        <g key={node.data.topic}>
          <circle
            key={node.data.topic}
            cx={node.x}
            cy={node.y}
            r={node.r}
            stroke={nodeColor}
            strokeWidth={isFilteredView ? 2 : 1}
            strokeOpacity={0.2}
            fill={nodeColor}
            fillOpacity={0.5}
            style={{ cursor: !node.children ? 'default' : 'pointer' }}
            onClick={!node.children ? undefined : () => onCircleClick?.(node.data.topic)}
            onMouseEnter={!node.children ? undefined : () => onHover?.(node.data.topic)}
            onMouseLeave={!node.children ? undefined : () => onHover?.(null)}
          />
          {/* Only show text if this is the deepest level */}
          {node.depth === (s.depth ?? 3) && (
            <>
              {lines.map((line, i) => (
                <text
                  key={i}
                  x={node.x}
                  y={node.y - (lines.length - 1) * fontSize * 0.4 + i * fontSize}
                  fontSize={`${fontSize}px`}
                  fontWeight="normal"
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  fill="black"
                  style={{ pointerEvents: 'none' }}
                >
                  {line}
                </text>
              ))}
            </>
          )}
        </g>
      );
    });

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
  // If this is a filtered view, add the parent circle from the full hierarchy
  const parentCircle = s.filteredData
    ? fullHierarchy.descendants().find((node) => node.data.topic === s.selectedTopic)
    : null;

  return (
    <svg width={width} height={height} style={{ display: "inline-block" }}>
      {/* Add white circle for top-level node in main view */}
      {!s.filteredData && root && (
        <circle
          cx={root.x}
          cy={root.y}
          r={root.r}
          fill="black"
          fillOpacity={0.05}
          stroke="#000000"
          strokeWidth={2}
          strokeOpacity={0.4}
        />
      )}
      {s.filteredData && parentCircle && (
        <g>
          <circle
            cx={width / 2}
            cy={height / 2}
            r={Math.min(width, height) / 2}
            stroke={colorScale(getTopLevelParentTopic(parentCircle.data.topic) ?? parentCircle.data.topic)}
            strokeWidth={1}
            strokeOpacity={0.4}
            fill={colorScale(getTopLevelParentTopic(parentCircle.data.topic) ?? parentCircle.data.topic)}
            fillOpacity={0.5}
          />
        </g>
      )}
      {allLevel1Circles}
      {allLeafCircles}
    </svg>
  );
}; 