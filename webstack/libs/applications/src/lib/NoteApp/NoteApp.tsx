/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// Import the React library
import { useState, useRef, useEffect } from 'react';

import { useAppStore } from '@sage3/frontend';
import { AppSchema } from '../schema';

import { state as AppState } from './';
import './styles.css';

// Debounce updates to the textarea
import { debounce } from 'throttle-debounce';

/**
 * NoteApp SAGE3 application
 *
 * @param {AppSchema} props
 * @returns {JSX.Element}
 */
function NoteApp(props: AppSchema): JSX.Element {
  // Get the data for this app from the props
  const s = props.state as AppState;
  // Update functions from the store
  const updateState = useAppStore((state) => state.updateState);

  // The text of the sticky for React
  const [note, setNote] = useState(s.text);

  // Update local value with value from the server
  useEffect(() => { setNote(s.text); }, [s.text]);

  // Saving the text after 1sec of inactivity
  const debounceSave = debounce(1000, (val) => {
    updateState(props.id, { text: val });
  });
  // Keep a copy of the function
  const debounceFunc = useRef(debounceSave);

  // callback for textarea change
  function handleTextChange(ev: React.ChangeEvent<HTMLTextAreaElement>) {
    const inputValue = ev.target.value;
    // Update the local value
    setNote(inputValue);
    // Update the text when not typing
    debounceFunc.current(inputValue);
  }


  // React component
  return (
    <div className="Note-Container">
      <h3>
        {props.name}
      </h3>
      <textarea value={note} onChange={handleTextChange} />
    </div>
  );
}

export default NoteApp;
