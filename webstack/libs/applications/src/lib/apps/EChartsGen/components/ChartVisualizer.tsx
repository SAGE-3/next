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
  const [data, setData] = useState<any[]>([]);

  async function getAsset() {
    try {
      const assetRes = await fetch(apiUrls.assets.getAssetById('3b7dd687-dcf7-4ab2-840f-552d1c0e802e.csv'));

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
    console.log('fileId', s.fileId);
    console.log('chartSpecs', s.chartSpecs);
    getAsset();
  }, []);

  return s.chartSpecs && s.fileId ? (
    <Chart
      option={
        charts[s.chartSpecs.chartType as ChartType].generateOption({
          data,
          visualizationElements: s.chartSpecs.visualizationElements,
        }) as EChartsCoreOption
      }
    />
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
