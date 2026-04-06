/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useRef } from 'react';
import {
  Flex,
  Box,
  Image,
  Text,
  HStack,
  VStack,
  Textarea,
  Button,
  IconButton,
  Spinner,
  Tooltip,
  Badge,
  Divider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from '@chakra-ui/react';
import { MdSend, MdClear, MdEdit, MdAttachFile, MdDelete, MdAdd, MdPictureAsPdf } from 'react-icons/md';

import { state as AppState } from './index';

interface ChatPanelProps {
  chatHistory: AppState['chatHistory'];
  nodes: AppState['nodes'];
  dimensions: AppState['dimensions'];
  status: AppState['status'];
  statusMessage: string;
  isGenerating: boolean;
  activeEntryId: string | null;
  input: string;
  panelBgHex: string;
  borderHex: string;
  textColor: string;
  onInputChange: (value: string) => void;
  onGenerate: () => void;
  onGenerateMore: (entry: AppState['chatHistory'][number]) => void;
  onClearAll: () => void;
  onRestoreSnapshot: (entry: AppState['chatHistory'][number]) => void;
  onEditPrompt: (prompt: string) => void;
  onDeleteEntry: (entryId: string) => void;
  attachedImage: string | null;
  onAttachImage: (dataUrl: string | null) => void;
  pdfFilename: string | null;
  onAttachPdf: (file: File) => void;
  onClearPdf: () => void;
  isLoadingPdf?: boolean;
}

function HistoryImageThumb({ src }: { src: string }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  return (
    <>
      <Image
        src={src} alt="Prompt image" w="100%" borderRadius="sm" maxH="70px" objectFit="cover"
        cursor="zoom-in" mb={1}
        onClick={(e) => { e.stopPropagation(); onOpen(); }}
      />
      <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent bg="black" maxW="90vw" maxH="90vh">
          <ModalCloseButton color="white" zIndex={10} />
          <ModalBody p={0} display="flex" alignItems="center" justifyContent="center">
            <Image src={src} alt="Prompt image" maxW="100%" maxH="90vh" objectFit="contain" borderRadius="md" />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}

export function ChatPanel({
  chatHistory, nodes, dimensions, status, statusMessage, isGenerating,
  activeEntryId, input, panelBgHex, borderHex, textColor,
  onInputChange, onGenerate, onGenerateMore, onClearAll, onRestoreSnapshot, onEditPrompt, onDeleteEntry,
  attachedImage, onAttachImage,
  pdfFilename, onAttachPdf, onClearPdf, isLoadingPdf,
}: ChatPanelProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset so the same file can be re-attached

    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      // Resize to max 1024px on longest side, JPEG 80% quality
      const img = new window.Image();
      img.onload = () => {
        const MAX = 1024;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width >= height) { height = Math.round((height / width) * MAX); width = MAX; }
          else { width = Math.round((width / height) * MAX); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        onAttachImage(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onGenerate(); }
    if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); onInputChange(input + '\n'); }
  };

  return (
    <Flex
      direction="column"
      w="180px"
      minW="180px"
      h="100%"
      bg={panelBgHex}
      borderRight="1px solid"
      borderColor={borderHex}
      p={2}
      gap={2}
    >
      {/* History */}
      <Box flex={1} overflowY="auto" fontSize="xs" color={textColor}>
        {chatHistory.length === 0 && (
          <Text fontSize="xs" color="gray.400" p={2} textAlign="center">
            Enter a prompt to start exploring ideas.
          </Text>
        )}
        {chatHistory.map((entry) => {
          const entryNodes = entry.nodes ?? [];
          const isActive = entry.id === activeEntryId;
          const hasSnapshot = entryNodes.length > 0;
          const favCount = entryNodes.filter((n) => n.IsMyFav).length;
          const isBranch = !!entry.parentEntryId;
          return (
            <Box
              key={entry.id}
              mb={1.5}
              ml={isBranch ? 3 : 0}
              p={1.5}
              borderRadius="md"
              borderLeft="3px solid"
              borderLeftColor={isActive ? 'blue.400' : isBranch ? 'orange.400' : 'transparent'}
              bg={isActive ? 'blue.50' : isBranch ? 'orange.50' : 'gray.50'}
              _dark={{ bg: isActive ? 'blue.900' : isBranch ? 'orange.900' : 'gray.700' }}
              cursor={hasSnapshot ? 'pointer' : 'default'}
              opacity={hasSnapshot ? 1 : 0.5}
              _hover={hasSnapshot ? { bg: isActive ? 'blue.100' : 'orange.100', _dark: { bg: isActive ? 'blue.800' : 'orange.800' } } : {}}
              onClick={() => onRestoreSnapshot(entry)}
              transition="background 0.15s"
            >
              <HStack align="stretch" spacing={1}>
                {/* Content */}
                <VStack flex={1} align="stretch" spacing={0.5} minW={0}>
                  <HStack spacing={1}>
                    <Text fontWeight="bold" fontSize="9px" color="blue.500" _dark={{ color: 'blue.300' }} noOfLines={1}>
                      {entry.userName}
                    </Text>
                    {isBranch && <Badge colorScheme="orange" fontSize="8px" variant="subtle">⎇</Badge>}
                  </HStack>
                  {entry.imageUrl && <HistoryImageThumb src={entry.imageUrl} />}
                  <Text fontSize="10px" fontWeight={isActive ? '600' : '400'} color={textColor} noOfLines={3}>
                    {entry.prompt}
                  </Text>
                  {entry.pdfFilename && (
                    <HStack spacing={1} mt={0.5}>
                      <MdPictureAsPdf size={10} color="red" />
                      <Text fontSize="9px" color="red.400" noOfLines={1}>{entry.pdfFilename}</Text>
                    </HStack>
                  )}
                  {hasSnapshot && (
                    <HStack spacing={1} flexWrap="wrap">
                      <Badge colorScheme="green" fontSize="8px">{entryNodes.length} ideas</Badge>
                      {favCount > 0 && <Badge colorScheme="yellow" fontSize="8px">★ {favCount}</Badge>}
                    </HStack>
                  )}
                </VStack>
                {/* Actions */}
                <VStack spacing={0} flexShrink={0} justify="center" bg="blackAlpha.100" _dark={{ bg: 'whiteAlpha.100' }} borderRadius="md" px="2px">
                  {hasSnapshot && (
                    <Tooltip label="Generate more ideas" placement="left" hasArrow openDelay={400}>
                      <IconButton
                        aria-label="Generate more"
                        icon={<MdAdd />}
                        size="xs" variant="ghost" colorScheme="teal"
                        h="16px" minW="16px" fontSize="11px"
                        isDisabled={isGenerating}
                        onClick={(e) => { e.stopPropagation(); onGenerateMore(entry); }}
                      />
                    </Tooltip>
                  )}
                  <Tooltip label="Edit prompt" placement="left" hasArrow openDelay={400}>
                    <IconButton
                      aria-label="Edit prompt"
                      icon={<MdEdit />}
                      size="xs" variant="ghost" colorScheme="gray"
                      h="16px" minW="16px" fontSize="10px"
                      onClick={(e) => { e.stopPropagation(); onEditPrompt(entry.prompt); setTimeout(() => inputRef.current?.focus(), 50); }}
                    />
                  </Tooltip>
                  <Tooltip label="Delete entry" placement="left" hasArrow openDelay={400}>
                    <IconButton
                      aria-label="Delete entry"
                      icon={<MdDelete />}
                      size="xs" variant="ghost" colorScheme="red"
                      h="16px" minW="16px" fontSize="10px"
                      onClick={(e) => { e.stopPropagation(); onDeleteEntry(entry.id); }}
                    />
                  </Tooltip>
                </VStack>
              </HStack>
            </Box>
          );
        })}
        {isGenerating && (
          <Box p={1.5} bg="orange.50" borderRadius="md" _dark={{ bg: 'orange.900' }}>
            <HStack spacing={1}>
              <Spinner size="xs" color="orange.400" />
              <Text fontSize="10px" color="orange.600" _dark={{ color: 'orange.300' }}>{statusMessage}</Text>
            </HStack>
          </Box>
        )}
      </Box>

      <Divider />

      {/* Status badge */}
      {status === 'ready' && (
        <HStack spacing={1} px={1}>
          <Badge colorScheme="green" fontSize="9px">{nodes.length} ideas</Badge>
          <Badge colorScheme="purple" fontSize="9px">{dimensions.length} dims</Badge>
        </HStack>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onAttachPdf(f); e.target.value = ''; }}
      />

      {/* PDF context badge */}
      {pdfFilename && (
        <HStack spacing={1} px={1} py={0.5} bg="red.50" _dark={{ bg: 'red.900' }} borderRadius="md">
          <MdPictureAsPdf size={12} color="red" />
          <Text fontSize="9px" color="red.600" _dark={{ color: 'red.300' }} flex={1} noOfLines={1}>{pdfFilename}</Text>
          <IconButton
            aria-label="Remove PDF context"
            icon={<MdClear />}
            size="xs" variant="ghost" colorScheme="red"
            h="14px" minW="14px" fontSize="10px"
            onClick={onClearPdf}
          />
        </HStack>
      )}

      {/* Image preview */}
      {attachedImage && (
        <Box position="relative" w="100%">
          <Image src={attachedImage} alt="Attached" borderRadius="md" maxH="80px" objectFit="cover" w="100%" />
          <IconButton
            aria-label="Remove image"
            icon={<MdClear />}
            size="xs"
            colorScheme="blackAlpha"
            position="absolute"
            top={1}
            right={1}
            onClick={() => onAttachImage(null)}
          />
          <Text fontSize="9px" color="gray.400" mt={1} textAlign="center">
            Inspires the idea space — not described or analyzed directly.
          </Text>
        </Box>
      )}

      {/* Input */}
      <Textarea
        ref={inputRef}
        placeholder="Describe your prompt…"
        size="sm"
        rows={3}
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={onKeyDown}
        resize="none"
        fontSize="xs"
        isDisabled={isGenerating}
      />
      <HStack spacing={1}>
        <Button
          size="xs"
          colorScheme="blue"
          leftIcon={<MdSend />}
          onClick={onGenerate}
          isLoading={isGenerating}
          isDisabled={isGenerating}
          flex={1}
        >
          Generate
        </Button>
        <Tooltip label="Attach image to prompt" placement="top" hasArrow openDelay={400}>
          <IconButton
            aria-label="Attach image to prompt"
            icon={<MdAttachFile />}
            size="xs"
            variant={attachedImage ? 'solid' : 'ghost'}
            colorScheme={attachedImage ? 'blue' : 'gray'}
            isDisabled={isGenerating}
            onClick={() => fileInputRef.current?.click()}
          />
        </Tooltip>
        <Tooltip label="Attach PDF as context" placement="top" hasArrow openDelay={400}>
          <IconButton
            aria-label="Attach PDF as context"
            icon={isLoadingPdf ? <Spinner size="xs" /> : <MdPictureAsPdf />}
            size="xs"
            variant={pdfFilename ? 'solid' : 'ghost'}
            colorScheme={pdfFilename ? 'red' : 'gray'}
            isDisabled={isGenerating || isLoadingPdf}
            onClick={() => pdfInputRef.current?.click()}
          />
        </Tooltip>
      </HStack>
      <Button size="xs" variant="ghost" colorScheme="red" leftIcon={<MdClear />} onClick={onClearAll}>
        Clear all
      </Button>
    </Flex>
  );
}
