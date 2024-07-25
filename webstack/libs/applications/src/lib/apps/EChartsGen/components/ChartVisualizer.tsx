import React from 'react';
import { useEffect, useState } from 'react';
import { Box } from '@chakra-ui/react';
import { App, AppState } from '../../../schema';
import Chart from '../echarts/Chart';
import { charts, ChartType } from '../util/charts';
import Papa from 'papaparse';
import { apiUrls } from '@sage3/frontend';
import { EChartsCoreOption } from 'echarts';
import * as articulate from '../api/articulate-llm';
import { pickChart } from '../util/pickChart';

type ChartVisualizerProps = {
  children: React.ReactNode;
};

function ChartVisualizer({ children }: ChartVisualizerProps) {
  return <>{children}</>;
}

function AppComponent(props: App) {
  const s = props.data.state;
  const [option, setOption] = useState<EChartsCoreOption | null>(null);

  console.log('s from ChartVisualizer', s);
  async function getAsset() {
    let chartData: (string | number)[][] = [];
    if (s.model === 'articulate-llm') {
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

        if (s.chartSpecs.visualizationElements) {
          console.log(
            'option visaualizationElements>',
            charts[s.chartSpecs.chartType as ChartType].generateOption({
              data: chartData,
              visualizationElements: s.chartSpecs.visualizationElements,
            }) as EChartsCoreOption
          );

          setOption(
            charts[s.chartSpecs.chartType as ChartType].generateOption({
              data: chartData,
              visualizationElements: s.chartSpecs.visualizationElements,
            }) as EChartsCoreOption
          );
        } else if (s.chartSpecs.attributes) {
          console.log(
            'option attributes>',
            pickChart({
              chartType: s.chartSpecs.chartType as ChartType,
              data: chartData,
              attributes: s.chartSpecs.attributes,
            })
          );
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
      return {};
    } else {
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
            // setData(results.data as (string | number)[][]);
            chartData = results.data as (string | number)[][];
          },
        });

        // If the chartData is empty, throw an error
        if (chartData.length === 0) throw new Error('No data available to plot.');

        if (s.chartSpecs.visualizationElements) {
          console.log(
            'option visaualizationElements>',
            charts[s.chartSpecs.chartType as ChartType].generateOption({
              data: chartData,
              visualizationElements: s.chartSpecs.visualizationElements,
            }) as EChartsCoreOption
          );

          return charts[s.chartSpecs.chartType as ChartType].generateOption({
            data: chartData,
            visualizationElements: s.chartSpecs.visualizationElements,
          }) as EChartsCoreOption;
        } else if (s.chartSpecs.attributes) {
          console.log(
            'option attributes>',
            pickChart({
              chartType: s.chartSpecs.chartType as ChartType,
              data: chartData,
              attributes: s.chartSpecs.attributes,
            })
          );
          return pickChart({
            chartType: s.chartSpecs.chartType as ChartType,
            data: chartData,
            attributes: s.chartSpecs.attributes,
          });
        } else {
          throw new Error('Unable to generate chart. No visualization elements or attributes provided');
        }
      } catch (error) {
        console.error('error', error);
      }
      return {};
    }
  }

  useEffect(() => {
    console.log('rerendering');
    getAsset();
  }, [s]);

  console.log('check', s.chartSpecs, s.fileId, option);

  return s.chartSpecs && s.fileId && option ? (
    <Box width="full" height="full" overflow="auto">
      <Box height="80%">
        <Chart option={option} />
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
