import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts';
import LoadingSpinner from './LoadingSpinner';
import { RAPIDState } from './ComponentSelector';

function LineGraph({ s }: RAPIDState) {
  return (
    <>
      {s.metricData ? (
        <div style={{ background: '#fff', width: '100%', height: '100%', padding: '30px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              width={500}
              height={300}
              data={s.metricData.data}
              margin={{
                top: 5,
                right: 30,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" tick={{ fontSize: 6 }}>
                <Label value="Time" offset={0} position="insideBottom" />
              </XAxis>
              <YAxis>
                <Label value={s.metric.NAME} angle={-90} position="insideLeft" offset={20} style={{textAnchor: "middle"}} />
              </YAxis>
              <Tooltip labelStyle={{ color: 'black' }} />
              <Legend verticalAlign="top" height={45} />
              <Line type="monotone" dataKey="Mesonet" stroke="#8884d8" connectNulls dot={false} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="Sage Node" dot={false} stroke="#82ca9d" connectNulls activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <LoadingSpinner />
      )}
    </>
  );
}

export default LineGraph;
