import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
              <XAxis dataKey="x" tick={{ fontSize: 6 }} />
              <YAxis />
              <Tooltip labelStyle={{ color: 'black' }} />
              <Legend />
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
