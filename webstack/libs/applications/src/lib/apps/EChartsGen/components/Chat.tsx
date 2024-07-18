import React, { useEffect, useState } from 'react';
import { Box, Button, FormControl, Input } from '@chakra-ui/react';
import { App, AppState } from '../../../schema';
import Papa from 'papaparse';
import { apiUrls, useAppStore } from '@sage3/frontend';
import { CATEGORIES } from '../constants/constants';

type ChatProps = {
  children: React.ReactNode;
};

function Chat({ children }: ChatProps) {
  return <>{children}</>;
}

function AppComponent(props: App) {
  // get room id
  const roomId = props.data.roomId;
  // create app function
  const createApp = useAppStore((state) => state.create);

  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<(string | number)[][] | null>(null);

  async function handleFileRead(e: React.ChangeEvent<HTMLInputElement>) {
    console.log('uploading file');

    if (!e.target.files) {
      return;
    }

    const file = e.target.files[0];

    setFile(file);

    Papa.parse(file, {
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log('results', results);
        setFileData(results.data as (string | number)[][]);
      },
    });
  }

  async function handleSubmit(e: any) {
    try {
      e.preventDefault();
      const prompt = e.target.prompt.value;

      console.log('prompt', prompt);

      const fd = new FormData();
      fd.append('files', file as File);
      fd.append('room', roomId);

      // upload file
      const uploadRes = await fetch(apiUrls.assets.upload, {
        method: 'POST',
        body: fd,
      });
      const assetInfo = await uploadRes.json();
      console.log('uploaded file>', assetInfo[0].filename);

      // query ai
      const query = {
        prompt: prompt,
        data: fileData?.slice(0, 2), // only send the first two rows which include headers and part of the data
      };
      const res = await fetch(apiUrls.aiChart.query, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(query),
      });

      const gptAnswer = await res.json();
      console.log('response', JSON.parse(gptAnswer.response));

      // TODO: use zod to very schema

      const appState: AppState = {
        fileId: assetInfo[0].filename,
        chartSpecs: JSON.parse(gptAnswer.response),
      };

      createApp({
        title: 'EChartsGen',
        roomId: roomId,
        boardId: props.data.boardId,
        position: {
          x: props.data.position.x + props.data.size.width,
          y: props.data.position.y,
          z: 0,
        },
        size: {
          width: 800,
          height: 800,
          depth: 0,
        },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'EChartsGen',
        state: {
          appType: CATEGORIES.CHART,
          ...appState,
        },
        raised: true,
        dragging: false,
        pinned: false,
      });
    } catch (error) {
      console.error('error', error);
    }
  }
  async function getAsset() {
    try {
      const assetRes = await fetch(apiUrls.assets.getAssetById('3b7dd687-dcf7-4ab2-840f-552d1c0e802e.csv'));

      const asset = await assetRes.text();

      Papa.parse(asset, {
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log('results from get asset', results);
        },
      });
    } catch (error) {
      console.error('error', error);
    }
  }

  return (
    <Box height="full" width="full">
      <Box>Chat</Box>
      <Box width="full">
        <form onSubmit={handleSubmit}>
          <Input type="file" onChange={handleFileRead} />
          <Input name="prompt" type="text" placeholder="ask a question" />
          <Button type="submit">Submit</Button>
        </form>
      </Box>
    </Box>
  );
}

function ToolbarComponent(props: App) {
  return <Box>Toolbar</Box>;
}

Chat.AppComponent = AppComponent;
Chat.ToolbarComponent = ToolbarComponent;

export default Chat;
