import React, { useEffect, useState } from 'react';
import { Box, Button, FormControl, Input } from '@chakra-ui/react';
import { App, AppState } from '../../../schema';
import Papa from 'papaparse';
import { apiUrls } from '@sage3/frontend';

type ChatProps = {
  children: React.ReactNode;
};

function Chat({ children }: ChatProps) {
  return <>{children}</>;
}

function AppComponent(props: App) {
  const roomId = props.data.roomId;
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

      const uploadRes = await fetch(apiUrls.assets.upload, {
        method: 'POST',
        body: fd,
      });
      const assetId = await uploadRes.json();

      console.log('assetId', assetId);
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

      <Button onClick={getAsset}>Test</Button>
    </Box>
  );
}

function ToolbarComponent(props: App) {
  return <Box>Toolbar</Box>;
}

Chat.AppComponent = AppComponent;
Chat.ToolbarComponent = ToolbarComponent;

export default Chat;
