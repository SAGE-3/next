/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useRef, useState, useEffect, useReducer, useCallback, MutableRefObject } from 'react';
import * as d3 from 'd3';
import {
  Box,
  Flex,
  Text,
  HStack,
  VStack,
  Select,
  Button,
  IconButton,
  Input,
  Spinner,
  Tooltip,
  Badge,
  Center,
} from '@chakra-ui/react';

import { MdAdd, MdClose, MdCheck } from 'react-icons/md';

import { state as AppState } from './index';
import { NodeBlock } from './NodeBlock';
import { nodeColorHex, dimensionClusterTarget } from './colors';

type SageNode = AppState['nodes'][number];
type SageDimension = AppState['dimensions'][number];

export interface Camera {
  x: number;
  y: number;
  z: number;
}

type SimNode = SageNode & d3.SimulationNodeDatum;

interface VisualizationCanvasProps {
  nodes: SageNode[];
  dimensions: SageDimension[];
  appId: string;
  bgHex: string;
  panelBgHex: string;
  borderHex: string;
  textColor: string;
  status: AppState['status'];
  statusMessage: string;
  askingNodeId: string | null;
  selectedQANodeId: string | null;
  qaPanelOpen: boolean;
  positionsRef: MutableRefObject<Map<string, { x: number; y: number }>>;
  hasFitRef: MutableRefObject<boolean>;
  onToggleFav: (nodeId: string) => void;
  onBranch: (node: SageNode) => void;
  onSelectQA: (nodeId: string) => void;
  onAddDimension: (name: string) => void;
  onRemoveDimension: (name: string) => void;
  isAddingDimension: boolean;
}

