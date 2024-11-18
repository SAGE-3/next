const baseUrl = `https://api.hcdp.ikewai.org/mesonet`;
const headers = new Headers();
headers.append('Content-Type', 'application/json');
headers.append('Authorization', 'Bearer 71c5efcd8cfe303f2795e51f01d19c6');

export const getStations = async () => {
  const response = await fetch(`${baseUrl}/getStations`, {
    method: 'GET',
    headers: headers,
  });
  return response.json();
};

export const getMeasurements = async (stationIds: string[], var_id: string, limit: number) => {
  const response = await fetch(
    `${baseUrl}/getMeasurements?stationid=${String(stationIds)}&var_ids=${var_id}&limit=${limit}&join_metadata=true`,
    {
      method: 'GET',
      headers: headers,
    }
  );
  // let url = '';
  //   const headers = new Headers();
  //   headers.append('Content-Type', 'application/json');
  //   headers.append('Authorization', 'Bearer 71c5efcd8cfe303f2795e51f01d19c6');
  //   // bearer authorization token = 71c5efcd8cfe303f2795e51f01d19c6
  //   url = `https://api.hcdp.ikewai.org/mesonet/db/measurements?location=hawaii&station_ids=${String(s.stationNames)}&var_ids=${
  //     s.widget.yAxisNames[0]
  //   }&limit=${Number(resolveTimePeriod(s.widget.timePeriod)) * s.stationNames.length}&join_metadata=true`;

  // console.log(response);
  return response.json();
};

export const getDBMeasurements = async (stationIds: string[], var_id: string, limit: number) => {
  const response = await fetch(
    `${baseUrl}/db/measurements?station_ids=${String(stationIds)}&var_ids=${var_id}&limit=${limit}&join_metadata=true`,
    {
      method: 'GET',
      headers: headers,
    }
  );
  return response.json();
};

export const getSingleMeasurement = async (stationIds: string[], var_id: string) => {
  const response = await fetch(
    `${baseUrl}/db/measurements?stationid=${String(stationIds)}&var_ids=${var_id}&limit=${stationIds.length}&join_metadata=true`,
    {
      method: 'GET',
      headers: headers,
    }
  );
  return response.json();
};
