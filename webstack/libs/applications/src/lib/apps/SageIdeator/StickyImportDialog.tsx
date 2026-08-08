/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  IconButton,
  Tooltip,
  Text,
  VStack,
  HStack,
  Box,
  Wrap,
  WrapItem,
  Tag,
  Spinner,
  Divider,
  useColorModeValue,
} from '@chakra-ui/react';
import { MdRefresh } from 'react-icons/md';

export type ImportPreview = {
  Title: string;
  Summary: string;
  Keywords: string[];
  Steps: string[];
  Structure: string;
};

interface Props {
  isOpen: boolean;
  isLoading: boolean;
  originalText: string;
  preview: ImportPreview | null;
  onConfirm: () => void;
  onCancel: () => void;
  onRegenerate: () => void;
}

export function StickyImportDialog({ isOpen, isLoading, originalText, preview, onConfirm, onCancel, onRegenerate }: Props) {
  const bg = useColorModeValue('white', 'gray.800');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');
  const originalBg = useColorModeValue('gray.50', 'gray.700');
  const previewBg = useColorModeValue('teal.50', 'teal.900');

  return (
    <Modal isOpen={isOpen} onClose={onCancel} size="lg" isCentered>
      <ModalOverlay />
      <ModalContent bg={bg}>
        <ModalHeader fontSize="md">Import Stickie as Idea</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="stretch" spacing={3}>
            <Box>
              <Text fontSize="xs" color={mutedColor} mb={1} fontWeight="semibold" textTransform="uppercase" letterSpacing="wide">
                Stickie text
              </Text>
              <Box bg={originalBg} p={2} borderRadius="md" maxH="80px" overflowY="auto">
                <Text fontSize="sm" whiteSpace="pre-wrap">
                  {originalText}
                </Text>
              </Box>
            </Box>

            <Divider />

            <Box>
              <Text fontSize="xs" color={mutedColor} mb={2} fontWeight="semibold" textTransform="uppercase" letterSpacing="wide">
                Idea preview
              </Text>

              {isLoading ? (
                <HStack justify="center" py={6} spacing={3}>
                  <Spinner size="sm" color="teal.400" />
                  <Text fontSize="sm" color={mutedColor}>
                    Generating preview…
                  </Text>
                </HStack>
              ) : preview ? (
                <Box bg={previewBg} p={3} borderRadius="md">
                  <VStack align="stretch" spacing={2}>
                    <Text fontWeight="bold" fontSize="sm">
                      {preview.Title}
                    </Text>
                    <Text fontSize="sm">{preview.Summary}</Text>
                    {preview.Keywords.length > 0 && (
                      <Wrap>
                        {preview.Keywords.map((kw) => (
                          <WrapItem key={kw}>
                            <Tag size="sm" colorScheme="teal">
                              {kw}
                            </Tag>
                          </WrapItem>
                        ))}
                      </Wrap>
                    )}
                    {preview.Steps.length > 0 && (
                      <VStack align="stretch" spacing={0.5}>
                        {preview.Steps.map((step, i) => (
                          <Text key={i} fontSize="xs" color={mutedColor}>
                            {i + 1}. {step}
                          </Text>
                        ))}
                      </VStack>
                    )}
                  </VStack>
                </Box>
              ) : null}
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter gap={2}>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Tooltip label="Reroll" placement="top" hasArrow openDelay={300}>
            <IconButton
              aria-label="Reroll"
              icon={<MdRefresh />}
              size="sm"
              variant="outline"
              onClick={onRegenerate}
              isDisabled={isLoading}
            />
          </Tooltip>
          <Button size="sm" colorScheme="teal" onClick={onConfirm} isDisabled={isLoading || !preview}>
            Add Idea
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
