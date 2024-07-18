import React from 'react';
import { useEffect, useState } from 'react';
import { Box } from '@chakra-ui/react';
import { App, AppState } from '../../../schema';
import Chart from '../echarts/Chart';
import { charts, ChartType } from '../util/charts';
import Papa from 'papaparse';
import { apiUrls } from '@sage3/frontend';
import { EChartsCoreOption } from 'echarts';

type ChartVisualizerProps = {
  children: React.ReactNode;
};

function ChartVisualizer({ children }: ChartVisualizerProps) {
  return <>{children}</>;
}

function AppComponent(props: App) {
  const s = props.data.state;
  const [data, setData] = useState<any[] | null>(null);

  console.log('s', s);

  async function getAsset() {
    try {
      const assetRes = await fetch(apiUrls.assets.getAssetById(s.fileId));

      if (!assetRes.ok) {
        throw new Error('Failed to fetch asset');
      }

      const asset = await assetRes.text();

      Papa.parse(asset, {
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log('results from ChartVisualizer', results);
          setData(results.data);
        },
      });
    } catch (error) {
      console.error('error', error);
    }
  }

  useEffect(() => {
    if (!data || !s.fileId || !s.chartSpecs) {
      console.log('fileId', s.fileId);
      console.log('chartSpecs', s.chartSpecs);
      console.log('rerendering');
      getAsset();
    }
  }, []);

  console.log('data', data);

  return s.chartSpecs && s.fileId && data ? (
    <Box width="full" height="full" overflow="auto">
      <Box height="80%">
        <Chart
          option={
            charts[s.chartSpecs.chartType as ChartType].generateOption({
              data,
              visualizationElements: s.chartSpecs.visualizationElements,
            }) as EChartsCoreOption
          }
        />
      </Box>
      <Box padding="3">{s.chartSpecs.explanation}</Box>
    </Box>
  ) : (
    <Box>Invalid chart </Box>
  );
}

function ToolbarComponent(props: App) {
  return <Box>Toolbar</Box>;
}

ChartVisualizer.AppComponent = AppComponent;
ChartVisualizer.ToolbarComponent = ToolbarComponent;

export default ChartVisualizer;
