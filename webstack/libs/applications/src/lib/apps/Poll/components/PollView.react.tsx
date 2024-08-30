/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React, { useState } from 'react';
import { Button } from '@chakra-ui/react';
import { MdEdit, MdSave } from 'react-icons/md';

import { PollOption } from '../index';

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

  const maxValue = Math.max(...options.map((opt) => opt.votes), 0);
  return (
    <div className="poll-p-4 poll-border poll-rounded poll-shadow-sm poll-mb-4">
      <div className="poll-grid-container">
        {editMode ? (
          <input
            type="text"
            className="poll-p-2 poll-border poll-rounded"
            value={editedQuestion}
            onChange={(e) => setEditedQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuestionEdit()}
          />
        ) : (
          <h2 className="poll-text-lg poll-font-bold">{question}</h2>
        )}
        <Button colorScheme="green" onClick={handleQuestionEdit}>
          {editMode ? <MdSave size={20} /> : <MdEdit size={20} />}
        </Button>
      </div>

      <ul className="poll-mt-4">
        {options.map((option) => (
          <li key={option.id} className="poll-mb-3 poll-flex poll-items-center poll-gap-4 poll-border-top">
            <span className="poll-option-text">{option.option}</span>
            <div className="poll-w-full poll-h-4 poll-bg-gray-200 poll-rounded poll-progress-bar">
              <div
                className="poll-h-4 poll-bg-blue-500 poll-rounded"
                style={{ width: `${option.votes <= 0 ? 0 : (option.votes / maxValue) * 100}%` }}
              />
            </div>
            <div>{option.votes}</div>
            {!votes[option.id] ? (
              <Button className="poll-w-100" colorScheme="blue" onClick={() => handleVote(option.id)}>
                Vote
              </Button>
            ) : (
              <Button className="poll-w-100" colorScheme="red" onClick={() => removeVote(option.id)}>
                Undo
              </Button>
            )}
          </li>
        ))}
        <li className="poll-mb-3 poll-flex poll-items-center poll-gap-4 poll-border-top">
          <input
            type="text"
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddOption(newOption)}
            placeholder="New option"
            className="poll-input-text"
          />
          <Button
            colorScheme="green"
            onClick={() => handleAddOption(newOption)}
            className={newOption.trim().length === 0 ? 'poll-button-disabled' : ''}
          >
            Add
          </Button>
        </li>
      </ul>
    </div>
  );
};

export default PollView;
