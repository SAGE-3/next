/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Text, Button } from '@chakra-ui/react';
import { MdOutlineDelete } from 'react-icons/md';

interface NewPollFormProps {
  onSave: (question: string, options: string[]) => void;
}

const NewPollForm: React.FC<NewPollFormProps> = ({ onSave }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['']);
  const optionRefs = useRef<(HTMLInputElement | null)[]>([]);

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
    <div>
      <Text className="poll-mb-3 poll-font-bold">Poll Question</Text>
      <input
        id="poll-question"
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Enter poll question"
        className="poll-input-text poll-w-full poll-p-2 poll-focus:border-blue-500 poll-focus:outline-none"
      />
      {options.map((option, index) => (
        <div key={index} className="poll-mb-3 poll-flex poll-items-center poll-gap-4 poll-border-top">
          <Text className="poll-nowrap whitespace-nowrap">Option {index + 1}</Text>
          <input
            ref={(el) => (optionRefs.current[index] = el)}
            id={`poll-option-${index}`}
            type="text"
            value={option}
            onChange={(e) => handleOptionChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyPress(e, index)}
            placeholder="Enter option"
            className="poll-input-text poll-w-full poll-p-2 poll-focus:border-blue-500 poll-focus:outline-none"
          />
          <Button colorScheme="red" onClick={() => handleRemoveOption(index)}>
            <MdOutlineDelete size={40} />
          </Button>
        </div>
      ))}
      <div className="poll-flex poll-justify-between poll-border-top">
        <Button colorScheme="blue" onClick={handleAddOption}>
          Add Another Option
        </Button>
        <Button colorScheme="green" onClick={handleSubmit} className={isEmpty ? 'poll-button-disabled' : ''}>
          Create Poll
        </Button>
      </div>
    </div>
  );
};

export default NewPollForm;
