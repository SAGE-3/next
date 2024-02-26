import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts';
import { useRef } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { RAPIDState } from './ComponentSelector';
import html2canvas from 'html2canvas';
import { Box, Button } from '@chakra-ui/react';

function LineGraph({ s }: RAPIDState) {
  const chartRef = useRef(null);
  console.log(chartRef);

  const handleDownload = async () => {
    const chartContainer = chartRef.current!;
    const canvas = await html2canvas(chartContainer);
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'chart.png';
    link.click();
  };

  return (
    <>
      {s.metricData ? (
        <div style={{ background: '#fff', width: '100%', height: '100%', padding: '30px' }}>
          <Box ref={chartRef} height="90%">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={s.metricData.data}
                margin={{
                  top: 5,
                  right: 30,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" tick={{ fontSize: 6 }} interval={s.metricData.length / 7}>
                  <Label value="Time" offset={0} position="insideBottom" />
                </XAxis>
                <YAxis>
                  <Label value={s.metric.NAME} angle={-90} position="insideLeft" offset={10} style={{ textAnchor: 'middle' }} />
                </YAxis>
                <Tooltip labelStyle={{ color: 'black' }} />
                <Legend verticalAlign="top" height={45} />
                <Line type="monotone" dataKey="Mesonet" stroke="#8884d8" connectNulls dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Sage Node" dot={false} stroke="#82ca9d" connectNulls activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
          <Button onClick={handleDownload} bg="darkgray">
            Download Chart
          </Button>
        </div>
      ) : (
        <LoadingSpinner />
      )}
    </>
  );
}

export default LineGraph;
