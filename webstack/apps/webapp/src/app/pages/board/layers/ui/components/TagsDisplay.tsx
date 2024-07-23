/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState, useRef, useEffect } from 'react';
import {
  HStack,
  Tag,
  TagLabel,
  useDisclosure,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { MdExpandMore, MdExpandLess } from 'react-icons/md';
import { useUIStore, useInsightStore } from '@sage3/frontend';

export function TagsDisplay() {
  // UI Store
  const { setSelectedAppsIds, setSelectedTag } = useUIStore((state) => state);
  // Insight Store
  const insights = useInsightStore((state) => state.insights);
  
  // Manage menu visibility
  const { isOpen: isMenuOpen, onOpen: onMenuOpen, onClose: onMenuClose } = useDisclosure(); 

  // Keep track of tags in overflow menu
  const [overflowTags, setOverflowTags] = useState<string[]>([]);
  // Ref to the container holding tags
  const tagsContainerRef = useRef<HTMLDivElement>(null);
  // Manage the state of selected board tags
  const [groupTags, setGroupTags] = useState<string[]>([]);

  // Retrieve tags from all apps
  const allTags: string[] = [];
  insights.forEach((insight) => {
    allTags.push(...insight.data.labels);
  });
  // Ensure tags are unique
  const uniqueTags = Array.from(new Set(allTags));

  // Group apps with specified tags
  const groupApps = (tagName: string) => {
    // Update groupTags
    setGroupTags(prevTags => {
      const updatedTags = prevTags.includes(tagName)
        ? prevTags.filter(tag => tag !== tagName)  // Remove tagName from groupTags
        : [...prevTags, tagName];  // Add tagName to groupTags
  
      // Get all app ids with the updated set of tags
      const appIds = insights
        .filter(insight => updatedTags.some(tag => insight.data.labels.includes(tag)))
        .map(insight => insight._id);
  
      // Update selection of apps
      setSelectedAppsIds(appIds);
    
      return updatedTags;
    });
  };

  // Highlight all apps with the specified tag
  const highlightApps = (tagName: string) => {
    setSelectedTag(tagName);
  }
  // Remove highlight around apps
  const unhighlightApps = () => {
    setSelectedTag('');
  }

  // Calculate total width of tags to determine if "..." menu is needed
  useEffect(() => {
    const updateOverflowTags = () => {
      if (tagsContainerRef.current) {
        let totalWidth = 0;
        const tempOverflowTags: string[] = [];
        uniqueTags.forEach((tag) => {
          const tagWidth = document.getElementById(`tag-${tag}`)?.offsetWidth || 0;
          if (totalWidth + tagWidth > (window.innerWidth / 3)) { // if exceeds width limit
            tempOverflowTags.push(tag); // add to overflow tags
          }
          else {
            totalWidth += tagWidth; // otherwise, add to total width
          }
        });
        setOverflowTags(tempOverflowTags);
      }
    };

    updateOverflowTags(); // initial call to set overflow tags
  }, [uniqueTags]);
  const visibleTags = uniqueTags.filter((tag) => !overflowTags.includes(tag)); // tags which are visible in the main list

  // Expand or collapse tag menu
  const toggleMenu = () => {
    isMenuOpen ? onMenuClose() : onMenuOpen();
  }

  return (
    <HStack spacing={2} ref={tagsContainerRef}>
      {visibleTags.map((tag, index) => (
        <Tag
          id={`tag-${tag}`}
          size="sm"
          key={index}
          borderRadius="full"
          variant="solid"
          fontSize="12px"
          colorScheme={groupTags.includes(tag) ? 'teal' : 'gray'}
          onClick={() => groupApps(tag)}
          onMouseEnter={() => highlightApps(tag)}
          onMouseLeave={unhighlightApps}
        >
          <TagLabel>{tag}</TagLabel>
        </Tag>
      ))}
      {overflowTags.length > 0 && (
          <Menu isOpen={isMenuOpen}>
            <MenuButton
              as={Button}
              size="xs"
              onClick={toggleMenu}
            >
              {isMenuOpen ? <MdExpandLess size="14px" /> : <MdExpandMore size="14px" />}
            </MenuButton>
            <MenuList>
              {overflowTags.map((tag, index) => (
                <MenuItem key={index}>
                  <Tag
                    id={`tag-${tag}`}
                    size="sm"
                    borderRadius="full"
                    variant="solid"
                    fontSize="12px"
                    colorScheme={groupTags.includes(tag) ? 'teal' : 'gray'}
                    onClick={() => groupApps(tag)}
                    onMouseEnter={() => highlightApps(tag)}
                    onMouseLeave={unhighlightApps}
                  >
                    <TagLabel>{tag}</TagLabel>
                  </Tag>
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        )}
    </HStack>
  );
}
