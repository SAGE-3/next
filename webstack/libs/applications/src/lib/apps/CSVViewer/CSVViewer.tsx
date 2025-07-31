/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState, useEffect, useRef } from 'react';
import { MdFileDownload } from 'react-icons/md';
import { Button, ButtonGroup, Tooltip, useColorModeValue } from '@chakra-ui/react';
import { TableVirtuoso, VirtuosoHandle } from 'react-virtuoso';
import { parse } from 'csv-parse/browser/esm';

import { useAppStore, useAssetStore, apiUrls, downloadFile } from '@sage3/frontend';
import { Asset } from '@sage3/shared/types';

import { state as AppState } from './index';
import { App } from '../../schema';
import { AppWindow } from '../../components';

import { BsFiletypeCsv } from 'react-icons/bs';

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
  const table = useRef<VirtuosoHandle>(null);
  const theme = useColorModeValue('hoverTable', 'hoverTableDark');
  const bg = useColorModeValue('#F5F5F5', '#808080');

  // Get the asset from the state id value
  useEffect(() => {
    const myasset = assets.find((a) => a._id === s.assetid);
    if (myasset) {
      setFile(myasset);
      // Update the app title
      update(props._id, { title: myasset?.data.originalfilename });
    }
  }, [s.assetid, assets]);

  // Get the data from the asset
  useEffect(() => {
    if (file) {
      const localurl = apiUrls.assets.getAssetById(file.data.file);
      if (localurl) {
        fetch(localurl, {
          headers: {
            'Content-Type': 'text/csv',
            Accept: 'text/csv',
          },
        })
          .then(function (response) {
            return response.text();
          })
          .then(async function (text) {
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

  // const [visibleRange, setVisibleRange] = useState({ startIndex: 0, endIndex: 0 });
  // useEffect(() => {
  //   console.log('CSVViewer> getState', visibleRange);
  //   if (table.current) {
  //     table.current.getState((s) => {
  //       console.log('CSVViewer> getState', s)
  //     });
  //   }
  // }, [visibleRange, table]);

  return (
    <AppWindow app={props} hideBackgroundIcon={BsFiletypeCsv}>
      <TableVirtuoso
        className={theme}
        style={{
          height: '100%',
          width: '100%',
          borderCollapse: 'collapse',
          background: bg,
          textAlign: 'center',
        }}
        ref={table}
        data={data}
        totalCount={data.length}
        // Headers of the table
        fixedHeaderContent={() => {
          return (
            <>
              <tr style={{ background: bg, fontSize: '1.2em' }}>
                <th style={{ textAlign: 'center' }} colSpan={headers.length + 1}>
                  CSV &nbsp; - &nbsp; {file?.data.originalfilename}
                </th>
              </tr>
              <tr style={{ background: bg }}>
                <th style={{ textAlign: 'center', verticalAlign: 'bottom' }}>#</th>
                {headers.map((h) => (
                  <th key={h} style={{ width: tableWidth + '%', textAlign: 'center', verticalAlign: 'bottom' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </>
          );
        }}
        fixedFooterContent={() => {
          return (
            <tr style={{ background: bg }}>
              <th style={{ textAlign: 'center', paddingTop: "1em" }} colSpan={headers.length + 1}>
                Data: {data.length} rows - {headers.length} columns - {file?.data.size} bytes
              </th>
            </tr>
          );
        }}
        // rangeChanged={setVisibleRange}
        // Content of the table
        itemContent={(idx, val) => (
          <>
            <td style={{ border: '1px solid darkgray', textAlign: 'center' }}>{idx + 1}</td>
            {headers.map((h) => (
              <td key={h} style={{ width: tableWidth + '%', border: '1px solid darkgray' }}>
                {val[h]}
              </td>
            ))}
          </>
        )}
      />
    </AppWindow>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const assets = useAssetStore((state) => state.assets);
  const [file, setFile] = useState<Asset>();

  useEffect(() => {
    const asset = assets.find((a) => a._id === s.assetid);
    if (asset) {
      setFile(asset);
    }
  }, [s.assetid, assets]);

  return (
    <ButtonGroup isAttached size="xs" colorScheme="teal" mx={1}>
      <Tooltip placement="top" hasArrow={true} label={'Download CSV'} openDelay={400}>
        <Button
          onClick={() => {
            if (file) {
              const url = file?.data.file;
              const filename = file?.data.originalfilename;
              const dl = apiUrls.assets.getAssetById(url);
              downloadFile(dl, filename);
            }
          }}
          size='xs'
          px={0}
        >
          <MdFileDownload size="16px"/>
        </Button>
      </Tooltip>
    </ButtonGroup>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = () => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
// Convert the csv to an array using the csv-parse library
async function csvToArray(str: string): Promise<Record<string, string>[]> {
  // use the csv parser library to parse the csv
  return new Promise((resolve) => {
    parse(
      str,
      {
        relax_quotes: true,
        columns: true,
        skip_empty_lines: true,
        rtrim: true,
        trim: true,
      },
      function (err, records) {
        const data = records as Record<string, string>[];
        // return the array
        return resolve(data);
      }
    );
  });
}
