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
    <div className="modal-backdrop">
      <div className="modal">
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <Button colorScheme='green' className="modal-button confirm" onClick={onConfirm}>
            Confirm
          </Button>
          <Button colorScheme='red' className="modal-button cancel" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;