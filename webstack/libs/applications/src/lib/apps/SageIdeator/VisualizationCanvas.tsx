/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
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
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Textarea,
  Spinner,
  Tooltip,
  Badge,
  Center,
} from '@chakra-ui/react';

import { MdAdd, MdClose, MdCheck, MdSearch, MdAltRoute, MdEdit } from 'react-icons/md';
import { BsStarFill } from 'react-icons/bs';

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

// Describes how a click position maps to dimension values — single snap or weighted blend
export type DimBlend = {
  primary: string;
  secondary: string | null;
  primaryWeight: number; // 1.0 = pure snap, 0.5–0.85 = blend
};

type SimNode = SageNode & d3.SimulationNodeDatum;

// ─── Position → dimension blend ──────────────────────────────────────────────

function blendedDimValues(worldCoord: number, dim: SageDimension, size: number): DimBlend {
  const n = dim.values.length + 1;
  const targets = dim.values.map((val, idx) => {
    const effectiveIdx = dim.type === 'ordinal' ? dim.values.length - idx : idx;
    const target = effectiveIdx * (size / n) - size / 2 + 0.1 * size;
    return { val, dist: Math.abs(worldCoord - target) };
  });
  targets.sort((a, b) => a.dist - b.dist);

  const first = targets[0];
  const second = targets[1] ?? null;

  if (!second || first.dist + second.dist === 0) {
    return { primary: first.val, secondary: null, primaryWeight: 1 };
  }

  const totalDist = first.dist + second.dist;
  const primaryWeight = second.dist / totalDist; // closer to first → higher weight

  // Snap when overwhelmingly close to one value
  if (primaryWeight > 0.85) {
    return { primary: first.val, secondary: null, primaryWeight: 1 };
  }

  return { primary: first.val, secondary: second.val, primaryWeight };
}

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
  isGenerating: boolean;
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
  onBranchFavorites: () => void;
  onSummarizeFavorites: () => void;
  isSummarizing: boolean;
  onGenerateImage: (nodeId: string) => void;
  generatingImageNodeId: string | null;
  onReroll: (nodeId: string) => void;
  rerollingNodeId: string | null;
  onGenerateAt: (params: {
    worldX: number;
    worldY: number;
    xDimName: string | null;
    xBlend: DimBlend | null;
    yDimName: string | null;
    yBlend: DimBlend | null;
  }) => void;
  isGeneratingAt: boolean;
  onAddManualIdea: (text: string) => void;
  isAddingManualIdea: boolean;
}

// ─── Search scoring ───────────────────────────────────────────────────────────

function scoreNode(node: SageNode, query: string): number {
  if (!query.trim()) return 1;
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  let score = 0;
  for (const term of terms) {
    if (node.Title.toLowerCase().includes(term)) score += 3;
    if (node.Keywords.some((k) => k.toLowerCase().includes(term))) score += 2;
    if (node.Summary.toLowerCase().includes(term)) score += 1;
    if (node.Steps.some((s) => s.toLowerCase().includes(term))) score += 0.5;
    if (node.Result.toLowerCase().includes(term)) score += 0.5;
  }
  return score;
}

