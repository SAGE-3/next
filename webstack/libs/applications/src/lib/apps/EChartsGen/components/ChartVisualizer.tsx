import React, { useCallback } from 'react';
import { useEffect, useState } from 'react';
import { Box } from '@chakra-ui/react';
import { App, AppState } from '../../../schema';
import Chart from '../charts/echarts/Chart';
import { charts, ChartType } from '../util/charts';
import Papa from 'papaparse';
import { apiUrls } from '@sage3/frontend';
import { EChartsCoreOption } from 'echarts';
import { pickChart } from '../util/pickChart';
import ThreeDimAreaChart from '../charts/ThreeDimAreaChart';
import CsvTable from '../charts/CsvTable';

type ChartVisualizerProps = {
  children: React.ReactNode;
};

function ChartVisualizer({ children }: ChartVisualizerProps) {
  return <>{children}</>;
}

function AppComponent(props: App) {
  const s = props.data.state;
  const [option, setOption] = useState<EChartsCoreOption | null>(null);
  const [isTable, setIsTable] = useState<boolean>(false);
  const [is3DChart, setIs3DChart] = useState<boolean>(false);
  const [data, setData] = useState<(string | number)[][] | null>(null);

  console.log('s from ChartVisualizer', s);
  const getAsset = useCallback(async () => {
    let chartData: (string | number)[][] = [];
    try {
      const assetRes = await fetch(apiUrls.assets.getAssetById(s.fileId));

      if (!assetRes.ok) {
        throw new Error('Failed to fetch asset');
      }

      const asset = await assetRes.text();

      // Parse the data
      Papa.parse(asset as string, {
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log('results from ChartVisualizer', results);
          // setData(results.data as (string | number)[][]);
          chartData = results.data as (string | number)[][];
        },
      });

      // If the chartData is empty, throw an error
      if (chartData.length === 0) throw new Error('No data available to plot.');

      // If it's a table show a table
      if (s.chartSpecs.chartType.toLowerCase() === 'table') {
        setData(chartData);
        setIsTable(true);
        return;
      }

      // If it's a 3D chart show it
      if (s.chartSpecs.chartType.toLowerCase() === '3d area chart') {
        setData(chartData);
        setIs3DChart(true);
        return;
      }

      if (s.chartSpecs.visualizationElements) {
        setOption(
          charts[s.chartSpecs.chartType as ChartType].generateOption({
            data: chartData,
            visualizationElements: s.chartSpecs.visualizationElements,
          }) as EChartsCoreOption
        );
      } else if (s.chartSpecs.attributes) {
        setOption(
          pickChart({
            chartType: s.chartSpecs.chartType as ChartType,
            data: chartData,
            attributes: s.chartSpecs.attributes,
          })
        );
      } else {
        throw new Error('Unable to generate chart. No visualization elements or attributes provided');
      }
    } catch (error) {
      console.error('error', error);
    }
  }, [s.chartSpecs, s.fileId]);

  useEffect(() => {
    console.log('rerendering');
    getAsset();
  }, [s]);

  console.log('check', s.chartSpecs, s.fileId, option);

  return s.chartSpecs && s.fileId ? (
    <Box width="full" height="full" overflow="auto">
      {option ? <Chart option={option} /> : ''}
      {isTable && data ? <CsvTable data={data} /> : ''}
      {is3DChart && data ? <ThreeDimAreaChart data={data} /> : ''}
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
