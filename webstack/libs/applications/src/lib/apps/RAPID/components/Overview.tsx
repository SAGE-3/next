import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import { Stat, StatLabel, StatNumber } from '@chakra-ui/stat';
import { Box } from '@chakra-ui/react';
import { AppState } from '../../../types';

type ResultDataPoint = {
  'Sage Node': number | null;
  Mesonet: number | null;
};

function Overview({ s }: AppState): JSX.Element {
  const getAverage = (arr: ResultDataPoint[], org: string) => {
    // console.log('arr', arr);
    if (org === 'Sage Node') {
      return (arr.reduce((prev, curr) => (prev + (curr['Sage Node'] ?? 0)) as number, 0) / arr.length).toFixed(2);
    }
    if (org === 'Mesonet') {
      return (arr.reduce((prev, curr) => (prev + (curr['Mesonet'] ?? 0)) as number, 0) / arr.length).toFixed(2);
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
        <Box padding="3" display="flex" flexDir="column" height="100%" bg="#f8f8f8" color="#323232" gap={5}>
          <Box fontWeight="bold">
            <h1>Average Measurements</h1>
          </Box>
          <Box border="1px" borderRadius="10" borderColor="lightgray" padding="3" bg="white" boxShadow="2px 2px 15px lightgray">
            <Box textAlign="center" paddingBottom="3" fontSize="2xl" fontWeight="bold">
              Sage Node
            </Box>
            <Box display="flex" textAlign="center">
              <Stat>
                <StatLabel fontWeight="bold">Average {s.metric.NAME}</StatLabel>
                <StatNumber>{getAverage(s.metricData.data, 'Sage Node')}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel fontWeight="bold">Min {s.metric.NAME}</StatLabel>
                <StatNumber>{getMin(s.metricData.data, 'Sage Node')}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel fontWeight="bold">Max {s.metric.NAME}</StatLabel>
                <StatNumber>{getMax(s.metricData.data, 'Sage Node')}</StatNumber>
              </Stat>
            </Box>
          </Box>

          <Box
            textAlign="center"
            border="1px"
            borderRadius="10"
            borderColor="lightgray"
            padding="3"
            bg="white"
            boxShadow="2px 2px 15px lightgray"
          >
            <Box textAlign="center" paddingBottom="3" fontSize="2xl" fontWeight="bold">
              Mesonet
            </Box>
            <Box display="flex" justifyContent="center">
              <Stat>
                <StatLabel fontWeight="bold">Average {s.metric.NAME}</StatLabel>
                <StatNumber>{getAverage(s.metricData.data, 'Mesonet')}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel fontWeight="bold">Min {s.metric.NAME}</StatLabel>
                <StatNumber>{getMin(s.metricData.data, 'Mesonet')}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel fontWeight="bold">Max {s.metric.NAME}</StatLabel>
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

export default Overview;
