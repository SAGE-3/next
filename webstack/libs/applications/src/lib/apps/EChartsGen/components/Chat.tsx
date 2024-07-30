import React, { useEffect, useState } from 'react';
import { Box, Button, FormControl, Input } from '@chakra-ui/react';
import { App, AppState } from '../../../schema';
import Papa from 'papaparse';
import { apiUrls, useAppStore } from '@sage3/frontend';
import { EChartsCoreOption } from 'echarts';
import { pickChart } from '../util/pickChart';
import * as articulate from '../api/articulate-llm';
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
    console.log('e.target.files', e.target.files);
    if (!e.target.files || e.target.files.length === 0) {
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

  async function uploadFileToSage(file: File) {
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

    const fileId = assetInfo[0].filename;
    return fileId;
  }

  // async function handleSubmit(e: any) {
  //   try {
  //     e.preventDefault();
  //     const prompt = e.target.prompt.value;

  //     console.log('prompt', prompt);

  //     const fd = new FormData();
  //     fd.append('files', file as File);
  //     fd.append('room', roomId);

  //     // upload file
  //     const uploadRes = await fetch(apiUrls.assets.upload, {
  //       method: 'POST',
  //       body: fd,
  //     });
  //     const assetInfo = await uploadRes.json();
  //     console.log('uploaded file>', assetInfo[0].filename);

  //     // query ai
  //     const query = {
  //       prompt: prompt,
  //       data: fileData?.slice(0, 2), // only send the first two rows which include headers and part of the data
  //     };
  //     const res = await fetch(apiUrls.aiChart.query, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify(query),
  //     });

  //     if (!res.ok) throw new Error('Unable to generate chart.');

  //     const gptAnswer = await res.json();
  //     console.log('response', JSON.parse(gptAnswer.response));

  //     // TODO: use zod to very schema

  //     const appState: AppState = {
  //       fileId: assetInfo[0].filename,
  //       chartSpecs: JSON.parse(gptAnswer.response),
  //     };

  //     createApp({
  //       title: 'EChartsGen',
  //       roomId: roomId,
  //       boardId: props.data.boardId,
  //       position: {
  //         x: props.data.position.x + props.data.size.width,
  //         y: props.data.position.y,
  //         z: 0,
  //       },
  //       size: {
  //         width: 800,
  //         height: 800,
  //         depth: 0,
  //       },
  //       rotation: { x: 0, y: 0, z: 0 },
  //       type: 'EChartsGen',
  //       state: {
  //         appType: CATEGORIES.CHART,
  //         ...appState,
  //       },
  //       raised: true,
  //       dragging: false,
  //       pinned: false,
  //     });
  //   } catch (error) {
  //     console.error('error', error);
  //   }
  // }

  // Articulate Endpoint
  async function handleSubmit(e: any) {
    try {
      e.preventDefault();
      // setOption(null);
      // setMd(null);
      // setArticulateData(null);

      // Upload file
      const formData = new FormData();
      formData.append('file', file as File);
      const uploadedCsvRes = await articulate.uploadCsv(formData);
      if (!uploadedCsvRes.success) throw new Error('Failed to upload CSV');
      const csvId = uploadedCsvRes.data.csvId;

      // Send query
      const body = {
        prompt: e.target.prompt.value as string,
        dataset: csvId as string,
        skip: false,
      };
      const res = await articulate.sendPrompt(body);
      if (!res.success) throw new Error('Failed to generate chart');
      const chartInfo = res.data;

      // Upload resulting chart to Sage
      const transformedCsv = await articulate.getTransformedCsv(chartInfo.charts[0].csvId);
      if (!transformedCsv.success) throw new Error('Failed to fetch transformed CSV');

      // Get the file id to upload to Sage for persistence
      const transformedCsvFileIdRes = await uploadFileToSage(
        new Blob([transformedCsv.data as string], { type: 'text/csv;charset=utf-8;' }) as File
      );
      const transformedCsvFileId = await transformedCsvFileIdRes;

      // Make a chart
      const initChartSpecs = {
        chartType: chartInfo.charts[0].chartType,
        visualizationElements: chartInfo.charts[0].visualizationElements ?? null,
        attributes: chartInfo.charts[0].attributes[0] ?? null,
      };

      const appState: AppState = {
        fileId: transformedCsvFileId ?? null,
        chartSpecs: initChartSpecs,
        model: 'articulate-llm',
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

  return (
    <Box height="full" width="full">
      <Box>Chat</Box>
      <Box width="full">
        <form onSubmit={handleSubmit}>
          <Input type="file" onChange={handleFileRead} />
          <Input name="prompt" autoComplete="off" type="text" placeholder="ask a question" />
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
