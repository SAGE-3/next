/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState, useRef, useEffect } from 'react';
import { Tag, TagLabel, TagCloseButton, Box, VStack, Button, Tooltip, useColorModeValue, useDisclosure } from '@chakra-ui/react';
import { MdExpandMore, MdExpandLess } from 'react-icons/md';

import { colors, SAGEColors } from '@sage3/shared';
import { useUIStore, useInsightStore, useHexColor, useUserSettings, ConfirmModal, truncateWithEllipsis } from '@sage3/frontend';

type TagFrequency = Record<string, number>;

export function TagsDisplay() {
  // UI Store
  const selectedAppsIds = useUIStore((state) => state.selectedAppsIds);
  const setSelectedAppsIds = useUIStore((state) => state.setSelectedAppsIds);
  const setSelectedTag = useUIStore((state) => state.setSelectedTag);

  // Insight Store
  const insights = useInsightStore((state) => state.insights);
  const updateBatchInsight = useInsightStore((state) => state.updateBatch);

  // Settings
  const { settings } = useUserSettings();
  const showUI = settings.showUI;
  const showTags = settings.showTags;

  // Delete tag confirmation modal
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [tagToDelete, setTagToDelete] = useState<string>('');

  // Semantic to separate a tag's string name from color
  const delimiter = ':';

  // Tag names are sorted from most to least frequent
  const [sortedTags, setSortedTags] = useState<string[]>([]);
  // Keep track of which tags belong in overflow menu
  const [overflowIndex, setOverflowIndex] = useState<number>(-1);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [visibleTags, setVisibleTags] = useState<string[]>([]);
  const [overflowTags, setOverflowTags] = useState<string[]>([]);
  // Ref to the container holding tags
  const tagsContainerRef = useRef<HTMLDivElement>(null);

  // Manage overflow menu visibility
  const [isOverflowOpen, setIsOverflowOpen] = useState<boolean>(false);
  // Overflow menu colors based on light/dark mode
  const overflowBg = useColorModeValue('gray.50', 'gray.700');

  // Manage the state of selected board tags
  const [groupTags, setGroupTags] = useState<string[]>([]);

  // Window size tracking
  const [winHeight, setHeight] = useState(window.innerHeight);

  function updateOverflowIndex(allTags: string[]) {
    // Calculate total height of tags to determine if overflow menu is needed for each app
    if (tagsContainerRef.current) {
      let totalHeight = 0;
      let newIndex = -1;
      for (let i = 0; i < allTags.length; i++) {
        const tagHeight = 32;
        // if exceeds width limit: a little less than half of the window height
        if (totalHeight + tagHeight > window.innerHeight / 2.1) {
          newIndex = i;
          break;
        } else {
          // if exceeds width limit
          totalHeight += tagHeight;
        }
      }
      if (newIndex != overflowIndex) setOverflowIndex(newIndex);
    }
    setSortedTags(allTags);
    setIsLoaded(true);
  }

  useEffect(() => {
    // Keep track of frequency of all tags
    const freqCounter: TagFrequency = {};
    insights.forEach((insight) => {
      insight.data.labels.forEach((tag) => {
        if (freqCounter[tag]) {
          freqCounter[tag] += 1;
        } else {
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

    updateOverflowIndex(allTags);
  }, [insights]);

  useEffect(() => {
    updateOverflowIndex(sortedTags);
  }, [winHeight]);

  // Update the window size
  const updateDimensions = () => {
    setHeight(window.innerHeight);
  };
  useEffect(() => {
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Map all sage colors to hex
  let colorMap: Record<SAGEColors, string> = {} as Record<SAGEColors, string>;
  colors.forEach((c) => {
    colorMap[c] = useHexColor(c);
  });
  // Get tag's color in hex
  const getTagColor = (color: string) => {
    return colorMap[color as SAGEColors];
  };

  // Separate tags into two lists
  useEffect(() => {
    setVisibleTags(overflowIndex === -1 ? sortedTags : sortedTags.slice(0, overflowIndex));
    setOverflowTags(overflowIndex === -1 ? [] : sortedTags.slice(overflowIndex));
  }, [overflowIndex, sortedTags]);

  // Group apps given specified tags
  const groupApps = (tagName: string) => {
    // Update groupTags and get the updated tags
    const updatedTags = groupTags.includes(tagName)
      ? groupTags.filter((tag) => tag !== tagName) // Remove tagName if it exists
      : [...groupTags, tagName]; // Add tagName if it doesn't exist

    setGroupTags(updatedTags);

    // Get all app ids with the updated set of tags
    const appIds = insights
      .filter((insight) => updatedTags.some((tag) => insight.data.labels.includes(tag))) // At least one tag exists in labels
      .map((insight) => insight._id);

    // Update selection of apps
    setSelectedAppsIds(appIds);
  };

  useEffect(() => {
    // Deselect board tags when apps are deselected
    if (selectedAppsIds.length === 0) {
      groupTags.length = 0;
    }
  }, [selectedAppsIds]);

  // Highlight all apps with the specified tag
  const highlightApps = (tagName: string) => {
    setSelectedTag(tagName);
  };
  // Remove highlight around apps
  const unhighlightApps = () => {
    setSelectedTag('');
  };

  // Delete tag from all associated apps
  const handleDeleteTag = () => {
    const tagName = tagToDelete;

    // Collect all the updates
    const updates = insights
      .filter((insight) => insight.data.labels.some((label) => label.includes(tagName)))
      .map((insight) => ({
        id: insight._id,
        updates: { labels: insight.data.labels.filter((label) => !label.includes(tagName)) },
      }));

    // Perform batch update
    updateBatchInsight(updates);

    // Close delete tag modal
    onClose();
  };

  // If the tag exceeds 10 characters, truncate the string
  const truncateStr = (str: string) => {
    const tagName = str.split(delimiter)[0];
    const maxLen = 10;
    if (groupTags.includes(str)) {
      // show entire string if tag is selected
      return tagName;
    }
    return truncateWithEllipsis(tagName, maxLen);
  };

  return (
    <VStack spacing={2} align="flex-start" ref={tagsContainerRef} display={showUI && showTags ? 'flex' : 'none'}>
      {isLoaded && overflowTags.length > 0 && (
        <Box>
          <Tooltip placement="top" hasArrow={true} openDelay={400} label={isOverflowOpen ? 'Hide more tags.' : 'Show more tags.'}>
            <Button size="xs" cursor="pointer" onClick={() => setIsOverflowOpen(!isOverflowOpen)}>
              {isOverflowOpen ? <MdExpandLess size="14px" /> : <MdExpandMore size="14px" />}
            </Button>
          </Tooltip>

          {isOverflowOpen && (
            <Box
              position="absolute"
              bottom="100%"
              bg={overflowBg}
              borderWidth="1px"
              boxShadow="md"
              minWidth="200px"
              maxHeight="300px"
              overflowY="auto"
              borderRadius="md"
              p={3}
            >
              <VStack spacing={2} align="flex-start">
                {overflowTags.map((tag, index) => (
                  <Tag
                    id={`tag-${tag}`}
                    size="sm"
                    key={index}
                    borderRadius="md"
                    border="solid 2px"
                    borderColor={tag.split(delimiter)[1] ? getTagColor(tag.split(delimiter)[1]) : 'gray'}
                    variant="solid"
                    cursor="pointer"
                    fontSize="12px"
                    color={groupTags.includes(tag) ? 'black' : 'white'}
                    bgColor={groupTags.includes(tag) && tag.split(delimiter)[1] ? getTagColor(tag.split(delimiter)[1]) : 'gray'}
                    onClick={() => groupApps(tag)}
                    onMouseEnter={() => highlightApps(tag)}
                    onMouseLeave={unhighlightApps}
                  >
                    <TagLabel m={0}>{truncateStr(tag)}</TagLabel>
                    <TagCloseButton
                      m={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setTagToDelete(tag);
                        onOpen();
                      }}
                    />
                  </Tag>
                ))}
              </VStack>
            </Box>
          )}
        </Box>
      )}
      {isLoaded &&
        visibleTags.map((tag, index) => (
          <Tag
            id={`tag-${tag}`}
            size="sm"
            key={index}
            borderRadius="md"
            border="solid 2px"
            borderColor={tag.split(delimiter)[1] ? getTagColor(tag.split(delimiter)[1]) : 'gray'}
            variant="solid"
            cursor="pointer"
            fontSize="12px"
            color={groupTags.includes(tag) ? 'black' : 'white'}
            bgColor={groupTags.includes(tag) && tag.split(delimiter)[1] ? getTagColor(tag.split(delimiter)[1]) : 'gray'}
            onClick={() => groupApps(tag)}
            onMouseEnter={() => highlightApps(tag)}
            onMouseLeave={unhighlightApps}
          >
            <Tooltip
              placement="top"
              hasArrow={true}
              openDelay={400}
              maxWidth={'fit-content'}
              label={`Select all the applications with tag: ${tag}`}
            >
              <TagLabel m={0}>{truncateStr(tag)}</TagLabel>
            </Tooltip>
            <Tooltip
              placement="top"
              hasArrow={true}
              openDelay={400}
              maxWidth={'fit-content'}
              label={`Delete this tag in all applications: ${tag}`}
            >
              <TagCloseButton
                m={0}
                onClick={(e) => {
                  e.stopPropagation();
                  setTagToDelete(tag);
                  onOpen();
                }}
              />
            </Tooltip>
          </Tag>
        ))}

      {/* Delete tag confirmation modal */}
      <ConfirmModal
        isOpen={isOpen}
        onClose={onClose}
        onConfirm={handleDeleteTag}
        title="Delete this Tag"
        message="Are you sure you want to delete this tag from all apps?"
        cancelText="Cancel"
        confirmText="Delete"
        cancelColor="green"
        confirmColor="red"
        size="lg"
      />
    </VStack>
  );
}