export function VisualizationCanvas({
  nodes,
  dimensions,
  appId,
  bgHex,
  panelBgHex,
  borderHex,
  textColor,
  status,
  statusMessage,
  isGenerating,
  askingNodeId,
  selectedQANodeId,
  qaPanelOpen,
  positionsRef,
  hasFitRef,
  onToggleFav,
  onBranch,
  onSelectQA,
  onAddDimension,
  onRemoveDimension,
  isAddingDimension,
  onBranchFavorites,
  onSummarizeFavorites,
  isSummarizing,
  onGenerateImage,
  generatingImageNodeId,
  onReroll,
  rerollingNodeId,
  onGenerateAt,
  isGeneratingAt,
  onAddManualIdea,
  isAddingManualIdea,
}: VisualizationCanvasProps) {
  const s = (px: number) => `${Math.round(px * 1.5)}px`;
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, z: 1 });
  const [xDimName, setXDimName] = useState<string | null>(null);
  const [yDimName, setYDimName] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const [showDimInput, setShowDimInput] = useState(false);
  const [dimInputValue, setDimInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<{ dimName: string; value: string } | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [generateAtMode, setGenerateAtMode] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualInput, setManualInput] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<SimNode, undefined> | null>(null);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, startCamX: 0, startCamY: 0 });
  const didDragRef = useRef(false);

  // Sync axis selectors only when the set of dimension names actually changes
  const dimKey = dimensions.map((d) => d.name).join(',');
  useEffect(() => {
    if (dimensions.length > 0) {
      const names = dimensions.map((d) => d.name);
      setXDimName((prev) => (prev && names.includes(prev) ? prev : (dimensions[0]?.name ?? null)));
      setYDimName((prev) => (prev && names.includes(prev) ? prev : (dimensions[1]?.name ?? null)));
    } else {
      setXDimName(null);
      setYDimName(null);
    }
  }, [dimKey]);

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
    didDragRef.current = false;
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
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      didDragRef.current = true;
    }
    setCamera((cam) => ({ ...cam, x: dragRef.current.startCamX + dx, y: dragRef.current.startCamY + dy }));
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    dragRef.current.active = false;
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (!generateAtMode || didDragRef.current) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      // Convert screen → world coordinates
      const worldX = (screenX - cx - camera.x) / camera.z;
      const worldY = (screenY - cy - camera.y) / camera.z;
      const xDim = dimensions.find((d) => d.name === xDimName) ?? null;
      const yDim = dimensions.find((d) => d.name === yDimName) ?? null;
      const xBlend = xDim ? blendedDimValues(worldX, xDim, containerSize.width * 0.8) : null;
      const yBlend = yDim ? blendedDimValues(worldY, yDim, containerSize.height * 0.8) : null;
      setGenerateAtMode(false);
      onGenerateAt({ worldX, worldY, xDimName, xBlend, yDimName, yBlend });
    },
    [generateAtMode, camera, dimensions, xDimName, yDimName, containerSize, onGenerateAt],
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setGenerateAtMode(false);
  }, []);

  const fitToScreen = useCallback(
    (maxZ = 3) => {
      if (positionsRef.current.size === 0 || containerSize.width === 0) return;
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
      const z = Math.min((containerSize.width - padding * 2) / boundsW, (containerSize.height - padding * 2) / boundsH, maxZ);
      const midX = (minX + maxX) / 2;
      const midY = (minY + maxY) / 2;
      setCamera({ x: -midX * z, y: -midY * z, z });
    },
    [containerSize, positionsRef],
  );

  useEffect(() => {
    if (searchQuery.trim()) fitToScreen(2.0);
  }, [searchQuery, fitToScreen]);

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
        fitToScreen();
      }
    });

    simulationRef.current = sim;
    return () => {
      sim.stop();
    };
  }, [nodes, dimensions, xDimName, yDimName, containerSize.width, containerSize.height, fitToScreen]);

  const xDim = dimensions.find((d) => d.name === xDimName) ?? null;
  const yDim = dimensions.find((d) => d.name === yDimName) ?? null;
  const cx = containerSize.width / 2;
  const cy = containerSize.height / 2;

  // Axis label positions
  const rawXLabels = xDim
    ? xDim.values.map((val) => {
        const matching = nodes.filter(
          (n) => (xDim.type === 'categorical' ? n.Dimension.categorical : n.Dimension.ordinal)[xDim.name] === val,
        );
        const avgX = matching.length ? matching.reduce((sum, n) => sum + (positionsRef.current.get(n.ID)?.x ?? 0), 0) / matching.length : 0;
        return { val, x: cx + avgX * camera.z + camera.x };
      })
    : [];

  const rawYLabels = yDim
    ? yDim.values.map((val) => {
        const matching = nodes.filter(
          (n) => (yDim.type === 'categorical' ? n.Dimension.categorical : n.Dimension.ordinal)[yDim.name] === val,
        );
        const avgY = matching.length ? matching.reduce((sum, n) => sum + (positionsRef.current.get(n.ID)?.y ?? 0), 0) / matching.length : 0;
        return { val, y: cy + avgY * camera.z + camera.y };
      })
    : [];

  const X_LABEL_W = 120;
  const Y_LABEL_H = 52;

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

      {/* Toolbar */}
      {nodes.length > 0 && (
        <VStack px={2} py={1} bg={panelBgHex} borderBottom="1px solid" borderColor={borderHex} spacing={1} align="stretch" flexShrink={0}>

          {/* Row 1: axis selectors */}
          <HStack spacing={2} pl="18px" flexWrap="wrap">
            {dimensions.length > 0 ? (
              <>
                <Text fontSize={s(11)} fontWeight="700" color={textColor} textTransform="uppercase" letterSpacing="0.06em" flexShrink={0}>Axes:</Text>
                <HStack spacing={1} flexShrink={0}>
                  <Text fontSize={s(12)} color={textColor} flexShrink={0}>X:</Text>
                  <Select size="sm" fontSize={s(12)} value={xDimName ?? ''} onChange={(e) => setXDimName(e.target.value || null)} minW="150px" w="auto" borderRadius="md">
                    <option value="">— none —</option>
                    {dimensions.map((d) => (
                      <option key={d.name} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </Select>
                </HStack>
                <HStack spacing={1} flexShrink={0}>
                  <Text fontSize={s(12)} color={textColor} flexShrink={0}>Y:</Text>
                  <Select size="sm" fontSize={s(12)} value={yDimName ?? ''} onChange={(e) => setYDimName(e.target.value || null)} minW="150px" w="auto" borderRadius="md">
                    <option value="">— none —</option>
                    {dimensions.map((d) => (
                      <option key={d.name} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </Select>
                </HStack>
              </>
            ) : (
              <Text fontSize={s(12)} color="gray.400" fontStyle="italic">No dimensions yet — add one below</Text>
            )}
          </HStack>

          {/* Row 2: dimension chips */}
          <HStack spacing={1} flexWrap="wrap" pl="18px">
            <Text fontSize={s(11)} fontWeight="700" color={textColor} textTransform="uppercase" letterSpacing="0.06em" flexShrink={0}>Dims:</Text>
            {dimensions.map((d) => (
              <Tooltip key={d.name} label={d.type === 'ordinal' ? 'Scale (ordered values)' : 'Category (named groups)'} placement="top" hasArrow openDelay={400}>
                <Badge colorScheme={d.type === 'ordinal' ? 'purple' : 'teal'} borderRadius="full" px={2} py="1px" display="inline-flex" alignItems="center" gap={1}>
                  <Text fontSize={s(11)}>{d.name}</Text>
                  <IconButton aria-label={`Remove ${d.name}`} icon={<MdClose />} size="xs" variant="ghost" h="12px" minW="12px" fontSize={s(11)} ml={0.5} onClick={() => onRemoveDimension(d.name)} />
                </Badge>
              </Tooltip>
            ))}
            {showDimInput ? (
              <HStack spacing={1}>
                <Input size="xs" placeholder="Dimension name…" value={dimInputValue} onChange={(e) => setDimInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && dimInputValue.trim().length >= 3) { onAddDimension(dimInputValue.trim()); setDimInputValue(''); setShowDimInput(false); }
                    if (e.key === 'Escape') { setDimInputValue(''); setShowDimInput(false); }
                  }}
                  w="130px" autoFocus isDisabled={isAddingDimension}
                />
                <Tooltip label="Confirm" hasArrow placement="top">
                  <IconButton aria-label="Confirm dimension" icon={isAddingDimension ? <Spinner size="xs" /> : <MdCheck />} size="xs" colorScheme="green" variant="ghost" h="20px" minW="20px" isDisabled={dimInputValue.trim().length < 3 || isAddingDimension} onClick={() => { onAddDimension(dimInputValue.trim()); setDimInputValue(''); setShowDimInput(false); }} />
                </Tooltip>
                <IconButton aria-label="Cancel" icon={<MdClose />} size="xs" variant="ghost" h="20px" minW="20px" onClick={() => { setDimInputValue(''); setShowDimInput(false); }} />
              </HStack>
            ) : (
              <Tooltip label="Add dimension" hasArrow placement="top" openDelay={300}>
                <Button size="xs" variant="ghost" colorScheme="gray" leftIcon={isAddingDimension ? <Spinner size="xs" /> : <MdAdd />} h="20px" px={2} fontSize={s(11)} isDisabled={isAddingDimension} onClick={() => setShowDimInput(true)}>
                  Add Dimension
                </Button>
              </Tooltip>
            )}
          </HStack>

          {/* Row 3: search + filter */}
          {(() => {
            const favCount = nodes.filter((n) => n.IsMyFav).length;
            return (
              <HStack spacing={2} pl="18px">
                <InputGroup size="xs" flex={1}>
                  <InputLeftElement pointerEvents="none" h="100%">
                    <MdSearch size={12} color="gray" />
                  </InputLeftElement>
                  <Input placeholder="Search nodes…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    bg="gray.100" _dark={{ bg: 'whiteAlpha.200', color: 'gray.100' }} _placeholder={{ opacity: 0.7, color: 'gray.400' }}
                    border="none" borderRadius="full" _focusVisible={{ outline: 'none', boxShadow: 'none' }} fontSize="xs"
                  />
                  {searchQuery && (
                    <InputRightElement h="100%">
                      <IconButton aria-label="Clear search" icon={<MdClose />} size="xs" variant="ghost" h="14px" minW="14px" onClick={() => setSearchQuery('')} />
                    </InputRightElement>
                  )}
                </InputGroup>
                <Tooltip label={favoritesOnly ? 'Show all nodes' : 'Show favorites only'} placement="top" hasArrow openDelay={300}>
                  <Button size="xs" variant={favoritesOnly ? 'solid' : 'ghost'} colorScheme={favoritesOnly ? 'yellow' : 'gray'} leftIcon={<BsStarFill />} h="18px" px={1.5} fontSize={s(11)} isDisabled={favCount === 0} onClick={() => setFavoritesOnly((v) => !v)} _disabled={{ opacity: 0.4, cursor: 'default' }} flexShrink={0}>{favCount}</Button>
                </Tooltip>
                {favCount > 0 && (
                  <Tooltip label={`Branch from ${favCount} favorite${favCount > 1 ? 's' : ''}`} placement="top" hasArrow openDelay={300}>
                    <Button size="xs" variant="ghost" colorScheme="orange" leftIcon={<MdAltRoute />} h="18px" px={1.5} fontSize={s(11)} onClick={onBranchFavorites} flexShrink={0}>Branch ★</Button>
                  </Tooltip>
                )}
                {favCount > 0 && (
                  <Tooltip label={`Summarize ${favCount} favorite${favCount > 1 ? 's' : ''} as a Stickie`} placement="top" hasArrow openDelay={300}>
                    <Button size="xs" variant="ghost" colorScheme="purple" leftIcon={isSummarizing ? <Spinner size="xs" /> : <BsStarFill />} h="18px" px={1.5} fontSize={s(11)} isDisabled={isSummarizing} onClick={onSummarizeFavorites} flexShrink={0}>Summarize ★</Button>
                  </Tooltip>
                )}
                {activeFilter && (
                  <HStack spacing={0} bg="blue.100" _dark={{ bg: 'blue.800' }} borderRadius="full" px={2} py="1px" flexShrink={0}>
                    <Text fontSize={s(11)} color={textColor} noOfLines={1} maxW="80px">{activeFilter.dimName}: {activeFilter.value}</Text>
                    <IconButton aria-label="Clear filter" icon={<MdClose />} size="xs" variant="ghost" h="14px" minW="14px" fontSize={s(11)} ml={0.5} onClick={() => setActiveFilter(null)} />
                  </HStack>
                )}
              </HStack>
            );
          })()}
        </VStack>
      )}

      {/* Canvas area */}
      <Box
        ref={containerRef}
        flex={1}
        position="relative"
        overflow="hidden"
        cursor={generateAtMode ? 'crosshair' : dragRef.current.active ? 'grabbing' : 'grab'}
        bg={bgHex}
        tabIndex={-1}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
        onKeyDown={handleKeyDown}
        outline="none"
      >
        {/* Idle / loading placeholder */}
        {status === 'idle' && nodes.length === 0 && (
          <Center h="100%">
            <Text color="gray.400" fontSize="sm">
              Enter a prompt to generate ideas
            </Text>
          </Center>
        )}
        {isGenerating && nodes.length === 0 && (
          <Center h="100%">
            <VStack spacing={3}>
              <Spinner size="xl" color="blue.400" />
              <Text color={textColor} fontSize="sm">
                {statusMessage}
              </Text>
            </VStack>
          </Center>
        )}

        {/* Y axis labels — click to filter */}
        {yAxisLabels.map(({ val, y }) => {
          const isActive = activeFilter?.dimName === yDimName && activeFilter?.value === val;
          return (
            <Box
              key={val}
              position="absolute"
              left="4px"
              top={`${y}px`}
              transform="translateY(-50%)"
              zIndex={10}
              cursor="pointer"
              onClick={(e) => {
                e.stopPropagation();
                setActiveFilter(isActive ? null : { dimName: yDimName!, value: val });
              }}
            >
              <Badge
                colorScheme="purple"
                fontSize={s(11)}
                px={1.5}
                maxW="140px"
                whiteSpace="normal"
                overflowWrap="normal"
                lineHeight="1.3"
                textAlign="center"
                opacity={isActive ? 1 : 0.7}
                boxShadow={isActive ? '0 0 0 2px var(--chakra-colors-purple-400)' : 'none'}
                _hover={{ opacity: 1 }}
              >
                {val}
              </Badge>
            </Box>
          );
        })}

        {/* X axis labels — click to filter */}
        {xAxisLabels.map(({ val, x }) => {
          const isActive = activeFilter?.dimName === xDimName && activeFilter?.value === val;
          return (
            <Box
              key={val}
              position="absolute"
              bottom="4px"
              left={`${x}px`}
              transform="translateX(-50%)"
              zIndex={10}
              cursor="pointer"
              onClick={(e) => {
                e.stopPropagation();
                setActiveFilter(isActive ? null : { dimName: xDimName!, value: val });
              }}
            >
              <Badge
                colorScheme="teal"
                fontSize={s(11)}
                px={1.5}
                maxW="140px"
                whiteSpace="normal"
                overflowWrap="normal"
                lineHeight="1.3"
                textAlign="center"
                opacity={isActive ? 1 : 0.7}
                boxShadow={isActive ? '0 0 0 2px var(--chakra-colors-teal-400)' : 'none'}
                _hover={{ opacity: 1 }}
              >
                {val}
              </Badge>
            </Box>
          );
        })}

        {/* Pan/zoom hint */}
        <Box position="absolute" top={2} left="50%" transform="translateX(-50%)" zIndex={10} pointerEvents="none">
          <Text fontSize={s(11)} color="gray.400" whiteSpace="nowrap">Scroll to zoom · drag to pan</Text>
        </Box>

        {/* Nodes canvas (pan/zoom layer) */}
        <Box position="absolute" top={0} left={0} w="100%" h="100%" style={{ willChange: 'transform' }}>
          {nodes.map((node) => {
            const pos = positionsRef.current.get(node.ID) ?? { x: 0, y: 0 };
            const screenX = cx + pos.x * camera.z + camera.x;
            const screenY = cy + pos.y * camera.z + camera.y;
            const color = nodeColorHex(node, xDim, yDim);
            const hovered = hoveredNodeId === node.ID;

            // Search + filter visibility
            const searchMatch = !searchQuery.trim() || scoreNode(node, searchQuery) > 0;
            const filterMatch =
              !activeFilter ||
              (() => {
                const dim = dimensions.find((d) => d.name === activeFilter.dimName);
                if (!dim) return true;
                const val = dim.type === 'categorical' ? node.Dimension.categorical[dim.name] : node.Dimension.ordinal[dim.name];
                return val === activeFilter.value;
              })();
            const nodeOpacity = searchMatch && filterMatch && (!favoritesOnly || node.IsMyFav) ? 1 : 0.1;

            return (
              <Box
                key={node.ID}
                position="absolute"
                style={{ left: screenX, top: screenY, transform: 'translate(-50%, -50%)' }}
                zIndex={hovered ? 15 : 5}
                opacity={nodeOpacity}
                transition="opacity 0.2s"
                onMouseEnter={() => setHoveredNodeId(node.ID)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  const p = positionsRef.current.get(node.ID);
                  if (!p) return;
                  const z = 7.5;
                  setCamera({ x: -p.x * z, y: -p.y * z, z });
                }}
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
                    if (p) setCamera((cam) => {
                      const targetZ = cam.z < 1.5 ? 3 : cam.z;
                      return { x: -p.x * targetZ, y: -p.y * targetZ, z: targetZ };
                    });
                  }}
                  onBranch={() => onBranch(node)}
                  onSelectQA={() => onSelectQA(node.ID)}
                  onGenerateImage={() => onGenerateImage(node.ID)}
                  isGeneratingImage={generatingImageNodeId === node.ID}
                  onReroll={() => onReroll(node.ID)}
                  isRerolling={rerollingNodeId === node.ID}
                />
              </Box>
            );
          })}
        </Box>

        {/* Controls overlay */}
        {nodes.length > 0 && (
          <Box position="absolute" top={2} left={0} right={0} zIndex={20} px={2} pointerEvents="none">
            <HStack justify="flex-end" align="flex-start">

              {/* Right: zoom controls + action buttons stacked below */}
              <VStack spacing={1} align="flex-end" pointerEvents="auto">
                <HStack spacing={1}>
                  <Tooltip label="Overview — fit all nodes" placement="left" hasArrow openDelay={300}>
                    <IconButton aria-label="Overview" h="26px" w="26px" minW="26px" fontSize={s(13)}
                      icon={<Box as="span" display="inline-flex" alignItems="center" justifyContent="center" lineHeight={1}>●</Box>}
                      variant={camera.z < 1.5 ? 'solid' : 'outline'} colorScheme={camera.z < 1.5 ? 'teal' : 'gray'}
                      onClick={() => fitToScreen(1.4)} />
                  </Tooltip>
                  <Tooltip label="Titles" placement="left" hasArrow openDelay={300}>
                    <IconButton aria-label="Titles" h="26px" w="26px" minW="26px" fontSize={s(13)}
                      icon={<Box as="span" display="inline-flex" alignItems="center" justifyContent="center" lineHeight={1}>T</Box>}
                      variant={camera.z >= 1.5 && camera.z < 3 ? 'solid' : 'outline'} colorScheme={camera.z >= 1.5 && camera.z < 3 ? 'teal' : 'gray'}
                      onClick={() => jumpToZoom(2.0)} />
                  </Tooltip>
                  <Tooltip label="Titles + attributes" placement="left" hasArrow openDelay={300}>
                    <IconButton aria-label="Titles + attributes" h="26px" w="26px" minW="26px" fontSize={s(13)}
                      icon={<Box as="span" display="inline-flex" alignItems="center" justifyContent="center" lineHeight={1}>A</Box>}
                      variant={camera.z >= 3 && camera.z < 6 ? 'solid' : 'outline'} colorScheme={camera.z >= 3 && camera.z < 6 ? 'teal' : 'gray'}
                      onClick={() => jumpToZoom(4.0)} />
                  </Tooltip>
                  <Tooltip label="Summary + steps" placement="left" hasArrow openDelay={300}>
                    <IconButton aria-label="Summary + steps" h="26px" w="26px" minW="26px" fontSize={s(13)}
                      icon={<Box as="span" display="inline-flex" alignItems="center" justifyContent="center" lineHeight={1}>S</Box>}
                      variant={camera.z >= 6 && camera.z < 10 ? 'solid' : 'outline'} colorScheme={camera.z >= 6 && camera.z < 10 ? 'teal' : 'gray'}
                      onClick={() => jumpToZoom(7.5)} />
                  </Tooltip>
                  <Tooltip label="Full text" placement="left" hasArrow openDelay={300}>
                    <IconButton aria-label="Full text" h="26px" w="26px" minW="26px" fontSize={s(13)}
                      icon={<Box as="span" display="inline-flex" alignItems="center" justifyContent="center" lineHeight={1}>≡</Box>}
                      variant={camera.z >= 10 ? 'solid' : 'outline'} colorScheme={camera.z >= 10 ? 'teal' : 'gray'}
                      onClick={() => jumpToZoom(11.0)} />
                  </Tooltip>
                </HStack>
                <HStack spacing={1}>
                  <Tooltip label={generateAtMode ? 'Cancel (Esc)' : 'Generate idea at position'} placement="left" hasArrow openDelay={300}>
                    <IconButton aria-label="Generate idea at position"
                      icon={isGeneratingAt ? <Spinner size="xs" /> : <MdAdd size={14} />}
                      h="26px" w="26px" minW="26px" fontSize={s(14)}
                      variant={generateAtMode ? 'solid' : 'outline'} colorScheme={generateAtMode ? 'blue' : 'gray'}
                      isDisabled={isGeneratingAt}
                      onClick={(e) => { e.stopPropagation(); setGenerateAtMode((v) => !v); setShowManualInput(false); }}
                    />
                  </Tooltip>
                  <Tooltip label="Add your own idea" placement="left" hasArrow openDelay={300}>
                    <IconButton aria-label="Add your own idea"
                      icon={isAddingManualIdea ? <Spinner size="xs" /> : <MdEdit size={13} />}
                      h="26px" w="26px" minW="26px"
                      variant={showManualInput ? 'solid' : 'outline'} colorScheme={showManualInput ? 'blue' : 'gray'}
                      isDisabled={isAddingManualIdea}
                      onClick={(e) => { e.stopPropagation(); setShowManualInput((v) => !v); setGenerateAtMode(false); }}
                    />
                  </Tooltip>
                </HStack>
              </VStack>

            </HStack>
              {/* Manual idea input — anchored to left side */}
              {showManualInput && (
                <Box
                  position="absolute" top="50px" left={2}
                  bg="white" _dark={{ bg: 'gray.700', borderColor: 'gray.600' }}
                  borderRadius="md" p={2} boxShadow="lg"
                  border="1px solid" borderColor="gray.200"
                  w="200px" zIndex={30} pointerEvents="auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Textarea
                    size="xs"
                    placeholder="Describe your idea…"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    rows={3}
                    fontSize={s(13)}
                    resize="none"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setShowManualInput(false);
                        setManualInput('');
                      }
                    }}
                    autoFocus
                  />
                  <HStack mt={1.5} justify="flex-end" spacing={1}>
                    <Button
                      size="xs"
                      variant="ghost"
                      colorScheme="gray"
                      h="18px"
                      px={2}
                      fontSize={s(12)}
                      onClick={() => {
                        setShowManualInput(false);
                        setManualInput('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="xs"
                      colorScheme="blue"
                      h="18px"
                      px={2}
                      fontSize={s(12)}
                      isDisabled={!manualInput.trim() || isAddingManualIdea}
                      onClick={() => {
                        if (!manualInput.trim()) return;
                        onAddManualIdea(manualInput.trim());
                        setManualInput('');
                        setShowManualInput(false);
                      }}
                    >
                      Add
                    </Button>
                  </HStack>
                </Box>
              )}
          </Box>
        )}

        {/* Generating-at indicator */}
        {isGeneratingAt && (
          <Box
            position="absolute"
            bottom={8}
            left="50%"
            transform="translateX(-50%)"
            zIndex={25}
            bg="blackAlpha.700"
            borderRadius="md"
            px={3}
            py={1}
            pointerEvents="none"
          >
            <HStack spacing={2}>
              <Spinner size="xs" color="white" />
              <Text fontSize="xs" color="white">
                Generating idea…
              </Text>
            </HStack>
          </Box>
        )}

        {/* Generate-at mode hint */}
        {generateAtMode && !isGeneratingAt && (
          <Box
            position="absolute"
            bottom={8}
            left="50%"
            transform="translateX(-50%)"
            zIndex={25}
            bg="blue.600"
            borderRadius="md"
            px={3}
            py={1}
            pointerEvents="none"
          >
            <Text fontSize="xs" color="white">
              Click anywhere to generate an idea at that position · Esc to cancel
            </Text>
          </Box>
        )}
      </Box>
    </Flex>
  );
}
