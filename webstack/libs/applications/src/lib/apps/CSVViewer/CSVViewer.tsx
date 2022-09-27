/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import { useState, useEffect } from 'react';
import { useAppStore, useAssetStore } from '@sage3/frontend';
import { App } from "../../schema";

import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { Asset } from '@sage3/shared/types';

import { TableVirtuoso } from 'react-virtuoso'
import { parse } from 'csv-parse/browser/esm';

// Styling
import './styling.css';

function AppComponent(props: App): JSX.Element {
  // App state
  const s = props.data.state as AppState;
  // Update the app
  const update = useAppStore((state) => state.update);
  // Asset store
  const assets = useAssetStore((state) => state.assets);
  // Get the asset
  const [file, setFile] = useState<Asset>();
  // Get the data
  const [data, setData] = useState<Record<string, string>[]>([]);
  // Get the headers
  const [headers, setHeaders] = useState<string[]>([]);
  const [tableWidth, setTableWidth] = useState(1);

  // Get the asset from the state id value
  useEffect(() => {
    const myasset = assets.find((a) => a._id === s.assetid);
    if (myasset) {
      setFile(myasset);
      // Update the app title
      update(props._id, { description: myasset?.data.originalfilename });
    }
  }, [s.assetid, assets]);

  // Get the data from the asset
  useEffect(() => {
    if (file) {
      const localurl = '/api/assets/static/' + file.data.file;
      if (localurl) {
        fetch(localurl, {
          headers: {
            'Content-Type': 'text/csv',
            Accept: 'text/csv'
          },
        }).then(function (response) {
          return response.text();
        }).then(async function (text) {
          // Convert the csv to an array
          const arr = await csvToArray(text);
          // save the data
          setData(arr);
          // extract the headers and save them
          const headers = Object.keys(arr[0]);
          setHeaders(headers);
          setTableWidth(95 / headers.length);
        });
      }
    }
  }, [file]);

  return (
    <AppWindow app={props}>
      <>
        <TableVirtuoso
          style={{
            height: '100%', width: '100%',
            borderCollapse: 'collapse',
          }}
          data={data}
          totalCount={data.length}
          // Headers of the table
          fixedHeaderContent={() => {
            return <tr>
              <th style={{ width: '5%' }}>#</th>
              {headers.map((h) => <th key={h} style={{ width: tableWidth + '%' }}>{h}</th>)}
            </tr>
          }}
          // Content of the table
          itemContent={(idx, val) => (
            <>
              <td style={{ border: '1px solid darkgray', textAlign: "center" }}>{idx + 1}</td>
              {headers.map((h) => <td key={h} style={{ width: tableWidth + '%', border: '1px solid darkgray' }}>{val[h]}</td>)}
            </>
          )}
        />
      </>
    </AppWindow >
  );
}

function ToolbarComponent(props: App): JSX.Element {

  const s = props.data.state as AppState;

  return (
    <>
    </>
  )
}

export default { AppComponent, ToolbarComponent };

// Convert the csv to an array using the csv-parse library
async function csvToArray(str: string): Promise<Record<string, string>[]> {
  // use the csv parser library to parse the csv
  return new Promise(resolve => {
    parse(str, {
      relax_quotes: true,
      columns: true,
      skip_empty_lines: true,
      rtrim: true,
      trim: true,
      // delimiter: ",",
    }, function (err, records) {
      const data = records as Record<string, string>[];
      // return the array
      return resolve(data);
    });
  });
}
