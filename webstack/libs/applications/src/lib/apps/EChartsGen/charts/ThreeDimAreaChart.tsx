import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';

interface ThreeDimAreaChartProps {
  data: (string | number)[][];
}

const ThreeDimAreaChart: React.FC<ThreeDimAreaChartProps> = ({ data }) => {
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const currentChartRef = chartRef.current;
    console.log('rerendering 3d area chart');

    if (currentChartRef && data.length > 1) {
      // Extract header and data
      const [header, ...dataPoints] = data;
      const [xLabel, yLabel, zLabel] = header as string[];

      // Process the input data
      const xValues = dataPoints.map((point) => point[0] as number);
      const yValues = dataPoints.map((point) => point[1] as number);
      const zValues = dataPoints.map((point) => point[2] as number);

      const plotlyData: any = [
        {
          x: xValues,
          y: yValues,
          z: zValues,
          type: 'mesh3d',
          intensity: zValues,
          colorscale: 'Viridis',
        },
      ];

      const layout: Partial<Plotly.Layout> = {
        // title: "3D Area Chart (Without Interpolation)",
        scene: {
          xaxis: { title: xLabel },
          yaxis: { title: yLabel },
          zaxis: { title: zLabel },
          camera: {
            eye: { x: 1.5, y: 1.5, z: 1.5 },
          },
        },
      };

      const config: Partial<Plotly.Config> = { responsive: true };

      Plotly.newPlot(currentChartRef, plotlyData, layout, config);
    }

    // Cleanup function
    return () => {
      if (currentChartRef) {
        Plotly.purge(currentChartRef);
      }
    };
  }, [data]);

  return <div ref={chartRef} style={{ width: '100%', height: '100%' }} />;
};

export default ThreeDimAreaChart;
