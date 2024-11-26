/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useCallback } from 'react';

import { useAppStore } from '@sage3/frontend';

import { App } from '../../schema';
import { state as AppState } from './index';
import { NewPollForm, PollView } from './components';
import { usePollsStore } from './stores/pollStore';
import { AppWindow } from '../../components';
import { Box, useColorModeValue } from '@chakra-ui/react';

/* App component for poll */

function AppComponent(props: App): JSX.Element {
  const { poll } = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const pollStore = usePollsStore((state) => updateState(props._id, { poll: state }));

  const backgroundColor = useColorModeValue('white', 'gray.700');

  const handleSavePoll = useCallback(
    (question: string, options: string[]) => {
      pollStore.createPoll(question, options);
    },
    [poll, pollStore]
  );

  const updatePollQuestion = useCallback(
    (newQuestion: string) => {
      if (poll === null) {
        throw new Error('Failed to update poll question - Poll does not exist');
      }
      const updatedPoll = { ...poll, question: newQuestion };
      pollStore.updatePoll(updatedPoll);
    },
    [poll, pollStore]
  );

  const handleAddOption = useCallback(
    (option: string) => {
      poll && pollStore.addPollOption(poll, option);
    },
    [pollStore]
  );

  const handleUpVote = useCallback(
    (optionId: string) => {
      poll && pollStore.vote(poll, optionId);
    },
    [pollStore]
  );

  const handleDownVote = useCallback(
    (optionId: string) => {
      poll && pollStore.vote(poll, optionId, -1);
    },
    [pollStore]
  );

  return (
    <AppWindow app={props}>
      <Box height="100%" width="100%" background={backgroundColor}>
        {poll == null ? (
          <NewPollForm onSave={handleSavePoll} />
        ) : (
          <PollView
            _id={props._id}
            question={poll.question}
            options={poll.options}
            updatePollQuestion={updatePollQuestion}
            addNewOption={handleAddOption}
            onUpVote={handleUpVote}
            onDownVote={handleDownVote}
          />
        )}
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app poll */
function ToolbarComponent(): JSX.Element {
  return <></>;
}
/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = () => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
