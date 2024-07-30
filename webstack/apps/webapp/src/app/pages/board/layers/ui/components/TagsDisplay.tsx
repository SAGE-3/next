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
  Tooltip,
} from '@chakra-ui/react';
import { MdExpandMore, MdExpandLess } from 'react-icons/md';
import { useUIStore, useInsightStore } from '@sage3/frontend';

type TagFrequency = Record<string, number>

export function TagsDisplay() {
  // UI Store
  const { setSelectedAppsIds, setSelectedTag } = useUIStore((state) => state);
  // Insight Store
  const insights = useInsightStore((state) => state.insights);

  // Semantic to separate a tag's string name from color
  const delimiter = ";~";

   // Tag names are sorted from most to least frequent
  const [sortedTags, setSortedTags] = useState<string[]>([]);
  // Keep track of tags in overflow menu
  const [overflowIndex, setOverflowIndex] = useState<number>(-1);
  // Ref to the container holding tags
  const tagsContainerRef = useRef<HTMLDivElement>(null);

  // Manage menu visibility
  const { isOpen: isMenuOpen, onOpen: onMenuOpen, onClose: onMenuClose } = useDisclosure(); 
  
  // Manage the state of selected board tags
  const [groupTags, setGroupTags] = useState<string[]>([]);
  
  useEffect(() => {
    // Keep track of frequency of all tags
    const freqCounter: TagFrequency = {};
    insights.forEach(insight => {
      insight.data.labels.forEach(tag => {
        if (freqCounter[tag]) {
          freqCounter[tag] += 1;
        }
        else {
          freqCounter[tag] = 1;
        }
      });
    });

    let allTags: string[] = [];
    insights.forEach((insight) => {
      allTags.push(...insight.data.labels);
    });
    allTags = Array.from(new Set(allTags));
    allTags.sort((a, b) => freqCounter[b] - freqCounter[a]); // Sort in descending order
    setSortedTags(allTags);

    // Calculate total width of tags to determine if overflow menu is needed for each app
    if (tagsContainerRef.current) {
      let totalWidth = 0;
      for (let i = 0; i < sortedTags.length; i++) {
        const tagWidth = document.getElementById(`tag-${sortedTags[i]}`)?.offsetWidth || 0;
        if (totalWidth + tagWidth > (window.innerWidth / 3)) { // if exceeds width limit
          setOverflowIndex(i);
          break;
        }
        else {
          totalWidth += tagWidth; // otherwise, add to total width
        }
      }
    }
  }, [insights]);

  // Separate tags into two lists
  const visibleTags = overflowIndex === -1 ? sortedTags : sortedTags.slice(0, overflowIndex);
  const overflowTags = overflowIndex === -1 ? [] : sortedTags.slice(overflowIndex);

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
          border={groupTags.includes(tag) ? 'dashed 2px white' : 'solid 2px transparent'}
          variant="solid"
          cursor="pointer"
          fontSize="12px"
          colorScheme={tag.split(delimiter)[1]}
          onClick={() => groupApps(tag)}
          onMouseEnter={() => highlightApps(tag)}
          onMouseLeave={unhighlightApps}
        >
          <TagLabel>{tag.split(delimiter)[0]}</TagLabel>
        </Tag>
      ))}
      {overflowTags.length > 0 && (
          <Menu isOpen={isMenuOpen}>
            <Tooltip
              placement="top"
              hasArrow={true}
              openDelay={400}
              label="See more tags"
            >
              <MenuButton
                as={Button}
                size="xs"
                onClick={toggleMenu}
              >
                {isMenuOpen ? <MdExpandLess size="14px" /> : <MdExpandMore size="14px" />}
              </MenuButton>
            </Tooltip>
            <MenuList sx={{maxHeight: '500px', overflowY: 'auto'}}>
              {overflowTags.map((tag, index) => (
                <MenuItem key={index}>
                  <Tag
                    id={`tag-${tag}`}
                    size="sm"
                    borderRadius="full"
                    border={groupTags.includes(tag) ? 'dashed 2px white' : 'solid 2px transparent'}
                    variant="solid"
                    cursor="pointer"
                    fontSize="12px"
                    colorScheme={tag.split(delimiter)[1]}
                    onClick={() => groupApps(tag)}
                    onMouseEnter={() => highlightApps(tag)}
                    onMouseLeave={unhighlightApps}
                  >
                    <TagLabel>{tag.split(delimiter)[0]}</TagLabel>
                  </Tag>
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        )}
    </HStack>
  );
}