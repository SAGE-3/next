/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState, useEffect } from 'react';
import { Tooltip, ButtonGroup, Button } from '@chakra-ui/react';
import { MdFileDownload, MdFilePresent } from 'react-icons/md';

import { AssetCard } from './components/AssetCard';
import { useAssetStore, apiUrls, downloadFile, isUUIDv4 } from '@sage3/frontend';
import { Asset } from '@sage3/shared/types';

import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';


/* App component for AssetLink */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  return (
    <AppWindow app={props} disableResize={true} hideBackgroundIcon={MdFilePresent}>
      <AssetCard assetid={s.assetid} />
    </AppWindow>
  );
}

/* App toolbar component for the app BoardLink */
function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const [file, setFile] = useState<Asset>();

  // Convert the ID to an asset
  useEffect(() => {
    const isUUID = isUUIDv4(s.assetid);
    if (isUUID) {
      const myasset = useAssetStore.getState().assets.find((a) => a._id === s.assetid);
      setFile(myasset);
    }
  }, [s.assetid]);

  return (
    <ButtonGroup isAttached size="xs" colorScheme="teal">

      <Tooltip placement="top" hasArrow={true} label={'Download Asset'} openDelay={400}>
        <Button
          onClick={() => {
            if (file) {
              const url = file.data.file;
              const filename = file.data.originalfilename;
              const dl = apiUrls.assets.getAssetById(url);
              downloadFile(dl, filename);
            }
          }}
          size='xs'
          p={0}
        >
          <MdFileDownload fontSize="16px"/>
        </Button>
      </Tooltip>

    </ButtonGroup>
  );

}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = () => { return null; };

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
