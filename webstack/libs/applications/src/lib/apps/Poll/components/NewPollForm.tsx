/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Text, Button, Box, Input, IconButton, useColorModeValue, Divider } from '@chakra-ui/react';
import { MdClose } from 'react-icons/md';

interface NewPollFormProps {
  onSave: (question: string, options: string[]) => void;
}

export const NewPollForm: React.FC<NewPollFormProps> = ({ onSave }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['']);
  const optionRefs = useRef<(HTMLInputElement | null)[]>([]);

  const inputtextcolor = useColorModeValue('black', 'white');

  useEffect(() => {
    optionRefs.current = optionRefs.current.slice(0, options.length);
  }, [options]);

  useEffect(() => {
    optionRefs.current[options.length - 1]?.focus();
  }, [options.length]);

  const handleAddOption = useCallback(() => {
    setOptions([...options, '']);
  }, [options]);

  const handleRemoveOption = useCallback(
    (index: number) => {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    },
    [options]
  );

  const handleOptionChange = useCallback(
    (index: number, value: string) => {
      const newOptions = options.map((option, i) => (i === index ? value : option));
      setOptions(newOptions);
    },
    [options]
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (index === options.length - 1) {
          handleAddOption();
        }
      }
    },
    [handleAddOption, options]
  );

  const isEmpty = useMemo(() => question.trim() === '' || options.every((option) => option.trim() === ''), [question, options]);
  const handleSubmit = useCallback(() => {
    if (!isEmpty) {
      onSave(question, options);
      setQuestion('');
      setOptions(['']);
    }
  }, [onSave, question, options, isEmpty]);

  return (
    <Box p="4" display="flex" flexDir="column" gap="4">
      <Box display="flex" flexDir="column" gap="1">
        <Text fontSize="xl" fontWeight={'bold'}>
          Question
        </Text>
        <Input
          type="text"
          size="md"
          _placeholder={{ color: inputtextcolor }}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Enter poll question"
        />
      </Box>
      <Box display="flex" flexDir="column" gap="1">
        <Divider />
        <Text fontSize="md" mb="0" fontWeight={'bold'}>
          Options
        </Text>
      </Box>
      {options.map((option, index) => (
        <Box key={index} display="flex" alignItems={'center'} gap="3">
          <Text fontSize="lg">{index + 1}</Text>
          <Input
            ref={(el) => (optionRefs.current[index] = el)}
            id={`poll-option-${index}`}
            type="text"
            size="sm"
            value={option}
            onChange={(e) => handleOptionChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyPress(e, index)}
            placeholder="Enter option"
            _placeholder={{ color: inputtextcolor }}
          />
          <IconButton
            icon={<MdClose />}
            colorScheme="red"
            size="sm"
            variant={'solid'}
            onClick={() => handleRemoveOption(index)}
            aria-label={'delete-option'}
          ></IconButton>
        </Box>
      ))}
      <Button colorScheme="blue" size="sm" variant="solid" onClick={handleAddOption}>
        Add Option
      </Button>
      <Divider />
      <Button colorScheme="green" size="sm" variant="solid" onClick={handleSubmit} isDisabled={isEmpty}>
        Create Poll
      </Button>
    </Box>
  );
};
