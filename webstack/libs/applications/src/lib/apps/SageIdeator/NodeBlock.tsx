/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import {
  Box,
  Text,
  HStack,
  VStack,
  Divider,
  Wrap,
  WrapItem,
  IconButton,
  Tooltip,
  Spinner,
  Image,
} from '@chakra-ui/react';
import { MdAltRoute, MdQuestionAnswer, MdImage } from 'react-icons/md';
import { BsStarFill, BsStar } from 'react-icons/bs';

import { state as AppState } from './index';
import { hexToRgba } from './colors';

type SageNode = AppState['nodes'][number];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface NodeBlockProps {
  node: SageNode;
  zoom: number;
  color: string;
  isHovered: boolean;
  appId: string;
  isAsking: boolean;
  isSelectedQA: boolean;
  onToggleFav: () => void;
  onFocus: () => void;
  onBranch: () => void;
  onSelectQA: () => void;
  onGenerateImage: () => void;
  isGeneratingImage: boolean;
}

// ─── Drag text helper ─────────────────────────────────────────────────────────

export function buildStickyText(node: SageNode): string {
  const lines: string[] = [`${node.Title}\n`];
  if (node.Summary) lines.push(node.Summary);
  if (node.Steps?.length) {
    lines.push('\nSteps:');
    node.Steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  }
  const attrs = [
    ...Object.entries(node.Dimension.categorical),
    ...Object.entries(node.Dimension.ordinal),
  ];
  if (attrs.length) {
    lines.push('\nAttributes:');
    attrs.forEach(([k, v]) => lines.push(`• ${k}: ${v}`));
  }
  return lines.join('\n');
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function AttrsBlock({ node }: { node: SageNode }) {
  const allAttrs = [
    ...Object.entries(node.Dimension.categorical),
    ...Object.entries(node.Dimension.ordinal),
  ];
  if (allAttrs.length === 0) return null;
  return (
    <>
      <Divider borderColor="rgba(0,0,0,0.25)" my={2} />
      <Text
        fontSize="8px"
        fontWeight="700"
        textTransform="uppercase"
        letterSpacing="0.08em"
        color="rgba(0,0,0,0.55)"
        mb={1.5}
      >
        Attributes
      </Text>
      <Wrap spacing={1}>
        {allAttrs.map(([k, v]) => (
          <WrapItem key={k}>
            <Box
              bg="rgba(0,0,0,0.12)"
              borderRadius="full"
              px={2}
              py="2px"
              display="inline-flex"
              alignItems="center"
              gap={1}
            >
              <Text fontSize="9px" fontWeight="700" color="black" lineHeight="1.4">{k}</Text>
              <Text fontSize="9px" color="rgba(0,0,0,0.45)" lineHeight="1.4">·</Text>
              <Text fontSize="9px" fontWeight="500" color="black" lineHeight="1.4">{v}</Text>
            </Box>
          </WrapItem>
        ))}
      </Wrap>
    </>
  );
}

// ─── NodeBlock ────────────────────────────────────────────────────────────────

export function NodeBlock({
  node, zoom, color, isHovered, appId, isAsking, isSelectedQA,
  onToggleFav, onFocus, onBranch, onSelectQA, onGenerateImage, isGeneratingImage,
}: NodeBlockProps) {
  const bg = hexToRgba(color, (isHovered || node.IsMyFav || isSelectedQA) ? 1 : 0.82);
  const ring = isSelectedQA
    ? '0 0 0 2.5px teal, 0 0 8px rgba(0,128,128,0.4)'
    : isHovered
      ? '0 0 0 2.5px rgba(0,0,0,0.75)'
      : node.IsMyFav
        ? '0 0 0 2px goldenrod, 0 0 6px rgba(218,165,32,0.5)'
        : 'none';

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.clearData();
    e.dataTransfer.setData('app', 'Stickie');
    e.dataTransfer.setData('app_state', JSON.stringify({
      text: buildStickyText(node),
      fontSize: 24,
      color: 'yellow',
      sources: [appId],
    }));
  };

  // ── Level 1: dot ──────────────────────────────────────────────────
  if (zoom < 1.5) {
    return (
      <Box
        w="12px" h="12px" borderRadius="50%"
        bg={bg} boxShadow={ring}
        cursor="pointer" title={node.Title} onClick={onFocus}
        draggable onDragStart={onDragStart}
      />
    );
  }

  // ── Level 2: title only ───────────────────────────────────────────
  if (zoom < 3) {
    return (
      <Box
        bg={bg} borderRadius="md" px={2} py={1.5} w="130px"
        boxShadow={ring || 'sm'} cursor="grab" onClick={onFocus}
        draggable onDragStart={onDragStart}
      >
        <Text fontSize="10px" fontWeight="700" color="black" lineHeight="1.3" noOfLines={3}>
          {node.Title}
        </Text>
      </Box>
    );
  }

  // ── Level 3: title + attributes ───────────────────────────────────
  if (zoom < 6) {
    return (
      <Box
        bg={bg} borderRadius="md" px={2} py={2} w="160px"
        boxShadow={ring || 'md'} cursor="default"
        draggable onDragStart={onDragStart}
      >
        <HStack justify="space-between" align="flex-start" mb={1.5}>
          <Text
            fontSize="11px" fontWeight="700" color="black" lineHeight="1.3" noOfLines={2}
            flex={1} cursor="grab" onClick={onFocus}
          >
            {node.Title}
          </Text>
          <Tooltip label="Branch from this idea" placement="top" hasArrow openDelay={300}>
            <IconButton
              aria-label="Branch" size="xs" variant="ghost" flexShrink={0}
              icon={<MdAltRoute />}
              onClick={(e) => { e.stopPropagation(); onBranch(); }}
              h="16px" minW="16px" color="black"
            />
          </Tooltip>
        </HStack>
        <AttrsBlock node={node} />
      </Box>
    );
  }

  // ── Level 4: title + summary + steps + attributes ─────────────────
  if (zoom < 10) {
    return (
      <Box
        bg={bg} borderRadius="md" px={2} py={2} w="220px"
        maxH="280px" overflowY="auto" boxShadow={ring || 'lg'} cursor="default"
      >
        <HStack justify="space-between" align="flex-start" mb={1.5}>
          <Text
            fontSize="11px" fontWeight="700" color="black" lineHeight="1.3" flex={1}
            cursor="grab" draggable onDragStart={onDragStart} onClick={onFocus}
          >
            {node.Title}
          </Text>
          <HStack spacing={0}>
            <Tooltip label="Branch from this idea" placement="top" hasArrow openDelay={300}>
              <IconButton
                aria-label="Branch" size="xs" variant="ghost" flexShrink={0}
                icon={<MdAltRoute />}
                onClick={(e) => { e.stopPropagation(); onBranch(); }}
                h="16px" minW="16px" color="black"
              />
            </Tooltip>
            <Tooltip label="Q&A" placement="top" hasArrow openDelay={300}>
              <IconButton
                aria-label="Q&A" size="xs" variant="ghost" flexShrink={0}
                icon={isAsking ? <Spinner size="xs" /> : <MdQuestionAnswer />}
                onClick={(e) => { e.stopPropagation(); onSelectQA(); }}
                h="16px" minW="16px" color={isSelectedQA ? 'teal.500' : 'black'}
              />
            </Tooltip>
            <Tooltip label={node.imageUrl ? 'Regenerate image' : 'Generate image'} placement="top" hasArrow openDelay={300}>
              <IconButton
                aria-label="Generate image" size="xs" variant="ghost" flexShrink={0}
                icon={isGeneratingImage ? <Spinner size="xs" /> : <MdImage />}
                onClick={(e) => { e.stopPropagation(); onGenerateImage(); }}
                h="16px" minW="16px" color={node.imageUrl ? 'blue.500' : 'black'}
                isDisabled={isGeneratingImage}
              />
            </Tooltip>
            <IconButton
              aria-label="Favourite" size="xs" variant="ghost" flexShrink={0}
              icon={node.IsMyFav ? <BsStarFill color="goldenrod" /> : <BsStar />}
              onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
              h="16px" minW="16px"
            />
          </HStack>
        </HStack>

        <Text
          fontSize="8px" fontWeight="700" textTransform="uppercase"
          letterSpacing="0.08em" color="rgba(0,0,0,0.55)" mb={0.5}
        >
          Summary
        </Text>
        <Text fontSize="10px" fontWeight="500" color="black" lineHeight="1.5" mb={2}>
          {node.Summary}
        </Text>

        {node.Steps && node.Steps.length > 0 && (
          <>
            <Text
              fontSize="8px" fontWeight="700" textTransform="uppercase"
              letterSpacing="0.08em" color="rgba(0,0,0,0.55)" mb={0.5}
            >
              Steps
            </Text>
            <VStack align="stretch" spacing={1} mb={2}>
              {node.Steps.map((step, i) => (
                <HStack key={i} align="flex-start" spacing={1}>
                  <Text fontSize="9px" fontWeight="700" color="black" lineHeight="1.4" flexShrink={0}>{i + 1}.</Text>
                  <Text fontSize="9px" fontWeight="500" color="black" lineHeight="1.4">{step}</Text>
                </HStack>
              ))}
            </VStack>
          </>
        )}

        <AttrsBlock node={node} />

        {node.imageUrl && (
          <Box mt={2} borderRadius="md" overflow="hidden">
            <Image src={node.imageUrl} alt={node.Title} w="100%" objectFit="cover" maxH="160px" />
          </Box>
        )}
      </Box>
    );
  }

  // ── Level 5: full prose + attributes ──────────────────────────────
  return (
    <Box
      bg={bg} borderRadius="md" px={3} py={3} w="270px"
      maxH="340px" overflowY="auto" boxShadow={ring || 'xl'} cursor="default"
    >
      <HStack justify="space-between" align="flex-start" mb={2}>
        <Text
          fontSize="13px" fontWeight="700" color="black" lineHeight="1.3" flex={1}
          cursor="grab" draggable onDragStart={onDragStart} onClick={onFocus}
        >
          {node.Title}
        </Text>
        <HStack spacing={0}>
          <Tooltip label="Branch from this idea" placement="top" hasArrow openDelay={300}>
            <IconButton
              aria-label="Branch" size="xs" variant="ghost" flexShrink={0}
              icon={<MdAltRoute />}
              onClick={(e) => { e.stopPropagation(); onBranch(); }}
              h="18px" minW="18px" color="black"
            />
          </Tooltip>
          <Tooltip label="Q&A" placement="top" hasArrow openDelay={300}>
            <IconButton
              aria-label="Q&A" size="xs" variant="ghost" flexShrink={0}
              icon={isAsking ? <Spinner size="xs" /> : <MdQuestionAnswer />}
              onClick={(e) => { e.stopPropagation(); onSelectQA(); }}
              h="18px" minW="18px" color={isSelectedQA ? 'teal.500' : 'black'}
            />
          </Tooltip>
          <Tooltip label={node.imageUrl ? 'Regenerate image' : 'Generate image'} placement="top" hasArrow openDelay={300}>
            <IconButton
              aria-label="Generate image" size="xs" variant="ghost" flexShrink={0}
              icon={isGeneratingImage ? <Spinner size="xs" /> : <MdImage />}
              onClick={(e) => { e.stopPropagation(); onGenerateImage(); }}
              h="18px" minW="18px" color={node.imageUrl ? 'blue.500' : 'black'}
              isDisabled={isGeneratingImage}
            />
          </Tooltip>
          <IconButton
            aria-label="Favourite" size="xs" variant="ghost" flexShrink={0}
            icon={node.IsMyFav ? <BsStarFill color="goldenrod" /> : <BsStar />}
            onClick={onToggleFav}
            h="18px" minW="18px"
          />
        </HStack>
      </HStack>

      {node.imageUrl && (
        <Box mb={3} borderRadius="md" overflow="hidden">
          <Image src={node.imageUrl} alt={node.Title} w="100%" objectFit="cover" maxH="200px" />
        </Box>
      )}

      <Text fontSize="11px" fontWeight="500" color="black" lineHeight="1.6" mb={3}>
        {node.Result}
      </Text>

      <AttrsBlock node={node} />
    </Box>
  );
}
