/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import {
  Flex,
  Box,
  Text,
  HStack,
  VStack,
  Input,
  IconButton,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { MdSend, MdClear } from 'react-icons/md';

import { state as AppState } from './index';

type SageNode = AppState['nodes'][number];
type QAEntry = AppState['qa'][number];

interface QAPanelProps {
  node: SageNode | null;
  qaEntries: QAEntry[];
  askingNodeId: string | null;
  qaInput: string;
  panelBgHex: string;
  borderHex: string;
  textColor: string;
  onQaInputChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function QAPanel({
  node, qaEntries, askingNodeId, qaInput,
  panelBgHex, borderHex, textColor,
  onQaInputChange, onSubmit, onClose,
}: QAPanelProps) {
  return (
    <Flex
      direction="column"
      w="280px"
      minW="280px"
      h="100%"
      bg={panelBgHex}
      borderLeft="1px solid"
      borderColor={borderHex}
      flexShrink={0}
    >
      {/* Header */}
      <HStack px={3} py={2} borderBottom="1px solid" borderColor={borderHex} flexShrink={0}>
        <Text fontSize="xs" fontWeight="700" color={textColor} flex={1}>
          {node ? node.Title : 'Q&A'}
        </Text>
        <IconButton
          aria-label="Close Q&A panel"
          icon={<MdClear />}
          size="xs"
          variant="ghost"
          onClick={onClose}
        />
      </HStack>

      {!node ? (
        <Center flex={1}>
          <Text fontSize="xs" color="gray.400">Select a node to view Q&amp;A.</Text>
        </Center>
      ) : (
        <>
          {/* Node summary (fixed) */}
          <Box px={3} py={2} borderBottom="1px solid" borderColor={borderHex} flexShrink={0}>
            <Text fontSize="xs" fontWeight="500" color={textColor} lineHeight="1.6">
              {node.Summary}
            </Text>
            {node.Steps?.length > 0 && (
              <VStack align="stretch" spacing={0.5} mt={2}>
                <Text
                  fontSize="9px" fontWeight="700" textTransform="uppercase"
                  letterSpacing="0.08em" color="gray.400" mb={0.5}
                >
                  Steps
                </Text>
                {node.Steps.map((step, i) => (
                  <HStack key={i} align="flex-start" spacing={1.5}>
                    <Text fontSize="10px" fontWeight="700" color={textColor} flexShrink={0}>{i + 1}.</Text>
                    <Text fontSize="10px" color={textColor} lineHeight="1.5">{step}</Text>
                  </HStack>
                ))}
              </VStack>
            )}
          </Box>

          {/* Q&A list (scrollable) */}
          <Box flex={1} overflowY="auto" px={3} py={2}>
            {qaEntries.length === 0 && !askingNodeId && (
              <Text fontSize="xs" color="gray.400" textAlign="center" mt={4}>
                No questions yet. Ask one below.
              </Text>
            )}
            <VStack align="stretch" spacing={3}>
              {qaEntries.map((e) => (
                <Box key={e.id}>
                  <Text fontSize="xs" fontWeight="700" color="teal.600" _dark={{ color: 'teal.300' }} mb={1}>
                    Q: {e.question}
                  </Text>
                  <Text fontSize="xs" color={textColor} lineHeight="1.6">
                    {e.answer}
                  </Text>
                  <Text fontSize="9px" color="gray.400" mt={1}>{e.userName}</Text>
                </Box>
              ))}
              {askingNodeId === node.ID && (
                <HStack spacing={2}>
                  <Spinner size="xs" color="teal.400" />
                  <Text fontSize="xs" color="teal.500">Answering…</Text>
                </HStack>
              )}
            </VStack>
          </Box>

          {/* Ask input (fixed at bottom) */}
          <Box px={3} py={2} borderTop="1px solid" borderColor={borderHex} flexShrink={0}>
            <HStack spacing={2}>
              <Input
                placeholder="Ask a question…"
                size="sm"
                fontSize="xs"
                value={qaInput}
                onChange={(e) => onQaInputChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSubmit(); } }}
                isDisabled={!!askingNodeId}
              />
              <IconButton
                aria-label="Send"
                icon={<MdSend />}
                size="sm"
                colorScheme="teal"
                isDisabled={!!askingNodeId || !qaInput.trim()}
                onClick={onSubmit}
                flexShrink={0}
              />
            </HStack>
          </Box>
        </>
      )}
    </Flex>
  );
}
