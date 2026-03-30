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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from '@chakra-ui/react';
import { MdAltRoute, MdQuestionAnswer, MdImage, MdRefresh } from 'react-icons/md';
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
  onReroll: () => void;
  isRerolling: boolean;
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

// ─── Image lightbox ───────────────────────────────────────────────────────────

function ImageLightbox({ src, alt, previewMaxH }: { src: string; alt: string; previewMaxH: string }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  return (
    <>
      <Image
        src={src} alt={alt} w="100%" objectFit="cover" maxH={previewMaxH}
        cursor="zoom-in" borderRadius="md"
        onClick={(e) => { e.stopPropagation(); onOpen(); }}
      />
      <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent bg="black" maxW="90vw" maxH="90vh">
          <ModalCloseButton color="white" zIndex={10} />
          <ModalBody p={0} display="flex" alignItems="center" justifyContent="center">
            <Image src={src} alt={alt} maxW="100%" maxH="90vh" objectFit="contain" borderRadius="md" />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}

// ─── NodeBlock ────────────────────────────────────────────────────────────────

export function NodeBlock({
  node, zoom, color, isHovered, appId, isAsking, isSelectedQA,
  onToggleFav, onFocus, onBranch, onSelectQA, onGenerateImage, isGeneratingImage, onReroll, isRerolling,
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
      <Box bg={bg} borderRadius="md" w="220px" boxShadow={ring || 'lg'} cursor="default" overflow="hidden">
        {/* Scrollable content */}
        <Box px={2} pt={2} maxH="240px" overflowY="auto">
          <HStack justify="space-between" align="flex-start" mb={1.5}>
            <Text
              fontSize="11px" fontWeight="700" color="black" lineHeight="1.3" flex={1}
              cursor="grab" draggable onDragStart={onDragStart} onClick={onFocus}
            >
              {node.Title}
            </Text>
            <IconButton
              aria-label="Favourite" size="xs" variant="ghost" flexShrink={0}
              icon={node.IsMyFav ? <BsStarFill color="goldenrod" /> : <BsStar />}
              onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
              h="16px" minW="16px"
            />
          </HStack>
          {node.imageUrl && (
            <Box mb={2} borderRadius="md" overflow="hidden">
              <ImageLightbox src={node.imageUrl} alt={node.Title} previewMaxH="160px" />
            </Box>
          )}
          <Text fontSize="8px" fontWeight="700" textTransform="uppercase" letterSpacing="0.08em" color="rgba(0,0,0,0.55)" mb={0.5}>Summary</Text>
          <Text fontSize="10px" fontWeight="500" color="black" lineHeight="1.5" mb={2}>{node.Summary}</Text>
          {node.Steps && node.Steps.length > 0 && (
            <>
              <Text fontSize="8px" fontWeight="700" textTransform="uppercase" letterSpacing="0.08em" color="rgba(0,0,0,0.55)" mb={0.5}>Steps</Text>
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
        </Box>
        {/* Action toolbar */}
        <HStack justify="space-around" borderTop="1px solid rgba(0,0,0,0.12)" px={2} py={1}>
          <Tooltip label="Re-roll" placement="bottom" hasArrow openDelay={300}>
            <IconButton aria-label="Re-roll" size="xs" variant="ghost"
              icon={isRerolling ? <Spinner size="xs" /> : <MdRefresh />}
              onClick={(e) => { e.stopPropagation(); onReroll(); }}
              h="18px" minW="18px" color="black" isDisabled={isRerolling} />
          </Tooltip>
          <Tooltip label="Branch" placement="bottom" hasArrow openDelay={300}>
            <IconButton aria-label="Branch" size="xs" variant="ghost"
              icon={<MdAltRoute />}
              onClick={(e) => { e.stopPropagation(); onBranch(); }}
              h="18px" minW="18px" color="black" />
          </Tooltip>
          <Tooltip label="Q&A" placement="bottom" hasArrow openDelay={300}>
            <IconButton aria-label="Q&A" size="xs" variant="ghost"
              icon={isAsking ? <Spinner size="xs" /> : <MdQuestionAnswer />}
              onClick={(e) => { e.stopPropagation(); onSelectQA(); }}
              h="18px" minW="18px" color={isSelectedQA ? 'teal.500' : 'black'} />
          </Tooltip>
          <Tooltip label={node.imageUrl ? 'Regenerate image' : 'Generate image'} placement="bottom" hasArrow openDelay={300}>
            <IconButton aria-label="Generate image" size="xs" variant="ghost"
              icon={isGeneratingImage ? <Spinner size="xs" /> : <MdImage />}
              onClick={(e) => { e.stopPropagation(); onGenerateImage(); }}
              h="18px" minW="18px" color={node.imageUrl ? 'blue.500' : 'black'} isDisabled={isGeneratingImage} />
          </Tooltip>
        </HStack>
      </Box>
    );
  }

  // ── Level 5: full prose + attributes ──────────────────────────────
  return (
    <Box bg={bg} borderRadius="md" w="270px" boxShadow={ring || 'xl'} cursor="default" overflow="hidden">
      {/* Scrollable content */}
      <Box px={3} pt={3} maxH="300px" overflowY="auto">
        <HStack justify="space-between" align="flex-start" mb={2}>
          <Text
            fontSize="13px" fontWeight="700" color="black" lineHeight="1.3" flex={1}
            cursor="grab" draggable onDragStart={onDragStart} onClick={onFocus}
          >
            {node.Title}
          </Text>
          <IconButton
            aria-label="Favourite" size="xs" variant="ghost" flexShrink={0}
            icon={node.IsMyFav ? <BsStarFill color="goldenrod" /> : <BsStar />}
            onClick={onToggleFav}
            h="18px" minW="18px"
          />
        </HStack>
        {node.imageUrl && (
          <Box mb={3} borderRadius="md" overflow="hidden">
            <ImageLightbox src={node.imageUrl} alt={node.Title} previewMaxH="200px" />
          </Box>
        )}
        <Text fontSize="11px" fontWeight="500" color="black" lineHeight="1.6" mb={3}>
          {node.Result}
        </Text>
        <AttrsBlock node={node} />
      </Box>
      {/* Action toolbar */}
      <HStack justify="space-around" borderTop="1px solid rgba(0,0,0,0.12)" px={3} py={1}>
        <Tooltip label="Re-roll" placement="bottom" hasArrow openDelay={300}>
          <IconButton aria-label="Re-roll" size="xs" variant="ghost"
            icon={isRerolling ? <Spinner size="xs" /> : <MdRefresh />}
            onClick={(e) => { e.stopPropagation(); onReroll(); }}
            h="20px" minW="20px" color="black" isDisabled={isRerolling} />
        </Tooltip>
        <Tooltip label="Branch" placement="bottom" hasArrow openDelay={300}>
          <IconButton aria-label="Branch" size="xs" variant="ghost"
            icon={<MdAltRoute />}
            onClick={(e) => { e.stopPropagation(); onBranch(); }}
            h="20px" minW="20px" color="black" />
        </Tooltip>
        <Tooltip label="Q&A" placement="bottom" hasArrow openDelay={300}>
          <IconButton aria-label="Q&A" size="xs" variant="ghost"
            icon={isAsking ? <Spinner size="xs" /> : <MdQuestionAnswer />}
            onClick={(e) => { e.stopPropagation(); onSelectQA(); }}
            h="20px" minW="20px" color={isSelectedQA ? 'teal.500' : 'black'} />
        </Tooltip>
        <Tooltip label={node.imageUrl ? 'Regenerate image' : 'Generate image'} placement="bottom" hasArrow openDelay={300}>
          <IconButton aria-label="Generate image" size="xs" variant="ghost"
            icon={isGeneratingImage ? <Spinner size="xs" /> : <MdImage />}
            onClick={(e) => { e.stopPropagation(); onGenerateImage(); }}
            h="20px" minW="20px" color={node.imageUrl ? 'blue.500' : 'black'} isDisabled={isGeneratingImage} />
        </Tooltip>
      </HStack>
    </Box>
  );
}
