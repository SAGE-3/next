import React, { useEffect, useState } from 'react';
import { Box, Button, FormControl, Input } from '@chakra-ui/react';
import { App, AppState } from '../../../schema';
import Papa from 'papaparse';
import { apiUrls, useAppStore } from '@sage3/frontend';
import { EChartsCoreOption } from 'echarts';
import { pickChart } from '../util/pickChart';
import * as articulate from '../api/articulate-llm';
import { CATEGORIES } from '../constants/constants';
import ThreeDimAreaChart from '../charts/ThreeDimAreaChart';

type ExperimentalProps = {
  children: React.ReactNode;
};

function Experimental({ children }: ExperimentalProps) {
  return <>{children}</>;
}

function AppComponent(props: App) {
  // get room id
  const roomId = props.data.roomId;
  // create app function
  const createApp = useAppStore((state) => state.create);

  const threeDAreaChartData = [
    ['x', 'y', 'z'],
    [12, 2, 4],
    [23, 55, 1],
    [7, 18, 30],
    [42, 11, 26],
    [15, 37, 6],
    [29, 8, 19],
    [35, 25, 14],
    [10, 45, 3],
    [20, 5, 33],
  ];

  return (
    <Box height="full" width="full" overflow="auto">
      <Box>Experimental</Box>
      <ThreeDimAreaChart data={threeDAreaChartData} />
    </Box>
  );
}

function ToolbarComponent(props: App) {
  return <Box>Toolbar</Box>;
}

Experimental.AppComponent = AppComponent;
Experimental.ToolbarComponent = ToolbarComponent;

export default Experimental;
