/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React from 'react';

import { Button } from '@chakra-ui/react';

// Define the prop types for the ConfirmationModal
interface ConfirmationModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ message, onConfirm, onCancel }) => {
  return (
    <div className="poll-modal-backdrop">
      <div className="poll-modal">
        <p className="poll-modal-message">{message}</p>
        <div className="poll-modal-actions">
          <Button colorScheme="green" className="poll-modal-button poll-confirm" onClick={onConfirm}>
            Confirm
          </Button>
          <Button colorScheme="red" className="poll-modal-button poll-cancel" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
