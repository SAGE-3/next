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

// Throttling a function
import { throttle } from 'throttle-debounce';

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
  const deleteApp = useAppStore((state) => state.delete);

  // The text of the sticky for React
  const [note, setNote] = useState(s.text);
  // Update local value with value from the server
  useEffect(() => { setNote(s.text); }, [s.text]);

  // Saving the board at most once every 1/4 sec.
  const throttleSave = throttle(250, (val) => {
    updateState(props.id, { text: val });
  });
  // Keep a copy of the function
  const throttleFunc = useRef(throttleSave);

  // callback for textarea change
  function handleTextChange(ev: React.ChangeEvent<HTMLTextAreaElement>) {
    const inputValue = ev.target.value;
    // Update the local value
    setNote(inputValue);
    // Call to update the SAGE3 state in throttled way
    throttleFunc.current(inputValue);
  }

  // delete the app
  function handleClose() {
    deleteApp(props.id);
  }

  // React component
  return (
    <div className="Note-Container">
      <h3>
        {props.name} - <button onClick={handleClose}>X</button>
      </h3>
      {/* text area use the local value */}
      <textarea value={note} onChange={handleTextChange} />
    </div>
  );
}

export default NoteApp;
