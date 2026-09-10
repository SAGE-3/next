/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useRef, useState, useEffect } from 'react';
import { Flex, Box, Text, HStack, VStack, Input, IconButton, Spinner, Center, Collapse } from '@chakra-ui/react';
import { MdSend, MdClear, MdChevronRight, MdExpandMore } from 'react-icons/md';

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
  node,
  qaEntries,
  askingNodeId,
  qaInput,
  panelBgHex,
  borderHex,
  textColor,
  onQaInputChange,
  onSubmit,
  onClose,
}: QAPanelProps) {
  const s = (px: number) => `${Math.round(px * 1.5)}px`;

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const latestEntryRef = useRef<HTMLDivElement>(null);

  // Auto-expand and scroll to the newest entry when it arrives
  useEffect(() => {
    if (qaEntries.length === 0) return;
    const latest = qaEntries[qaEntries.length - 1];
    setExpandedIds((prev) => new Set(prev).add(latest.id));
    // Small delay to let Collapse animate open before scrolling
    setTimeout(() => latestEntryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
  }, [qaEntries.length]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Flex direction="column" w="300px" minW="300px" h="100%" bg={panelBgHex} borderLeft="1px solid" borderColor={borderHex} flexShrink={0}>
      {/* Header */}
      <HStack px={3} py={2} borderBottom="1px solid" borderColor={borderHex} flexShrink={0}>
        <Text fontSize={s(13)} fontWeight="700" color={textColor} flex={1}>
          {node ? node.Title : 'Q&A'}
        </Text>
        <IconButton aria-label="Close Q&A panel" icon={<MdClear />} size="xs" variant="ghost" onClick={onClose} />
      </HStack>

      {!node ? (
        <Center flex={1}>
          <Text fontSize={s(13)} color="gray.400">
            Select a node to view Q&amp;A.
          </Text>
        </Center>
      ) : (
        <>
          {/* Scrollable body */}
          <Box flex={1} overflowY="auto" px={3} py={2} onWheel={(e) => e.stopPropagation()}>
            {/* Node summary */}
            <Text fontSize={s(13)} fontWeight="500" color={textColor} lineHeight="1.6">
              {node.Summary}
            </Text>
            {node.Steps?.length > 0 && (
              <VStack align="stretch" spacing={0.5} mt={2} mb={3}>
                <Text fontSize={s(11)} fontWeight="700" textTransform="uppercase" letterSpacing="0.08em" color="gray.400" mb={0.5}>
                  Steps
                </Text>
                {node.Steps.map((step, i) => (
                  <HStack key={i} align="flex-start" spacing={1.5}>
                    <Text fontSize={s(12)} fontWeight="700" color={textColor} flexShrink={0}>
                      {i + 1}.
                    </Text>
                    <Text fontSize={s(12)} color={textColor} lineHeight="1.5">
                      {step}
                    </Text>
                  </HStack>
                ))}
              </VStack>
            )}

            <Box borderTop="1px solid" borderColor="gray.200" _dark={{ borderColor: 'gray.600' }} my={2} />

            {/* Q&A entries */}
            {qaEntries.length === 0 && !askingNodeId && (
              <Text fontSize={s(13)} color="gray.400" textAlign="center" mt={4}>
                No questions yet. Ask one below.
              </Text>
            )}

            <VStack align="stretch" spacing={1}>
              {qaEntries.map((e, idx) => {
                const isExpanded = expandedIds.has(e.id);
                const isLatest = idx === qaEntries.length - 1;
                return (
                  <Box key={e.id} ref={isLatest ? latestEntryRef : undefined}>
                    {/* Question row — always visible, click to toggle */}
                    <HStack
                      spacing={1}
                      cursor="pointer"
                      onClick={() => toggleExpand(e.id)}
                      py={1}
                      _hover={{ opacity: 0.8 }}
                    >
                      <Box color="teal.500" _dark={{ color: 'teal.300' }} flexShrink={0} mt="1px">
                        {isExpanded ? <MdExpandMore size={16} /> : <MdChevronRight size={16} />}
                      </Box>
                      <Text fontSize={s(13)} fontWeight="700" color="teal.600" _dark={{ color: 'teal.300' }} flex={1}>
                        {e.question}
                      </Text>
                    </HStack>

                    {/* Answer — collapsed by default, expanded when toggled */}
                    <Collapse in={isExpanded} animateOpacity>
                      <Box pl={5} pb={2}>
                        <Text fontSize={s(13)} color={textColor} lineHeight="1.6">
                          {e.answer}
                        </Text>
                        <Text fontSize={s(11)} color="gray.400" mt={1}>
                          {e.userName}
                        </Text>
                      </Box>
                    </Collapse>
                  </Box>
                );
              })}

              {askingNodeId === node.ID && (
                <HStack spacing={2} py={1}>
                  <Spinner size="xs" color="teal.400" />
                  <Text fontSize={s(13)} color="teal.500">
                    Answering…
                  </Text>
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
                fontSize={s(13)}
                value={qaInput}
                onChange={(e) => onQaInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onSubmit();
                  }
                }}
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
