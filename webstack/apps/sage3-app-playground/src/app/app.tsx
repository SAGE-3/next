import { Applications, useAppStore } from '@sage3/frontend';
import React from 'react';


export function App() {
  const apps = useAppStore(state => state.apps)

  const createApp = useAppStore(state => state.createApp);

  function handleNoteClick() {
    createApp('Note', 'Note Description', '1', '1', 'Note', { text: 'Hello' })
  }

  function handleCounterClick() {
    createApp('Counter', 'Counter Description', '1', '1', 'Counter', { count: 5 })
  }

  function handleImageClick() {
    createApp('Image', 'Image Description', '1', '1', 'Image', { url: "https://www.denofgeek.com/wp-content/uploads/2015/11/yoda-main.jpg?resize=620%2C349" })
  }

  function handleSliderClick() {
    createApp('Slider', 'Image Description', '1', '1', 'Slider', { value: 50 })
  }

  function handleLinkerClick() {
    createApp('Linker', 'Linker Description', '1', '1', 'Linker', { toAppId: '', toAppField: '', fromAppField: '', fromAppId: '' })
  }

  return (
    <div>

      <h1>SAGE3 Application Playground</h1>
      <button onClick={handleNoteClick}>Note App</button>
      <button onClick={handleCounterClick}>Counter App</button>
      <button onClick={handleImageClick}>Image App</button>
      <button onClick={handleSliderClick}>Slider App</button>
      <button onClick={handleLinkerClick}>Linker App</button>
      <hr />
      {
        apps.map(app => {
          const Component = Applications[app.type];
          return (
            <div key={app.id} style={{ margin: 3 }}>
              <Component key={app.id} {...app}></Component>
            </div>
          )
        })
      }

    </div>
  );
}

export default App;
