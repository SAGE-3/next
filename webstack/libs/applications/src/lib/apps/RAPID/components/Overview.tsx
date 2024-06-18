import React from 'react';
import { RAPIDState } from './ComponentSelector';
import LoadingSpinner from './LoadingSpinner';
import { ResultDataPoint } from '../worker/useWebWorker';
import { Stat, StatLabel, StatNumber } from '@chakra-ui/stat';
import { Box } from '@chakra-ui/react';
import { App } from '@sage3/applications/schema';

type OverviewProps = {
  children: React.ReactNode;
};

function Overview({ children }: OverviewProps) {
  return <>{children}</>;
}

function AppComponent(props: App) {
  const s = props.data.state;
  const getAverage = (arr: ResultDataPoint[], org: string) => {
    // console.log('arr', arr);
    if (org === 'Sage Node') {
      return (arr.reduce((prev, curr) => prev + curr['Sage Node'], 0) / arr.length).toFixed(2);
    }
    if (org === 'Mesonet') {
      return (arr.reduce((prev, curr) => (prev + curr['Mesonet']) as number, 0) / arr.length).toFixed(2);
    }
    return;
  };

  const getMin = (arr: ResultDataPoint[], org: string) => {
    if (org === 'Sage Node') {
      return Math.min(
        ...arr.filter((d: ResultDataPoint) => d['Sage Node'] !== null).map((d: ResultDataPoint) => Number(d['Sage Node']))
      ).toFixed(2);
    }
    if (org === 'Mesonet') {
      return Math.min(
        ...arr.filter((d: ResultDataPoint) => d['Mesonet'] !== null).map((d: ResultDataPoint) => Number(d['Mesonet']))
      ).toFixed(2);
    }
    return;
  };

  const getMax = (arr: ResultDataPoint[], org: string) => {
    if (org === 'Sage Node') {
      return Math.max(
        ...arr.filter((d: ResultDataPoint) => d['Sage Node'] !== null).map((d: ResultDataPoint) => Number(d['Sage Node']))
      ).toFixed(2);
    }
    if (org === 'Mesonet') {
      return Math.max(
        ...arr.filter((d: ResultDataPoint) => d['Mesonet'] !== null).map((d: ResultDataPoint) => Number(d['Mesonet']))
      ).toFixed(2);
    }
    return;
  };

  return (
    <>
      {s.metricData ? (
        <Box padding="5" display="flex" flexDir="column" height="100%">
          <Box mb="10">
            <h1>Average Measurements Over 7 days</h1>
          </Box>

          <Box>
            <Box textAlign="center">
              <h1>Sage Node</h1>
            </Box>
            <Box display="flex">
              <Stat>
                <StatLabel>Average {s.metric.NAME}</StatLabel>
                <StatNumber>{getAverage(s.metricData.data, 'Sage Node')}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Min {s.metric.NAME}</StatLabel>
                <StatNumber>{getMin(s.metricData.data, 'Sage Node')}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Max {s.metric.NAME}</StatLabel>
                <StatNumber>{getMax(s.metricData.data, 'Sage Node')}</StatNumber>
              </Stat>
            </Box>

            <Box textAlign="center">
              <h1>Mesonet</h1>
            </Box>
            <Box display="flex" justifyContent="center">
              <Stat>
                <StatLabel>Average {s.metric.NAME}</StatLabel>
                <StatNumber>{getAverage(s.metricData.data, 'Mesonet')}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Min {s.metric.NAME}</StatLabel>
                <StatNumber>{getMin(s.metricData.data, 'Mesonet')}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Max {s.metric.NAME}</StatLabel>
                <StatNumber>{getMax(s.metricData.data, 'Mesonet')}</StatNumber>
              </Stat>
            </Box>
          </Box>
        </Box>
      ) : (
        <LoadingSpinner />
      )}
    </>
  );
}

function ToolbarComponent(props: RAPIDState): JSX.Element {
  return <div> Toolbar </div>;
}

Overview.AppComponent = AppComponent;
Overview.ToolbarComponent = ToolbarComponent;

export default Overview;
