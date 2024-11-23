/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React, { useState } from 'react';
import { Box, Button, Divider, IconButton, Input, Progress, Text, useColorModeValue, useDisclosure } from '@chakra-ui/react';
import { MdAdd, MdEdit, MdRemove, MdSave } from 'react-icons/md';

import { PollOption } from '../index';
import { ConfirmModal, useAppStore } from '@sage3/frontend';
import { usePollsStore } from '../stores/pollStore';

interface PollProps {
  _id: string;
  question: string;
  options: PollOption[];
  updatePollQuestion: (newQuestion: string) => void;
  addNewOption: (newOption: string) => void;
  onUpVote: (optionId: string) => void;
  onDownVote: (optionId: string) => void;
}

export const PollView: React.FC<PollProps> = ({ _id, question, options, updatePollQuestion, onUpVote, onDownVote, addNewOption }) => {
  const [editMode, setEditMode] = useState(false);
  const [editedQuestion, setEditedQuestion] = useState(question);
  const [votes, setVotes] = useState<Record<string, boolean>>({});
  const [newOption, setNewOption] = useState<string>('');
  const { isOpen, onOpen, onClose } = useDisclosure();

  const updateState = useAppStore((state) => state.updateState);
  const pollStore = usePollsStore((state) => updateState(_id, { poll: state }));
  const inputtextcolor = useColorModeValue('black', 'white');

  const confirmRemovePoll = () => {
    pollStore.removePoll();
    onClose();
  };

  const cancelRemovePoll = () => {
    onClose();
  };

  const handleVote = (optionId: string) => {
    onUpVote(optionId);
    setVotes((prev) => ({ ...prev, [optionId]: true }));
  };

  const removeVote = (optionId: string) => {
    onDownVote(optionId);
    setVotes((prev) => ({ ...prev, [optionId]: false }));
  };

  const handleQuestionEdit = () => {
    if (editMode && editedQuestion !== question) {
      updatePollQuestion(editedQuestion);
    }
    setEditMode(!editMode);
  };

  const handleAddOption = (optionText: string) => {
    addNewOption(optionText);
    setNewOption('');
  };

  // Get the number of total votes
  const maxValue = options.reduce((acc, option) => acc + option.votes, 0);
  return (
    <Box p="4" display="flex" flexDir="column" gap="4">
      <ConfirmModal
        isOpen={isOpen}
        onConfirm={confirmRemovePoll}
        onClose={cancelRemovePoll}
        title="Clear Poll"
        message="Are you sure you want to clear this poll?"
      />
      <Text fontSize="2xl" mb="0" fontWeight={'bold'}>
        Poll Question
      </Text>
      <Box display="flex" justifyItems={'space-between'} alignItems={'center'} gap="2" whiteSpace={'none'} textOverflow="ellipsis" ml="2">
        {editMode ? (
          <Input
            type="text"
            value={editedQuestion}
            width="100%"
            onChange={(e) => setEditedQuestion(e.target.value)}
            _placeholder={{ color: inputtextcolor }}
            onKeyDown={(e) => e.key === 'Enter' && handleQuestionEdit()}
          />
        ) : (
          <Box overflow="hidden" textOverflow="ellipsis" whiteSpace="wrap" w="100%">
            <Text fontSize="xl">{question}?</Text>
          </Box>
        )}
        <IconButton
          icon={editMode ? <MdSave /> : <MdEdit />}
          colorScheme="green"
          variant={'solid'}
          onClick={handleQuestionEdit}
          aria-label={''}
          size="md"
          ml="2"
        />
      </Box>
      <Text fontSize="lg" mb="0" fontWeight={'bold'}>
        Options
      </Text>
      <Box display="flex" flexDir="column" gap="2">
        {options.map((option) => (
          <Box display="flex" key={option.id} pt="1" pb="2" borderRadius="md" alignItems="center" gap="1">
            <Box mx={2}>
              {!votes[option.id] ? (
                <IconButton icon={<MdAdd />} variant="solid" colorScheme="blue" onClick={() => handleVote(option.id)} aria-label="vote" />
              ) : (
                <IconButton
                  icon={<MdRemove />}
                  variant="solid"
                  colorScheme="red"
                  onClick={() => removeVote(option.id)}
                  aria-label="undo-vote"
                />
              )}
            </Box>
            <Box display="flex" flexDir="column" gap="2" flex="1" minWidth="0">
              <Box overflow="hidden" textOverflow="ellipsis" whiteSpace="normal" wordBreak="break-word" width="100%">
                <Text fontSize="md">{option.option}</Text>
              </Box>
              <Box width="100%">
                <Progress value={option.votes <= 0 ? 0 : (option.votes / maxValue) * 100} borderRadius="md" />
              </Box>
            </Box>
            <Box
              ml="2"
              textAlign="end"
              alignItems={'end'}
              justifyContent={'center'}
              display="flex"
              borderRadius="md"
              width="24px"
              height="45px"
            >
              <Text fontSize="xl">{option.votes}</Text>
            </Box>
          </Box>
        ))}

        <Divider my="2" />
        <Text fontSize="md" mb="0" fontWeight={'bold'}>
          Add Option
        </Text>
        <Box display="flex" gap="3">
          <Input
            type="text"
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddOption(newOption)}
            _placeholder={{ color: inputtextcolor }}
            placeholder="New option"
          />
          <IconButton
            colorScheme="green"
            icon={<MdAdd />}
            variant={'solid'}
            onClick={() => handleAddOption(newOption)}
            aria-label={'add-option'}
          />
        </Box>
      </Box>
      <Divider />
      <Button colorScheme="red" size="sm" variant="solid" onClick={onOpen}>
        Clear Poll
      </Button>
    </Box>
  );
};
