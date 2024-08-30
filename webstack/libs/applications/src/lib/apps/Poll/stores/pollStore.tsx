/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { PollData, PollOption } from '../index';

export const usePollsStore = function (updateStore: (state: PollData | null) => Promise<void>) {
  return useMemo(() => {
    return {
      updatePoll(newPoll: PollData | null): void {
        updateStore(newPoll);
      },
      createPoll(question: string, options: string[]): void {
        const newPoll = {
          question,
          options: options.map((option) => ({ id: uuidv4(), option, votes: 0 })),
        };
        updateStore(newPoll);
      },
      removePoll(): void {
        updateStore(null);
      },
      addPollOption(poll: PollData, optionText: string): void {
        const newOption: PollOption = { id: uuidv4(), option: optionText, votes: 0 };
        poll = { ...poll, options: [...poll.options, newOption] };
        updateStore(poll);
      },
      vote(poll: PollData, optionId: string, direction: number = 1): void {
        const targetIndex = poll.options.findIndex((option) => option.id === optionId);
        if (targetIndex === -1) {
          throw new Error('Option does not exist ');
        }
        const votes = poll.options[targetIndex].votes;
        const newOptions = [...poll.options];
        newOptions[targetIndex].votes += votes <= 0 ? 1 : direction;
        poll = { ...poll, options: newOptions };
        updateStore(poll);
      },
    };
  }, [updateStore]);
};
