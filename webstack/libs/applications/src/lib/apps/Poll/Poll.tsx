/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState, useCallback } from 'react';
import { Button } from '@chakra-ui/react';

import { useAppStore } from '@sage3/frontend';

import { App } from '../../schema';
import { state as AppState } from './index';
import NewPollForm from './components/NewPollForm.react';
import PollView from './components/PollView.react';
import ConfirmationModal from './components/ConfirmationModal.react';
import { usePollsStore } from './stores/pollStore';
import { AppWindow } from '../../components';

// Styling
import './styling.css';

/* App component for poll */

function AppComponent(props: App): JSX.Element {
  const { poll } = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const pollStore = usePollsStore((state) => updateState(props._id, { poll: state }));

  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [shouldRemovePoll, setShouldRemovePoll] = useState<boolean>(false);

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

  const handleRemovePoll = useCallback(() => {
    setShouldRemovePoll(true);
    setIsRemoveModalOpen(true);
  }, []);

  const confirmRemovePoll = useCallback(() => {
    if (shouldRemovePoll) {
      pollStore.removePoll();
      setShouldRemovePoll(false);
    }
    setIsRemoveModalOpen(false);
  }, [shouldRemovePoll, pollStore]);

  const cancelRemovePoll = useCallback(() => {
    setShouldRemovePoll(false);
    setIsRemoveModalOpen(false);
  }, []);

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
      <div className="poll-container poll-mx-auto poll-p-4 poll-overflow-y-auto poll-h-max">
        {poll == null ? (
          <NewPollForm onSave={handleSavePoll} />
        ) : (
          <>
            <PollView
              question={poll.question}
              options={poll.options}
              updatePollQuestion={updatePollQuestion}
              addNewOption={handleAddOption}
              onUpVote={handleUpVote}
              onDownVote={handleDownVote}
            />
            <Button colorScheme="red" onClick={() => handleRemovePoll()}>
              Clear Poll
            </Button>
          </>
        )}

        {isRemoveModalOpen && (
          <ConfirmationModal
            onConfirm={confirmRemovePoll}
            onCancel={cancelRemovePoll}
            message="Are you sure you want to clear this poll?"
          />
        )}
      </div>
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
