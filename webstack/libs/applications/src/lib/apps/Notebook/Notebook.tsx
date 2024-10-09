/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { useEffect, useState, useRef } from 'react';

import { Box } from '@chakra-ui/react';

import { IpynbRenderer, IpynbType } from "react-ipynb-renderer";

// Utility functions from SAGE3
import {
  useAssetStore,
  useAppStore,
  isUUIDv4,
  apiUrls,
  useHexColor,
} from '@sage3/frontend';

import { Asset } from '@sage3/shared/types';

import { App } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState } from './index';

// Jupyter theme
import "react-ipynb-renderer/dist/styles/default.css";

/* App component for Notebook */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  // Asset data structure
  const [file, setFile] = useState<Asset>();
  const assets = useAssetStore((state) => state.assets);
  const update = useAppStore((state) => state.update);
  const [ipynb, setIpynb] = useState<IpynbType>({ cells: [] });

  const backgroundColor = useHexColor('gray' + '.300');
  const scrollbarColor = useHexColor('gray' + '.400');
  // const theme = useColorModeValue('solarizedlight', 'xonokai');
  const theme = "solarizedlight";
  // const bgColor = useColorModeValue("242, 242, 242", "42,42,42");
  const bgColor = "242, 242, 242";
  const ref = useRef<HTMLDivElement>(null);

  // Convert the ID to an asset
  useEffect(() => {
    const isUUID = isUUIDv4(s.assetid);
    if (isUUID) {
      const myasset = assets.find((a) => a._id === s.assetid);
      if (myasset) {
        setFile(myasset);
        // Update the app title
        update(props._id, { title: myasset?.data.originalfilename });
      }
    }
  }, [s.assetid, assets]);

  async function getData(url: string): Promise<IpynbType> {
    if (url) {
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.status == 200) {
        const data = await response.json();
        return data as IpynbType;
      } else {
        return { cells: [] }
      }
    } else {
      return { cells: [] }
    }
  }

  // Once we have the asset, get the data
  useEffect(() => {
    if (file) {
      const url = apiUrls.assets.getAssetById(file.data.file);
      getData(url).then((data) => {
        setIpynb(data);
      });
    }
  }, [file]);

  return (
    <AppWindow app={props}>
      <Box bg={`rgb(${bgColor})`}
        overflowY="scroll"
        overflowX="hidden"
        height={"100%"}
        css={{
          scrollPaddingBlock: '1em',
          textWrap: 'pretty',
          '&::-webkit-scrollbar': {
            background: `${backgroundColor}`,
            width: '24px',
            height: '2px',
            scrollbarGutter: 'stable',
          },
          '&::-webkit-scrollbar-thumb': {
            background: `${scrollbarColor}`,
            borderRadius: '8px',
          },
        }}

      >
        <IpynbRenderer
          ipynb={ipynb}
          syntaxTheme={theme}
          language="python"
          bgTransparent={false}
          seqAsExecutionCount={true}
          ref={ref}
          onLoad={() => {
            console.log("loaded", ref.current);
          }}
        />
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app Notebook */
function ToolbarComponent() { return null; }

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = () => { return null; };

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
