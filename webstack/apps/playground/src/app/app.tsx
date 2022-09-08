/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useAppStore } from '@sage3/frontend';
import { Applications } from '@sage3/applications/apps';
import { initialValues } from '@sage3/applications/initialValues';
import { Box, Button, Select } from '@chakra-ui/react';
import { AppName } from '@sage3/applications/schema';
import { DraggableData, Rnd } from 'react-rnd';
import { useState } from 'react';

export function App() {
  const apps = useAppStore((state) => state.apps);

  const createApp = useAppStore((state) => state.create);
  // Board current position
  const [boardPos, setBoardPos] = useState({ x: 0, y: 0 });

  // On a drag stop of the board. Set the board position locally.
  function handleDragBoardStop(event: any, data: DraggableData) {
    setBoardPos({ x: -data.x, y: -data.y });
  }

  const handleNewApp = (event: React.ChangeEvent<HTMLSelectElement>) => {
    // Check if value is corretly set
    const appName = event.target.value as AppName;
    if (!appName) return;

    // Default width and height
    const width = 300;
    const height = 300;
    // Cacluate X and Y of app based on the current board position and the width and height of the viewport
    const x = Math.floor(boardPos.x + window.innerWidth / 2 - width / 2);
    const y = Math.floor(boardPos.y + window.innerHeight / 2 - height / 2);
    // Create the new app
    createApp({
      name: appName,
      description: `${appName} - Description`,
      roomId: '1234',
      boardId: '1234',
      position: { x, y, z: 0 },
      size: { width, height, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: appName,
      ownerId: '1234',
      state: initialValues[appName] as any,
      minimized: false,
      raised: true

    });
  };

  return (
    <div>
      <h1>SAGE3 Application Playground</h1>

      <hr />
      <Rnd
        default={{
          x: 0,
          y: 0,
          width: 5000,
          height: 5000,
        }}
        onDragStop={handleDragBoardStop}
        enableResizing={false}
        dragHandleClassName={'board-handle'}
      >
        {apps.map((app) => {
          const Component = Applications[app.data.type].AppComponent;
          return <Component key={app._id} {...app}></Component>;
        })}

        {/* Draggable Background */}
        <Box
          className="board-handle"
          width={5000}
          height={5000}
          backgroundSize={`50px 50px`}
          backgroundImage={`linear-gradient(to right, grey 1px, transparent 1px),
            linear-gradient(to bottom, grey 1px, transparent 1px);`}
        />
      </Rnd>

      <Select
        colorScheme="green"
        width="200px"
        mx="1"
        background="darkgray"
        placeholder="Open Application"
        onChange={handleNewApp}
        value={0}
      >
        {Object.keys(Applications).map((appName) => (
          <option key={appName} value={appName}>
            {appName}
          </option>
        ))}
      </Select>
    </div>
  );
}

export default App;
