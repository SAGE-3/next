/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React, { useState, useRef, useEffect } from 'react';
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

  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = options.map((option, i) => (i === index ? value : option));
    setOptions(newOptions);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index === options.length - 1) {
        handleAddOption();
      }
    }
  };

  const handleSubmit = () => {
    if (question && options.every(option => option.trim() !== '')) {
      onSave(question, options);
      setQuestion('');
      setOptions(['']);
    }
  };

  return (
    <div>
      <Text className="mb-3 font-bold">
        Poll Question
      </Text>
      <input
        id="poll-question"
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Enter poll question"
        className="w-full p-2 focus:border-blue-500 focus:outline-none"
      />
      {options.map((option, index) => (
        <div key={index} className="mb-3 flex items-center gap-4 border-top">
          <Text className="nowrap whitespace-nowrap">
            Option {index + 1}
          </Text>
          <input
            ref={el => optionRefs.current[index] = el}
            id={`poll-option-${index}`}
            type="text"
            value={option}
            onChange={(e) => handleOptionChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyPress(e, index)}
            placeholder="Enter option"
            className="w-full p-2  focus:border-blue-500 focus:outline-none mr-2"
          />
          <Button colorScheme='red'
            onClick={() => handleRemoveOption(index)}
          >
            <MdOutlineDelete size={40} />
          </Button>
        </div>
      ))}
      <div className="flex justify-between border-top">
        <Button colorScheme='blue' onClick={handleAddOption}>
          Add Another Option
        </Button>
        <Button colorScheme='green' onClick={handleSubmit}>
          Create Poll
        </Button>
      </div>
    </div>
  );
};

export default NewPollForm;
