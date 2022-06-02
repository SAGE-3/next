/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useAppStore } from '@sage3/frontend';
import { Applications } from '@sage3/applications/apps';
import { Button } from '@chakra-ui/react';

export function App() {
  const apps = useAppStore((state) => state.apps);

  const createApp = useAppStore((state) => state.create);

  function handleNoteClick() {
    createApp('Note', 'Note Description', '1', '1', 'Note', { text: 'Hello' });
  }

  function handleCounterClick() {
    createApp('Counter', 'Counter Description', '1', '1', 'Counter', { count: 5 });
  }

  function handleImageClick() {
    createApp('Image', 'Image Description', '1', '1', 'Image', {
      url: 'https://www.denofgeek.com/wp-content/uploads/2015/11/yoda-main.jpg?resize=620%2C349',
    });
  }

  function handleSliderClick() {
    createApp('Slider', 'Image Description', '1', '1', 'Slider', { value: 50 });
  }

  function handleLinkerClick() {
    createApp('Linker', 'Linker Description', '1', '1', 'Linker', { toAppId: '', toAppField: '', fromAppField: '', fromAppId: '' });
  }

  return (
    <div>
      <h1>SAGE3 Application Playground</h1>
      <Button onClick={handleNoteClick}>Note App</Button>
      <Button onClick={handleCounterClick}>Counter App</Button>
      <Button onClick={handleImageClick}>Image App</Button>
      <Button onClick={handleSliderClick}>Slider App</Button>
      <Button onClick={handleLinkerClick}>Linker App</Button>
      <hr />
      {apps.map((app) => {
        const Component = Applications[app.type];
        return (
          <div key={app.id} style={{ margin: 3 }}>
            <Component key={app.id} {...app}></Component>
          </div>
        );
      })}
    </div>
  );
}

export default App;