export function VisualizationCanvas({
  nodes, dimensions, appId, bgHex, panelBgHex, borderHex, textColor,
  status, statusMessage, askingNodeId, selectedQANodeId, qaPanelOpen,
  positionsRef, hasFitRef,
  onToggleFav, onBranch, onSelectQA,
  onAddDimension, onRemoveDimension, isAddingDimension,
}: VisualizationCanvasProps) {
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, z: 1 });
  const [xDimName, setXDimName] = useState<string | null>(null);
  const [yDimName, setYDimName] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const [showDimInput, setShowDimInput] = useState(false);
  const [dimInputValue, setDimInputValue] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<SimNode, undefined> | null>(null);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, startCamX: 0, startCamY: 0 });

  const isGenerating = status === 'generating_dimensions' || status === 'generating_responses';

  // Sync axis selectors when dimensions arrive
  useEffect(() => {
    if (dimensions.length > 0) {
      setXDimName((prev) => prev ?? dimensions[0]?.name ?? null);
      setYDimName((prev) => prev ?? dimensions[1]?.name ?? null);
    }
  }, [dimensions]);

  // Measure container size
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Pan/zoom handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setCamera((cam) => {
      const newZ = Math.max(0.1, Math.min(14, cam.z * factor));
      const scale = newZ / cam.z;
      return {
        x: (mouseX - cx) * (1 - scale) + cam.x * scale,
        y: (mouseY - cy) * (1 - scale) + cam.y * scale,
        z: newZ,
      };
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setCamera((cam) => {
      dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, startCamX: cam.x, startCamY: cam.y };
      return cam;
    });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current.active) return;
    e.stopPropagation();
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setCamera((cam) => ({ ...cam, x: dragRef.current.startCamX + dx, y: dragRef.current.startCamY + dy }));
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    dragRef.current.active = false;
  }, []);

  const jumpToZoom = useCallback((targetZ: number) => {
    setCamera((cam) => {
      const scale = targetZ / cam.z;
      return { x: cam.x * scale, y: cam.y * scale, z: targetZ };
    });
  }, []);

  // D3 force simulation
  useEffect(() => {
    simulationRef.current?.stop();
    if (nodes.length === 0 || containerSize.width === 0) return;

    const xDim = dimensions.find((d) => d.name === xDimName) ?? null;
    const yDim = dimensions.find((d) => d.name === yDimName) ?? null;

    const simNodes: SimNode[] = nodes.map((n) => {
      const prev = positionsRef.current.get(n.ID);
      return { ...n, x: prev?.x ?? (Math.random() - 0.5) * 100, y: prev?.y ?? (Math.random() - 0.5) * 100 };
    });

    const sim = d3
      .forceSimulation<SimNode>(simNodes)
      .force('charge', d3.forceManyBody<SimNode>().strength(-150))
      .force('collide', d3.forceCollide<SimNode>().radius(22))
      .force('cx', d3.forceX<SimNode>(0).strength(0.04))
      .force('cy', d3.forceY<SimNode>(0).strength(0.04))
      .force('cluster', (alpha: number) => {
        simNodes.forEach((node) => {
          const tx = dimensionClusterTarget('x', xDim, node, containerSize.width * 0.8);
          const ty = dimensionClusterTarget('y', yDim, node, containerSize.height * 0.8);
          if (node.vx !== undefined && node.vy !== undefined) {
            node.vx += (tx - (node.x ?? 0)) * alpha * 0.12;
            node.vy += (ty - (node.y ?? 0)) * alpha * 0.12;
          }
        });
      })
      .alpha(1)
      .restart();

    sim.on('tick', () => {
      simNodes.forEach((n) => positionsRef.current.set(n.ID, { x: n.x ?? 0, y: n.y ?? 0 }));
      forceUpdate();

      // Auto-fit once when simulation has settled
      if (!hasFitRef.current && sim.alpha() < 0.05 && containerSize.width > 0 && positionsRef.current.size > 0) {
        hasFitRef.current = true;
        const positions = Array.from(positionsRef.current.values());
        const xs = positions.map((p) => p.x);
        const ys = positions.map((p) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const boundsW = maxX - minX + 200;
        const boundsH = maxY - minY + 120;
        const padding = 60;
        const z = Math.min(
          (containerSize.width - padding * 2) / boundsW,
          (containerSize.height - padding * 2) / boundsH,
          3
        );
        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;
        setCamera({ x: -midX * z, y: -midY * z, z });
      }
    });

    simulationRef.current = sim;
    return () => { sim.stop(); };
  }, [nodes, dimensions, xDimName, yDimName, containerSize.width, containerSize.height]);

  const xDim = dimensions.find((d) => d.name === xDimName) ?? null;
  const yDim = dimensions.find((d) => d.name === yDimName) ?? null;
  const cx = containerSize.width / 2;
  const cy = containerSize.height / 2;

  // Axis label positions
  const rawXLabels = xDim
    ? xDim.values.map((val) => {
        const matching = nodes.filter(
          (n) => (xDim.type === 'categorical' ? n.Dimension.categorical : n.Dimension.ordinal)[xDim.name] === val
        );
        const avgX = matching.length
          ? matching.reduce((sum, n) => sum + (positionsRef.current.get(n.ID)?.x ?? 0), 0) / matching.length
          : 0;
        return { val, x: cx + avgX * camera.z + camera.x };
      })
    : [];

  const rawYLabels = yDim
    ? yDim.values.map((val) => {
        const matching = nodes.filter(
          (n) => (yDim.type === 'categorical' ? n.Dimension.categorical : n.Dimension.ordinal)[yDim.name] === val
        );
        const avgY = matching.length
          ? matching.reduce((sum, n) => sum + (positionsRef.current.get(n.ID)?.y ?? 0), 0) / matching.length
          : 0;
        return { val, y: cy + avgY * camera.z + camera.y };
      })
    : [];

  const X_LABEL_W = 70;
  const Y_LABEL_H = 20;

  const xAxisLabels = [...rawXLabels]
    .sort((a, b) => a.x - b.x)
    .reduce<{ val: string; x: number }[]>((acc, label) => {
      const prev = acc.at(-1);
      const x = prev ? Math.max(label.x, prev.x + X_LABEL_W) : label.x;
      acc.push({ val: label.val, x });
      return acc;
    }, []);

  const yAxisLabels = [...rawYLabels]
    .sort((a, b) => a.y - b.y)
    .reduce<{ val: string; y: number }[]>((acc, label) => {
      const prev = acc.at(-1);
      const y = prev ? Math.max(label.y, prev.y + Y_LABEL_H) : label.y;
      acc.push({ val: label.val, y });
      return acc;
    }, []);

  return (
    <Flex direction="column" flex={1} overflow="hidden">
      {/* Axis toolbar */}
      {dimensions.length > 0 && (
        <VStack
          px={2} py={1}
          bg={panelBgHex}
          borderBottom="1px solid"
          borderColor={borderHex}
          spacing={1}
          align="stretch"
          flexShrink={0}
        >
          {/* Row 1: axis selectors */}
          <HStack spacing={3}>
            <Text fontSize="xs" color={textColor} fontWeight="bold">Axes:</Text>
            <HStack spacing={1}>
              <Text fontSize="xs" color={textColor}>X:</Text>
              <Select size="xs" value={xDimName ?? ''} onChange={(e) => setXDimName(e.target.value || null)} w="120px">
                <option value="">— none —</option>
                {dimensions.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
              </Select>
            </HStack>
            <HStack spacing={1}>
              <Text fontSize="xs" color={textColor}>Y:</Text>
              <Select size="xs" value={yDimName ?? ''} onChange={(e) => setYDimName(e.target.value || null)} w="120px">
                <option value="">— none —</option>
                {dimensions.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
              </Select>
            </HStack>
            <Text fontSize="9px" color="gray.400">Scroll to zoom · drag to pan</Text>
          </HStack>

          {/* Row 2: dimension chips + add */}
          <HStack spacing={1} flexWrap="wrap">
            <Text fontSize="9px" fontWeight="700" color={textColor} textTransform="uppercase" letterSpacing="0.06em" flexShrink={0}>
              Dims:
            </Text>
            {dimensions.map((d) => (
              <HStack
                key={d.name}
                spacing={0}
                bg={d.type === 'ordinal' ? 'purple.100' : 'teal.100'}
                _dark={{ bg: d.type === 'ordinal' ? 'purple.800' : 'teal.800' }}
                borderRadius="full"
                px={2}
                py="1px"
              >
                <Text fontSize="9px" color={textColor}>{d.name}</Text>
                <IconButton
                  aria-label={`Remove ${d.name}`}
                  icon={<MdClose />}
                  size="xs"
                  variant="ghost"
                  h="14px"
                  minW="14px"
                  fontSize="9px"
                  ml={0.5}
                  onClick={() => onRemoveDimension(d.name)}
                />
              </HStack>
            ))}

            {/* Add dimension input */}
            {showDimInput ? (
              <HStack spacing={1}>
                <Input
                  size="xs"
                  placeholder="Dimension name…"
                  value={dimInputValue}
                  onChange={(e) => setDimInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && dimInputValue.trim().length >= 3) {
                      onAddDimension(dimInputValue.trim());
                      setDimInputValue('');
                      setShowDimInput(false);
                    }
                    if (e.key === 'Escape') {
                      setDimInputValue('');
                      setShowDimInput(false);
                    }
                  }}
                  w="130px"
                  autoFocus
                  isDisabled={isAddingDimension}
                />
                <Tooltip label="Confirm" hasArrow placement="top">
                  <IconButton
                    aria-label="Confirm dimension"
                    icon={isAddingDimension ? <Spinner size="xs" /> : <MdCheck />}
                    size="xs"
                    colorScheme="green"
                    variant="ghost"
                    h="20px" minW="20px"
                    isDisabled={dimInputValue.trim().length < 3 || isAddingDimension}
                    onClick={() => {
                      onAddDimension(dimInputValue.trim());
                      setDimInputValue('');
                      setShowDimInput(false);
                    }}
                  />
                </Tooltip>
                <IconButton
                  aria-label="Cancel"
                  icon={<MdClose />}
                  size="xs"
                  variant="ghost"
                  h="20px" minW="20px"
                  onClick={() => { setDimInputValue(''); setShowDimInput(false); }}
                />
              </HStack>
            ) : (
              <Tooltip label="Add dimension" hasArrow placement="top" openDelay={300}>
                <IconButton
                  aria-label="Add dimension"
                  icon={isAddingDimension ? <Spinner size="xs" /> : <MdAdd />}
                  size="xs"
                  variant="ghost"
                  h="20px" minW="20px"
                  isDisabled={isAddingDimension}
                  onClick={() => setShowDimInput(true)}
                />
              </Tooltip>
            )}
          </HStack>
        </VStack>
      )}

      {/* Canvas area */}
      <Box
        ref={containerRef}
        flex={1}
        position="relative"
        overflow="hidden"
        cursor={dragRef.current.active ? 'grabbing' : 'grab'}
        bg={bgHex}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Idle / loading placeholder */}
        {status === 'idle' && nodes.length === 0 && (
          <Center h="100%">
            <Text color="gray.400" fontSize="sm">Enter a prompt to generate ideas</Text>
          </Center>
        )}
        {isGenerating && nodes.length === 0 && (
          <Center h="100%">
            <VStack spacing={3}>
              <Spinner size="xl" color="blue.400" />
              <Text color={textColor} fontSize="sm">{statusMessage}</Text>
            </VStack>
          </Center>
        )}

        {/* Y axis labels */}
        {yAxisLabels.map(({ val, y }) => (
          <Box
            key={val}
            position="absolute"
            left="4px"
            top={`${y}px`}
            transform="translateY(-50%)"
            pointerEvents="none"
            zIndex={10}
          >
            <Badge colorScheme="purple" fontSize="9px" px={1.5} whiteSpace="nowrap">{val}</Badge>
          </Box>
        ))}

        {/* X axis labels */}
        {xAxisLabels.map(({ val, x }) => (
          <Box
            key={val}
            position="absolute"
            bottom="4px"
            left={`${x}px`}
            transform="translateX(-50%)"
            pointerEvents="none"
            zIndex={10}
          >
            <Badge colorScheme="teal" fontSize="9px" px={1.5} whiteSpace="nowrap">{val}</Badge>
          </Box>
        ))}

        {/* Nodes canvas (pan/zoom layer) */}
        <Box position="absolute" top={0} left={0} w="100%" h="100%" style={{ willChange: 'transform' }}>
          {nodes.map((node) => {
            const pos = positionsRef.current.get(node.ID) ?? { x: 0, y: 0 };
            const screenX = cx + pos.x * camera.z + camera.x;
            const screenY = cy + pos.y * camera.z + camera.y;
            const color = nodeColorHex(node, xDim, yDim);
            const hovered = hoveredNodeId === node.ID;

            return (
              <Box
                key={node.ID}
                position="absolute"
                style={{ left: screenX, top: screenY, transform: 'translate(-50%, -50%)' }}
                zIndex={hovered ? 15 : 5}
                onMouseEnter={() => setHoveredNodeId(node.ID)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <NodeBlock
                  node={node}
                  zoom={camera.z}
                  color={color}
                  isHovered={hovered}
                  appId={appId}
                  isAsking={askingNodeId === node.ID}
                  isSelectedQA={qaPanelOpen && selectedQANodeId === node.ID}
                  onToggleFav={() => onToggleFav(node.ID)}
                  onFocus={() => {
                    const p = positionsRef.current.get(node.ID);
                    if (p) setCamera((cam) => ({ ...cam, x: -p.x * cam.z, y: -p.y * cam.z }));
                  }}
                  onBranch={() => onBranch(node)}
                  onSelectQA={() => onSelectQA(node.ID)}
                />
              </Box>
            );
          })}
        </Box>

        {/* Semantic zoom controls */}
        {nodes.length > 0 && (
          <Box position="absolute" top={2} right={2} zIndex={20}>
            <VStack spacing={1} align="flex-end">
              <Badge fontSize="9px" colorScheme="gray" pointerEvents="none">{camera.z.toFixed(1)}×</Badge>
              <HStack spacing={1}>
                <Tooltip label="Overview — dots" placement="left" hasArrow openDelay={300}>
                  <Button size="xs" variant={camera.z < 1.5 ? 'solid' : 'outline'} colorScheme="gray"
                    onClick={() => jumpToZoom(0.8)} h="18px" minW="18px" px={1} fontSize="9px">●</Button>
                </Tooltip>
                <Tooltip label="Titles" placement="left" hasArrow openDelay={300}>
                  <Button size="xs" variant={camera.z >= 1.5 && camera.z < 3 ? 'solid' : 'outline'} colorScheme="gray"
                    onClick={() => jumpToZoom(2.0)} h="18px" minW="18px" px={1} fontSize="9px">T</Button>
                </Tooltip>
                <Tooltip label="Titles + attributes" placement="left" hasArrow openDelay={300}>
                  <Button size="xs" variant={camera.z >= 3 && camera.z < 6 ? 'solid' : 'outline'} colorScheme="gray"
                    onClick={() => jumpToZoom(4.0)} h="18px" minW="18px" px={1} fontSize="9px">A</Button>
                </Tooltip>
                <Tooltip label="Summary + steps" placement="left" hasArrow openDelay={300}>
                  <Button size="xs" variant={camera.z >= 6 && camera.z < 10 ? 'solid' : 'outline'} colorScheme="gray"
                    onClick={() => jumpToZoom(7.5)} h="18px" minW="18px" px={1} fontSize="9px">S</Button>
                </Tooltip>
                <Tooltip label="Full text" placement="left" hasArrow openDelay={300}>
                  <Button size="xs" variant={camera.z >= 10 ? 'solid' : 'outline'} colorScheme="gray"
                    onClick={() => jumpToZoom(11.0)} h="18px" minW="18px" px={1} fontSize="9px">≡</Button>
                </Tooltip>
              </HStack>
            </VStack>
          </Box>
        )}
      </Box>
    </Flex>
  );
}
