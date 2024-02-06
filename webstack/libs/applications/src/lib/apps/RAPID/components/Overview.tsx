import React from 'react';
import { RAPIDState } from './ComponentSelector';
import LoadingSpinner from './LoadingSpinner';
import { ResultDataPoint } from '../worker/useWebWorker';

function Overview({ s }: RAPIDState): JSX.Element {
  const getAverage = (arr: ResultDataPoint[], org: string) => {
    // console.log('arr', arr);
    if (org === 'Sage Node') {
      return (arr.reduce((prev, curr) => prev + curr['Sage Node'], 0) / arr.length).toFixed(2);
    }
    if (org === 'Mesonet') {
      return (arr.reduce((prev, curr) => (prev + curr['Mesonet']) as number, 0) / arr.length).toFixed(2);
    }
    return 999;
  };
  console.log("metric data from overview", s.metricData);
  return (
    <>
      {s.metricData ? (
        <div>
          <h1>Overview</h1>
          <div>Counter: {s.counter}</div>
          <div> Average Measurements Over 24 Hours</div>
          <div>SAGE: {getAverage(s.metricData.data, 'Sage Node')} </div>
          <div>Mesonet: {getAverage(s.metricData.data, 'Mesonet')} </div>
        </div>
      ) : (
        <LoadingSpinner />
      )}
    </>
  );
}

export default Overview;
