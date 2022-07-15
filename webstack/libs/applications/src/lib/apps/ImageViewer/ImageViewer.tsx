/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */
import { useEffect, useState } from 'react';
import { Image, Button, ButtonGroup, Tooltip } from '@chakra-ui/react';
// Icons
import { MdFileDownload } from 'react-icons/md';
// Utility functions from SAGE3
import { downloadFile } from '@sage3/frontend';

import { AppWindow } from '../../components';

import { App } from '../../schema';
import { Asset, ExtraImageType } from '@sage3/shared/types';
import { useAssetStore, useAppStore } from '@sage3/frontend';

import { state as AppState } from './index';

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  const assets = useAssetStore((state) => state.assets);
  const update = useAppStore((state) => state.update);
  const [file, setFile] = useState<Asset>();
  const [url, setUrl] = useState('');

  useEffect(() => {
    const myasset = assets.find((a) => a._id === s.id);
    if (myasset) {
      setFile(myasset);
      // Update the app title
      update(props._id, { description: 'Image> ' + myasset?.data.originalfilename });
    }
  }, [s.id, assets]);

  useEffect(() => {
    if (file) {
      const extra = file.data.derived as ExtraImageType;
      if (extra) {
        // find the smallest image for this page (multi-resolution)
        const res = extra.sizes.reduce(function (p, v) {
          return p.width < v.width ? p : v;
        });
        setUrl(res.url);
      }
    }
  }, [file]);

  return (
    <AppWindow app={props}>
      <Image alt={file?.data.originalfilename} src={url} width="100%" draggable={false} />
    </AppWindow>
  );
}

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const assets = useAssetStore((state) => state.assets);
  const [file, setFile] = useState<Asset>();

  useEffect(() => {
    const myasset = assets.find((a) => a._id === s.id);
    if (myasset) {
      setFile(myasset);
    }
  }, [s.id, assets]);

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal">
        <Tooltip placement="bottom" hasArrow={true} label={'Download Image'} openDelay={400}>
          <Button
            onClick={() => {
              if (file) {
                const url = file?.data.file;
                const filename = file?.data.originalfilename;
                downloadFile('api/assets/static/' + url, filename);
              }
            }}
          >
            <MdFileDownload />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </>
  );
}

export default { AppComponent, ToolbarComponent };
