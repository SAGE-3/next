/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React, { useState } from 'react';
import { PollOption } from '../index';
import { MdEdit, MdSave  } from 'react-icons/md';
import { Button } from '@chakra-ui/react';

interface PollProps {
  question: string;
  options: PollOption[];
  updatePollQuestion: (newQuestion: string) => void;
  addNewOption: (newOption: string) => void;
  onUpVote: (optionId: string) => void;
  onDownVote: (optionId: string) => void;
}

const PollView: React.FC<PollProps> = ({ question, options, updatePollQuestion, onUpVote, onDownVote, addNewOption }) => {
  const [editMode, setEditMode] = useState(false);
  const [editedQuestion, setEditedQuestion] = useState(question);
  const [votes, setVotes] = useState<Record<string, boolean>>({});
  const [newOption, setNewOption] = useState<string>('');

  const handleVote = (optionId: string) => {
    onUpVote(optionId);
    setVotes(prev => ({ ...prev, [optionId]: true }));
  };

  const removeVote = (optionId: string) => {
    onDownVote(optionId);
    setVotes(prev => ({ ...prev, [optionId]: false }));
  };

  const handleQuestionEdit = () => {
    if (editMode && editedQuestion !== question) {
      updatePollQuestion(editedQuestion);
    }
    setEditMode(!editMode);
  };

  const handleAddOption = (optionText: string) => {
    addNewOption(optionText);
    setNewOption("");
  };

  const maxValue = Math.max(...options.map((opt) => opt.votes), 0);
  return (
    <div className="p-4 border rounded shadow-sm mb-4">
      <div className="grid-container">
        {editMode ? (
          <input
            type="text"
            className="p-2 border rounded"
            value={editedQuestion}
            onChange={(e) => setEditedQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuestionEdit()}
          />
        ) : (
          <h2 className="text-lg font-bold">{question}</h2>
        )}
        <Button  colorScheme='green' onClick={handleQuestionEdit}>
          {editMode ? <MdSave size={20} /> : <MdEdit size={20} />}
        </Button>
      </div>

      <ul className="mt-4">
        {options.map((option) => (
          <li key={option.id} className="poll-list border-top">
            <span className="option-text">{option.option}</span>
            <div className="w-full h-4 bg-gray-200 rounded progress-bar">
              <div className="h-4 bg-blue-500 rounded" style={{ width: `${option.votes <= 0 ? 0 : (option.votes / maxValue) * 100}%` }} />
            </div>
            <div>{option.votes}</div>
            {!votes[option.id] ? (
              <Button className='w-100' colorScheme="blue" onClick={() => handleVote(option.id)} >
                Vote
              </Button>
            ) : (
              <Button className='w-100' colorScheme="red" onClick={() => removeVote(option.id)} >
                Undo
              </Button>
            )}
          </li>
        ))}
        <li className="flex justify-between border-top">
          <input 
            type="text" 
            value={newOption} 
            onChange={(e) => setNewOption(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleAddOption(newOption)}
            placeholder="New option"
          />
          <Button 
            colorScheme="green"
            onClick={() => handleAddOption(newOption)} 
            disabled={newOption.trim().length === 0}
          >
            Add
          </Button>
        </li>
      </ul>
    </div>
  );
};

export default PollView;
