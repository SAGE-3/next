import { useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { createWebWorker } from '../worker/webWorker';
import worker from '../worker/script';
import { useWebWorker } from '../worker/useWebWorker';
import LoadingSpinner from './LoadingSpinner';
import { Result } from '../worker/useWebWorker';
import { RAPIDState } from './ComponentSelector';

function LineGraph({ s }: RAPIDState) {
  // Web worker
  const workerInstance = useMemo(() => createWebWorker(worker), []);
  const { result, startProcessing } = useWebWorker(workerInstance);
  useEffect(() => {
    startProcessing({});
  }, [startProcessing]);

  console.log("s.counter from LineGraph", s);

  return (
    <>
    {/* {console.log(result)} */}
      {result ? (
        <div style={{ background: '#fff', width: '100%', height: '100%', padding: '30px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              width={500}
              height={300}
              data={(result as Result).data}
              margin={{
                top: 5,
                right: 30,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" tick={{fontSize: 6}}/>
              <YAxis />
              <Tooltip labelStyle={{ color: "black" }}/>
              <Legend />
              <Line type="monotone" dataKey="Mesonet" stroke="#8884d8" connectNulls dot={false} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="Sage Node" dot={false} stroke="#82ca9d" connectNulls activeDot={{ r: 5 }}/>
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
