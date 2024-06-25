// import React, { useEffect, useState } from 'react';
// import * as API from '../api/apis';
// import { QUERY_FIELDS } from '../data/constants';
// import Chart from '../echarts_plots/Chart';
// import { App } from '@sage3/applications/schema';

// function SageStats(props: App) {
//   const [data, setData] = useState<any>(null);
//   const [option, setOption] = useState<any>({});

//   // TEMPORARY
//   async function fetchData() {
//     const res = await API.getCombinedSageMesonetData({
//       sageNode: {
//         start: QUERY_FIELDS.TIME['24HR'].SAGE_NODE,
//         filter: {
//           name: QUERY_FIELDS.TEMPERATURE.SAGE_NODE,
//           sensor: 'bme680',
//           vsn: 'W097',
//         },
//       },
//       mesonet: {
//         metric: QUERY_FIELDS.TEMPERATURE.MESONET,
//         time: QUERY_FIELDS.TIME['24HR'].MESONET,
//       },
//     });
//     setData(res);
//   }

//   useEffect(() => {
//     fetchData();
//   }, []);

//   console.log('props', props);

//   useEffect(() => {
//     setOption({
//       title: {
//         text: 'Sage Node vs. Mesonet',
//       },
//       animation: false,
//       tooltip: {
//         trigger: 'axis',
//       },
//       toolbox: {
//         show: true,
//         feature: {
//           saveAsImage: {
//             show: true,
//             title: 'Save as Image',
//           },
//           dataZoom: {
//             yAxisIndex: false,
//           },
//         },
//       },
//       legend: {
//         data: ['Sage Node', 'Mesonet'],
//       },
//       xAxis: {
//         data: data ? [...data.map((d: { time: string; 'Sage Node': number; Mesonet: number }) => d.time.replace(', ', '\n'))] : [],
//         name: 'Time',
//       },
//       yAxis: {
//         name: QUERY_FIELDS.TEMPERATURE.NAME,
//         position: 'left',
//       },
//       grid: {
//         bottom: '25%',
//       },
//       renderer: 'svg',
//       series: [
//         {
//           name: 'Sage Node',
//           type: 'line',
//           data: data ? [...data.map((d: { time: string; 'Sage Node': number; Mesonet: number }) => d['Sage Node'])] : [],
//           large: true,
//         },
//         {
//           name: 'Mesonet',
//           type: 'line',
//           data: data ? [...data.map((d: { time: string; 'Sage Node': number; Mesonet: number }) => d['Mesonet'])] : [],
//           large: true,
//         },
//       ],
//       dataZoom: [
//         {
//           type: 'inside',
//         },
//         {
//           type: 'slider',
//         },
//       ],
//     });
//   }, [data]);

//   console.log('option', option);

//   return <>{data && <Chart option={option} />}</>;
// }

// export default SageStats;
