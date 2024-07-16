/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { HStack, Tag, TagLabel } from '@chakra-ui/react';

import { useUIStore, useInsightStore } from '@sage3/frontend';

export function TagsDisplay() {
  // UI Store
//   const { selectedTag, setSelectedTag } = useUIStore((state) => state);
  const { selectedTag, setSelectedTag } = useUIStore((state) => state);

  // Insight Store
  const insights = useInsightStore((state) => state.insights);

  // Retrieve tags from all apps
  const allTags: string[] = [];
  insights.forEach((insight) => {
    allTags.push(...insight.data.labels);
  });

  // Ensure tags are unique
  const uniqueTags = Array.from(new Set(allTags));

  // Highlight all apps with the specified tag
  const highlightApps = (tagName: string) => {
    setSelectedTag(tagName);
  }

  return (
    <HStack spacing={2}>
      {uniqueTags.map((tag, index) => (
        <Tag key={index} size="sm" borderRadius="full" variant="solid" fontSize="12px" colorScheme={tag === selectedTag ? 'green' : 'gray'} onClick={() => 
            highlightApps(tag)
        }>
          <TagLabel>{tag}</TagLabel>
        </Tag>
      ))}
    </HStack>
  );
}
