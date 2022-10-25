/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * Hot keys react hook based on NPM 'hotkeys-js' module
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import hotkeys, { HotkeysEvent, KeyHandler } from 'hotkeys-js';

// Import Chakra UI elements
import {
  Input,
  InputGroup,
  // Chakra Modal dialog
  Modal,
  ModalOverlay,
  ModalContent,
  useDisclosure,
  VStack,
  Button,
} from '@chakra-ui/react';
import { MdApps } from 'react-icons/md';

export type { HotkeysEvent } from 'hotkeys-js';

export type HotkeysOptions = {
  scope?: string;
  element?: HTMLElement;
  keyup?: boolean;
  keydown?: boolean;
  splitKey?: string;
  dependencies?: any[];
};

/**
 * Hook for using key shortcuts
 *
 * @export
 * @template T
 * @param {string} keys
 * @param {KeyHandler} callback
 * @returns {(React.MutableRefObject<T | null>)}
 */
export function useHotkeys<T extends Element>(
  keys: string,
  callback: KeyHandler,
  options?: HotkeysOptions
): React.MutableRefObject<T | null> {
  const ref = useRef<T | null>(null);
  const dep = options?.dependencies;
  delete options?.dependencies;

  // The return value of this callback determines if the browsers default behavior is prevented.
  const memoisedCallback = useCallback(
    (keyboardEvent: KeyboardEvent, hotkeysEvent: HotkeysEvent) => {
      if (ref.current === null || document.activeElement === ref.current) {
        callback(keyboardEvent, hotkeysEvent);
        return true;
      }
      return false;
    },
    [ref, dep]
  );

  useEffect(() => {
    const opt = options ? options : {};
    hotkeys(keys, opt, memoisedCallback);

    return () => hotkeys.unbind(keys, memoisedCallback);
  }, [memoisedCallback, keys, dep]);

  return ref;
}

/**
 * Props for the file manager modal behavior
 * from Chakra UI Modal dialog
 */
type AlfredProps = {
  onAction: (command: string) => void;
};

/**
 * React component to get and display the asset list
 */
function Alfred({ onAction }: AlfredProps): JSX.Element {
  // Element to set the focus to when opening the dialog
  const initialRef = React.useRef<HTMLInputElement>(null);
  const [term, setTerm] = useState<string>();
  const { isOpen, onOpen, onClose } = useDisclosure({ id: 'alfred' });

  useHotkeys('cmd+k,ctrl+k', (ke: KeyboardEvent, he: HotkeysEvent): void | boolean => {
    // Open the window
    onOpen();
    // Returning false stops the event and prevents default browser events
    return false;
  });

  // Select the file when clicked
  const handleChange = (event: React.FormEvent<HTMLInputElement>) => {
    event.preventDefault();
    const val = event.currentTarget.value;
    if (val) {
      // Set the value, trimming spaces at begining and end
      setTerm(val.trim());
    }
  };

  // Keyboard handler: press enter to activate command
  const onSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onClose();
      if (term) {
        onAction(term);
      }
    }
  };
  // Keyboard handler: press enter to activate command
  const onButton = (e: React.MouseEvent) => {
    onClose();
    const text = e.currentTarget.textContent || '';
    onAction('app ' + text);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" isCentered initialFocusRef={initialRef} blockScrollOnMount={false}>
      <ModalOverlay />
      <ModalContent h={'265px'}>
        {/* Search box */}
        <InputGroup>
          <Input
            ref={initialRef}
            placeholder="Command..."
            _placeholder={{ opacity: 1, color: 'gray.600' }}
            m={2}
            p={2}
            focusBorderColor="gray.500"
            fontSize="xl"
            onChange={handleChange}
            onKeyDown={onSubmit}
          />
        </InputGroup>
        <VStack m={1} p={1}>
          {/* <Button onClick={onButton} justifyContent="flex-start" leftIcon={<MdApps />} width={'100%'} variant="outline">
            CodeCell
          </Button>
          <Button onClick={onButton} justifyContent="flex-start" leftIcon={<MdApps />} width={'100%'} variant="outline">
            Screenshare
          </Button> */}
          <Button onClick={onButton} justifyContent="flex-start" leftIcon={<MdApps />} width={'100%'} variant="outline">
            Stickie
          </Button>
          <Button onClick={onButton} justifyContent="flex-start" leftIcon={<MdApps />} width={'100%'} variant="outline">
            Webview
          </Button>
        </VStack>
      </ModalContent>
    </Modal>
  );
}

export const AlfredComponent = React.memo(Alfred);
